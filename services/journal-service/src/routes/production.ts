import { Router } from "express";
import { z } from "zod";
import { one, query, tx } from "../config/db.js";
import { HttpError, conflict, idParam, notFound, ok, parse, uuid } from "../lib/http.js";
import { MANAGERS, requireRole } from "../middleware/auth.js";
import { addEvent, generateDoi, moveStatus } from "../lib/workflow.js";
import { MS_LIST_SQL, loadAuthors, loadEvents, loadFiles, loadManuscript } from "../lib/manuscripts.js";
import { removeQuietly, sha256, upload, verifyMagic } from "../lib/files.js";
import { notifyUser } from "../lib/notify.js";

const r = Router();
r.use(requireRole(...MANAGERS));

// ---------------------------------------------------------------- production queue (UC-JMS-08)
const PROD_SQL = `
  SELECT m.id, m.manuscript_no, m.title, m.status, m.decision_at, m.author_names, m.article_type, m.journal_title,
         p.version AS proof_version, p.status AS proof_status, p.response_due,
         f.status AS fee_status, f.amount AS fee_amount, f.currency AS fee_currency,
         CASE WHEN p.id IS NULL THEN 'AWAITING_PROOF'
              WHEN p.status = 'SENT' THEN 'PROOF_SENT'
              WHEN p.status = 'CORRECTIONS' THEN 'COMMENT_RECEIVED'
              ELSE 'PROOF_ACCEPTED' END AS production_status
  FROM (${MS_LIST_SQL}) m
  LEFT JOIN LATERAL (SELECT * FROM jms.proofs x WHERE x.manuscript_id = m.id ORDER BY version DESC LIMIT 1) p ON true
  LEFT JOIN LATERAL (SELECT * FROM jms.fees x WHERE x.manuscript_id = m.id ORDER BY created_at DESC LIMIT 1) f ON true
  WHERE m.status IN ('ACCEPTED','IN_PRODUCTION')`;

r.get("/manuscripts", async (req, res) => {
  const ps = typeof req.query.production_status === "string" && req.query.production_status !== "ALL" ? req.query.production_status : null;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : null;
  const rows = await query(
    `SELECT * FROM (${PROD_SQL}) q WHERE ($1::text IS NULL OR production_status = $1)
       AND ($2::text IS NULL OR title ILIKE '%'||$2||'%' OR manuscript_no ILIKE '%'||$2||'%') ORDER BY decision_at`,
    [ps, search || null]);
  const counts = await query(`SELECT production_status, count(*)::int AS n FROM (${PROD_SQL}) q GROUP BY production_status`);
  res.json({ success: true, data: rows, counts: Object.fromEntries(counts.map((c: any) => [c.production_status, c.n])) });
});

r.get("/manuscripts/:id", async (req, res) => {
  const id = idParam(req);
  const m = await one(`SELECT * FROM (${PROD_SQL}) q WHERE id = $1`, [id]);
  if (!m) {
    const any = await one(`SELECT status FROM jms.manuscripts WHERE id=$1`, [id]);
    if (!any) throw notFound("Manuscript");
    throw conflict(`This manuscript is ${any.status} and is not in production.`);
  }
  const full = await loadManuscript(id);
  res.json(ok({
    ...full, ...m,
    authors: await loadAuthors(id),
    files: await loadFiles(id),
    timeline: await loadEvents(id),
    proofs: await query(`SELECT id, version, message, internal_notes, response_due, status, author_comments, sent_at, responded_at, file_id
                         FROM jms.proofs WHERE manuscript_id=$1 ORDER BY version DESC`, [id]),
    fee: await one(`SELECT * FROM jms.fees WHERE manuscript_id=$1 ORDER BY created_at DESC LIMIT 1`, [id]),
  }));
});

r.post("/manuscripts/:id/proofs", upload.single("file"), async (req, res) => {
  const id = idParam(req);
  const file = req.file;
  try {
    const b = parse(z.object({
      message: z.string().trim().min(5, "Write a message to the author.").max(5000),
      response_due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a response due date."),
      internal_notes: z.string().trim().max(5000).optional().default(""),
    }), req.body);
    const ms = await one(`SELECT id, status, title, manuscript_no, submitted_by FROM jms.manuscripts WHERE id=$1`, [id]);
    if (!ms) throw notFound("Manuscript");
    if (!["ACCEPTED", "IN_PRODUCTION"].includes(ms.status)) throw conflict(`A ${ms.status} manuscript cannot receive a proof.`);
    const last = await one(`SELECT status FROM jms.proofs WHERE manuscript_id=$1 ORDER BY version DESC LIMIT 1`, [id]);
    if (last?.status === "SENT") throw conflict("The author has not answered the previous proof yet.");
    if (last?.status === "ACCEPTED") throw conflict("The author already approved the proof. You can publish.");
    if (file) {
      if (!/\.pdf$/i.test(file.originalname)) throw new HttpError(422, "The proof must be a PDF.");
      verifyMagic(file.path, file.originalname);
    }
    const proof = await tx(async (c) => {
      let fileId: string | null = null;
      if (file) {
        const f = await c.query(
          `INSERT INTO jms.manuscript_files (manuscript_id, round, kind, original_name, stored_name, mime_type, size_bytes, sha256, uploaded_by)
           VALUES ($1,(SELECT current_round FROM jms.manuscripts WHERE id=$1),'PROOF',$2,$3,$4,$5,$6,$7) RETURNING id`,
          [id, file.originalname, file.filename, file.mimetype, file.size, sha256(file.path), req.auth!.userId]);
        fileId = f.rows[0].id;
      }
      const v = (await c.query(`SELECT COALESCE(max(version),0)+1 AS v FROM jms.proofs WHERE manuscript_id=$1`, [id])).rows[0].v;
      const p = await c.query(
        `INSERT INTO jms.proofs (manuscript_id, version, file_id, message, internal_notes, response_due, sent_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version`,
        [id, v, fileId, b.message, b.internal_notes || null, b.response_due, req.auth!.userId]);
      if (ms.status === "ACCEPTED") await moveStatus(c, id, "IN_PRODUCTION", req.auth!.userId, "PROOF_SENT", `Proof v${v} sent to the author.`);
      else await addEvent(c, id, req.auth!.userId, "PROOF_SENT", null, null, `Proof v${v} sent to the author.`);
      return p.rows[0];
    });
    await notifyUser(ms.submitted_by, `Proof ready: ${ms.manuscript_no}`,
      `The proof of "${ms.title}" is ready for your review. Please respond by ${b.response_due}.\n\n${b.message}`, "/author/pending-proof");
    res.status(201).json(ok(proof, "Proof sent to the author."));
  } catch (e) {
    removeQuietly(file?.path);
    throw e;
  }
});

// ---------------------------------------------------------------- fees (UC-JMS-07)
r.get("/fees", async (req, res) => {
  const status = typeof req.query.status === "string" && req.query.status !== "ALL" ? req.query.status : null;
  res.json(ok(await query(
    `SELECT f.id, f.fee_type, f.amount, f.currency, f.status, f.due_date, f.paid_at, f.invoice_no, f.payment_reference, f.waiver_reason,
            m.id AS manuscript_id, m.manuscript_no, m.title,
            (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = m.submitted_by) AS author
     FROM jms.fees f JOIN jms.manuscripts m ON m.id = f.manuscript_id
     WHERE ($1::text IS NULL OR f.status = $1) ORDER BY f.created_at DESC`, [status])));
});

r.patch("/fees/:id", async (req, res) => {
  const b = parse(z.object({ action: z.enum(["CONFIRM_PAYMENT", "WAIVE", "REJECT_WAIVER", "REJECT_PAYMENT"]) }), req.body);
  const f = await one(`SELECT f.id, f.status, m.submitted_by, m.manuscript_no FROM jms.fees f JOIN jms.manuscripts m ON m.id=f.manuscript_id WHERE f.id=$1`, [idParam(req)]);
  if (!f) throw notFound("Fee");
  const allowed: Record<string, [string[], string]> = {
    CONFIRM_PAYMENT: [["VERIFYING", "PENDING"], "PAID"],
    REJECT_PAYMENT: [["VERIFYING"], "PENDING"],
    WAIVE: [["WAIVER_REQUESTED", "PENDING"], "WAIVED"],
    REJECT_WAIVER: [["WAIVER_REQUESTED"], "PENDING"],
  };
  const [from, to] = allowed[b.action];
  if (!from.includes(f.status)) throw conflict(`A ${f.status} fee cannot be updated this way.`);
  await query(`UPDATE jms.fees SET status=$2::varchar, paid_at = CASE WHEN $2::text='PAID' THEN now() ELSE paid_at END WHERE id=$1`, [f.id, to]);
  await notifyUser(f.submitted_by, `Publication fee update: ${f.manuscript_no}`, `Your publication fee is now ${to}.`, "/author/fees");
  res.json(ok(null, `Fee marked ${to}.`));
});

// ---------------------------------------------------------------- publish (UC-JMS-10, FR-JM-005/007)
r.post("/manuscripts/:id/publish", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({
    issue_id: uuid,
    article_number: z.string().trim().max(20).optional().nullable(),
    pages: z.string().trim().max(30).optional().nullable(),
    license: z.string().trim().max(60).optional().default("CC BY 4.0"),
  }), req.body);
  const ms = await loadManuscript(id);
  if (!["ACCEPTED", "IN_PRODUCTION"].includes(ms.status)) throw conflict(`A ${ms.status} manuscript cannot be published.`);
  const proof = await one(`SELECT status FROM jms.proofs WHERE manuscript_id=$1 ORDER BY version DESC LIMIT 1`, [id]);
  if (proof?.status !== "ACCEPTED") throw conflict("The author must approve the final proof before publication.");
  const fee = await one(`SELECT status FROM jms.fees WHERE manuscript_id=$1 ORDER BY created_at DESC LIMIT 1`, [id]);
  if (fee && !["PAID", "WAIVED", "CANCELLED"].includes(fee.status)) throw conflict(`The publication fee is ${fee.status}. Confirm payment or waive it first.`);
  const issue = await one(`SELECT i.*, j.code, j.issn FROM jms.issues i JOIN jms.journals j ON j.id=i.journal_id WHERE i.id=$1`, [b.issue_id]);
  if (!issue) throw new HttpError(422, "Choose a valid issue.");
  if (issue.journal_id !== ms.journal_id) throw new HttpError(422, "That issue belongs to a different journal.");
  const out = await tx(async (c) => {
    const year = new Date().getFullYear();
    const doi = await generateDoi(c, { id: issue.journal_id, code: issue.code }, year, issue.volume, issue.issue_number);
    const art = await c.query(
      `INSERT INTO jms.articles (manuscript_id, journal_id, issue_id, article_number, pages, doi, issn, license, published_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, doi`,
      [id, issue.journal_id, issue.id, b.article_number ?? null, b.pages ?? null, doi, issue.issn, b.license, req.auth!.userId]);
    await moveStatus(c, id, "PUBLISHED", req.auth!.userId, "PUBLISHED", `Published with DOI ${doi}.`);
    return art.rows[0];
  });
  await notifyUser(ms.submitted_by, `Your article is published: ${ms.manuscript_no}`,
    `"${ms.title}" is now published.\nDOI: ${out.doi}`, "/author/submissions");
  res.status(201).json(ok(out, `Published. DOI ${out.doi}`));
});

// ---------------------------------------------------------------- published archive
const PUB_SQL = `
  SELECT a.id, a.doi, a.status, a.pages, a.article_number, a.license, a.published_at, a.correction_note,
         m.manuscript_no, m.title, i.id AS issue_id, i.volume, i.issue_number, i.status AS issue_status, j.title AS journal_title, j.issn,
         (SELECT string_agg(x.full_name, ', ' ORDER BY x.position) FROM jms.manuscript_authors x WHERE x.manuscript_id = m.id) AS author_names
  FROM jms.articles a JOIN jms.manuscripts m ON m.id=a.manuscript_id
  JOIN jms.issues i ON i.id=a.issue_id JOIN jms.journals j ON j.id=a.journal_id`;

r.get("/published", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : null;
  const status = typeof req.query.status === "string" && req.query.status !== "ALL" ? req.query.status : null;
  res.json(ok(await query(
    `${PUB_SQL} WHERE ($1::text IS NULL OR m.title ILIKE '%'||$1||'%' OR a.doi ILIKE '%'||$1||'%' OR m.manuscript_no ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR a.status = $2) ORDER BY a.published_at DESC`, [search || null, status])));
});

r.get("/published/:id", async (req, res) => {
  const a = await one(`${PUB_SQL} WHERE a.id=$1`, [idParam(req)]);
  if (!a) throw notFound("Article");
  const m = await one(`SELECT m.id, m.abstract, m.keywords FROM jms.articles a JOIN jms.manuscripts m ON m.id=a.manuscript_id WHERE a.id=$1`, [a.id]);
  res.json(ok({ ...a, ...m, authors: await loadAuthors(m!.id) }));
});

r.patch("/published/:id", async (req, res) => {
  const b = parse(z.object({
    status: z.enum(["PUBLISHED", "INDEXED", "CORRECTION"]).optional(),
    correction_note: z.string().trim().max(3000).optional().nullable(),
    pages: z.string().trim().max(30).optional().nullable(),
    article_number: z.string().trim().max(20).optional().nullable(),
  }), req.body);
  const a = await one(`SELECT id FROM jms.articles WHERE id=$1`, [idParam(req)]);
  if (!a) throw notFound("Article");
  await query(
    `UPDATE jms.articles SET status=COALESCE($2,status), correction_note=COALESCE($3,correction_note),
            pages=COALESCE($4,pages), article_number=COALESCE($5,article_number) WHERE id=$1`,
    [a.id, b.status ?? null, b.correction_note ?? null, b.pages ?? null, b.article_number ?? null]);
  res.json(ok(null, "Article updated."));
});

// ---------------------------------------------------------------- issues
const issueSchema = z.object({
  journal_id: uuid.optional(),
  volume: z.coerce.number().int().min(1).max(999),
  issue_number: z.coerce.number().int().min(1).max(999),
  title: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("").transform(() => null)),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).optional().default("DRAFT"),
});

const ISSUE_SQL = `
  SELECT i.*, j.title AS journal_title, j.issn,
         (SELECT count(*)::int FROM jms.articles a WHERE a.issue_id=i.id) AS article_count
  FROM jms.issues i JOIN jms.journals j ON j.id=i.journal_id`;

r.get("/issues", async (_req, res) => res.json(ok(await query(`${ISSUE_SQL} ORDER BY i.volume DESC, i.issue_number DESC`))));

r.get("/issues/:id", async (req, res) => {
  const i = await one(`${ISSUE_SQL} WHERE i.id=$1`, [idParam(req)]);
  if (!i) throw notFound("Issue");
  res.json(ok({ ...i, articles: await query(`${PUB_SQL} WHERE a.issue_id=$1 ORDER BY a.article_number NULLS LAST, a.published_at`, [i.id]) }));
});

r.post("/issues", async (req, res) => {
  const b = parse(issueSchema, req.body);
  const j = b.journal_id ? await one(`SELECT id FROM jms.journals WHERE id=$1`, [b.journal_id])
                         : await one(`SELECT id FROM jms.journals WHERE is_active ORDER BY created_at LIMIT 1`);
  if (!j) throw new HttpError(422, "Journal not found.");
  const dup = await one(`SELECT 1 AS x FROM jms.issues WHERE journal_id=$1 AND volume=$2 AND issue_number=$3`, [j.id, b.volume, b.issue_number]);
  if (dup) throw conflict(`Volume ${b.volume}, Issue ${b.issue_number} already exists.`);
  const row = await one(
    `INSERT INTO jms.issues (journal_id, volume, issue_number, title, description, publication_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [j.id, b.volume, b.issue_number, b.title ?? null, b.description ?? null, b.publication_date ?? null, b.status]);
  res.status(201).json(ok(row, "Issue created."));
});

r.put("/issues/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(issueSchema, req.body);
  const cur = await one(`SELECT journal_id FROM jms.issues WHERE id=$1`, [id]);
  if (!cur) throw notFound("Issue");
  const dup = await one(`SELECT 1 AS x FROM jms.issues WHERE journal_id=$1 AND volume=$2 AND issue_number=$3 AND id<>$4`, [cur.journal_id, b.volume, b.issue_number, id]);
  if (dup) throw conflict(`Volume ${b.volume}, Issue ${b.issue_number} already exists.`);
  await query(
    `UPDATE jms.issues SET volume=$2, issue_number=$3, title=$4, description=$5, publication_date=$6, status=$7 WHERE id=$1`,
    [id, b.volume, b.issue_number, b.title ?? null, b.description ?? null, b.publication_date ?? null, b.status]);
  res.json(ok(null, "Issue updated."));
});

r.delete("/issues/:id", async (req, res) => {
  const id = idParam(req);
  const n = (await one(`SELECT count(*)::int AS n FROM jms.articles WHERE issue_id=$1`, [id]))!.n;
  if (n > 0) throw conflict("This issue contains published articles and cannot be deleted.");
  await query(`DELETE FROM jms.issues WHERE id=$1`, [id]);
  res.json(ok(null, "Issue deleted."));
});

// ---------------------------------------------------------------- dashboard & reports
r.get("/dashboard", async (_req, res) => {
  const q = await one(
    `SELECT count(*) FILTER (WHERE m.status='ACCEPTED')::int AS awaiting_proof,
            count(*) FILTER (WHERE m.status='IN_PRODUCTION')::int AS in_production,
            count(*) FILTER (WHERE m.status='PUBLISHED')::int AS published
     FROM jms.manuscripts m`);
  const ready = (await one(`SELECT count(*)::int AS n FROM (${PROD_SQL}) q WHERE production_status='PROOF_ACCEPTED' AND (fee_status IS NULL OR fee_status IN ('PAID','WAIVED','CANCELLED'))`))!.n;
  const comments = (await one(`SELECT count(*)::int AS n FROM (${PROD_SQL}) q WHERE production_status='COMMENT_RECEIVED'`))!.n;
  const fees = await one(
    `SELECT count(*) FILTER (WHERE status IN ('PENDING','VERIFYING','WAIVER_REQUESTED'))::int AS open_fees,
            COALESCE(sum(amount) FILTER (WHERE status='PAID'),0) AS collected FROM jms.fees`);
  const issues = await one(`SELECT count(*) FILTER (WHERE status='PUBLISHED')::int AS published, count(*) FILTER (WHERE status IN ('DRAFT','SCHEDULED'))::int AS upcoming FROM jms.issues`);
  res.json(ok({ ...q, ready_to_publish: ready, comments_received: comments, ...fees, issues }));
});

r.get("/reports", async (_req, res) => {
  res.json(ok({
    published_by_month: await query(`SELECT to_char(date_trunc('month', published_at),'YYYY-MM') AS month, count(*)::int AS articles FROM jms.articles GROUP BY 1 ORDER BY 1 DESC LIMIT 12`),
    articles_per_issue: await query(`SELECT 'Vol. '||i.volume||' · Issue '||i.issue_number AS issue, count(a.id)::int AS articles FROM jms.issues i LEFT JOIN jms.articles a ON a.issue_id=i.id GROUP BY i.id ORDER BY i.volume DESC, i.issue_number DESC LIMIT 12`),
    fees: await query(`SELECT status, count(*)::int AS n, COALESCE(sum(amount),0) AS total FROM jms.fees GROUP BY status`),
    avg_days_accept_to_publish: (await one(
      `SELECT round(avg(EXTRACT(EPOCH FROM (a.published_at - m.decision_at))/86400)::numeric,1) AS d
       FROM jms.articles a JOIN jms.manuscripts m ON m.id=a.manuscript_id WHERE m.decision_at IS NOT NULL`))?.d ?? null,
  }));
});

export default r;
