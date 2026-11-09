import { Router } from "express";
import fs from "node:fs";
import { z } from "zod";
import { one, query, tx } from "../config/db.js";
import { HttpError, idParam, listQuery, notFound, ok, paged, parse, uuid, conflict } from "../lib/http.js";
import { requireRole } from "../middleware/auth.js";
import { removeQuietly, sha256, upload, verifyMagic } from "../lib/files.js";
import { addEvent, moveStatus, nextManuscriptNo } from "../lib/workflow.js";
import { AUTHOR_EVENTS, MS_LIST_SQL, loadAuthors, loadEvents, loadFiles, loadManuscript } from "../lib/manuscripts.js";
import { notifyUser } from "../lib/notify.js";
import { NAME } from "../lib/people.js";

const r = Router();
r.use(requireRole("AUTHOR"));

const authorSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  affiliation: z.string().trim().max(255).optional().nullable(),
  orcid: z.string().trim().regex(/^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9Xx]$/, "ORCID must look like 0000-0002-1825-0097").optional().nullable().or(z.literal("").transform(() => null)),
  is_corresponding: z.boolean().optional(),
});

const draftSchema = z.object({
  journal_id: uuid.optional(),
  title: z.string().trim().min(5, "Title is required").max(500),
  abstract: z.string().trim().max(4000).optional().default(""),
  keywords: z.union([z.array(z.string().trim().min(1).max(60)), z.string()]).optional().default([])
    .transform((v) => (Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean))),
  category_id: uuid.optional().nullable(),
  article_type_id: uuid.optional().nullable(),
  cover_letter: z.string().max(5000).optional().nullable(),
  data_availability: z.enum(["ON_REQUEST", "OPEN_ACCESS", "RESTRICTED"]).optional().default("ON_REQUEST"),
  declarations: z.record(z.string(), z.boolean()).optional().default({}),
  authors: z.array(authorSchema).max(50).optional().default([]),
});

async function ownDraft(req: any, id: string, statuses = ["DRAFT"]) {
  const m = await one(`SELECT id, status, submitted_by FROM jms.manuscripts WHERE id = $1`, [id]);
  if (!m || m.submitted_by !== req.auth.userId) throw notFound("Manuscript");
  if (!statuses.includes(m.status)) throw conflict(`This manuscript is ${m.status} and can no longer be edited.`);
  return m;
}

async function ownManuscript(req: any, id: string) {
  const m = await one(`SELECT id, status, submitted_by, current_round, journal_id FROM jms.manuscripts WHERE id = $1`, [id]);
  if (!m || m.submitted_by !== req.auth.userId) throw notFound("Manuscript");
  return m;
}

async function saveAuthors(c: any, manuscriptId: string, userId: string, authors: z.infer<typeof authorSchema>[]) {
  await c.query(`DELETE FROM jms.manuscript_authors WHERE manuscript_id = $1`, [manuscriptId]);
  let i = 1;
  let list = authors;
  if (!list.some((a) => a.is_corresponding)) {
    const me = (await c.query(`SELECT first_name || ' ' || last_name AS name, email FROM iam.users WHERE id = $1`, [userId])).rows[0];
    list = [{ full_name: me.name, email: me.email, is_corresponding: true }, ...list];
  }
  for (const a of list) {
    await c.query(
      `INSERT INTO jms.manuscript_authors (manuscript_id, position, user_id, full_name, email, affiliation, orcid, is_corresponding)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [manuscriptId, i++, a.is_corresponding ? userId : null, a.full_name, a.email, a.affiliation ?? null, a.orcid ?? null, !!a.is_corresponding]
    );
  }
}

// ---------------------------------------------------------------- manuscripts
r.get("/manuscripts", async (req, res) => {
  const q = parse(listQuery, req.query);
  const where = [`m.submitted_by = $1`, `($2::text IS NULL OR m.status = $2)`,
                 `($3::text IS NULL OR m.title ILIKE '%'||$3||'%' OR m.manuscript_no ILIKE '%'||$3||'%')`];
  const params = [req.auth!.userId, q.status && q.status !== "ALL" ? q.status : null, q.search ?? null];
  const total = (await one(`SELECT count(*) AS n FROM jms.manuscripts m WHERE ${where.join(" AND ")}`, params))!.n;
  const rows = await query(
    `SELECT l.*, m2.abstract, m2.keywords, m2.cover_letter, m2.data_availability,
            COALESCE((SELECT json_agg(json_build_object('id', f.id, 'kind', f.kind, 'round', f.round,
                        'original_name', f.original_name, 'size_bytes', f.size_bytes) ORDER BY f.round, f.created_at)
                      FROM jms.manuscript_files f WHERE f.manuscript_id = l.id), '[]'::json) AS files,
            COALESCE((SELECT json_agg(json_build_object('full_name', a.full_name, 'email', a.email,
                        'affiliation', a.affiliation, 'orcid', a.orcid, 'is_corresponding', a.is_corresponding) ORDER BY a.position)
                      FROM jms.manuscript_authors a WHERE a.manuscript_id = l.id), '[]'::json) AS authors
     FROM (${MS_LIST_SQL} WHERE ${where.join(" AND ")} ORDER BY m.updated_at DESC LIMIT $4 OFFSET $5) l
     JOIN jms.manuscripts m2 ON m2.id = l.id
     ORDER BY l.updated_at DESC`,
    [...params, q.limit, (q.page - 1) * q.limit]
  );
  res.json(paged(rows, total, q.page, q.limit));
});

r.post("/manuscripts", async (req, res) => {
  const b = parse(draftSchema, req.body);
  const journal = b.journal_id
    ? await one(`SELECT id FROM jms.journals WHERE id = $1 AND is_active`, [b.journal_id])
    : await one(`SELECT id FROM jms.journals WHERE is_active ORDER BY created_at LIMIT 1`);
  if (!journal) throw new HttpError(422, "No active journal is available.");
  const id = await tx(async (c) => {
    const ins = await c.query(
      `INSERT INTO jms.manuscripts (journal_id, submitted_by, title, abstract, keywords, category_id, article_type_id,
                                    cover_letter, data_availability, declarations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [journal.id, req.auth!.userId, b.title, b.abstract, b.keywords, b.category_id ?? null, b.article_type_id ?? null,
       b.cover_letter ?? null, b.data_availability, b.declarations]
    );
    await saveAuthors(c, ins.rows[0].id, req.auth!.userId, b.authors);
    await addEvent(c, ins.rows[0].id, req.auth!.userId, "DRAFT_CREATED", null, "DRAFT");
    return ins.rows[0].id as string;
  });
  res.status(201).json(ok(await loadManuscript(id), "Draft saved."));
});

r.put("/manuscripts/:id", async (req, res) => {
  const id = idParam(req);
  await ownDraft(req, id);
  const b = parse(draftSchema, req.body);
  await tx(async (c) => {
    await c.query(
      `UPDATE jms.manuscripts SET title=$2, abstract=$3, keywords=$4, category_id=$5, article_type_id=$6,
              cover_letter=$7, data_availability=$8, declarations=$9 WHERE id=$1`,
      [id, b.title, b.abstract, b.keywords, b.category_id ?? null, b.article_type_id ?? null,
       b.cover_letter ?? null, b.data_availability, b.declarations]
    );
    await saveAuthors(c, id, req.auth!.userId, b.authors);
  });
  res.json(ok(await loadManuscript(id), "Draft saved."));
});

r.delete("/manuscripts/:id", async (req, res) => {
  const id = idParam(req);
  await ownDraft(req, id);
  const files = await query(`SELECT stored_name FROM jms.manuscript_files WHERE manuscript_id = $1`, [id]);
  await query(`DELETE FROM jms.manuscripts WHERE id = $1`, [id]);
  const { UPLOAD_DIR } = await import("../lib/files.js");
  files.forEach((f: any) => removeQuietly(`${UPLOAD_DIR}/${f.stored_name}`));
  res.json(ok(null, "Draft deleted."));
});

r.get("/manuscripts/:id", async (req, res) => {
  const id = idParam(req);
  await ownManuscript(req, id);
  const m = await loadManuscript(id);
  // Reviews are shown to the author only after the editor's decision, and anonymised.
  const reviews = await query(
    `SELECT ra.round, ra.recommendation, ra.comments_to_author, ra.submitted_at
     FROM jms.review_assignments ra
     JOIN jms.decisions d ON d.manuscript_id = ra.manuscript_id AND d.round = ra.round
     WHERE ra.manuscript_id = $1 AND ra.status = 'COMPLETED' ORDER BY ra.round, ra.submitted_at`, [id]);
  const counters = new Map<number, number>();
  const anon = reviews.map((x: any) => {
    const n = (counters.get(x.round) ?? 0) + 1;
    counters.set(x.round, n);
    return { ...x, reviewer: `Reviewer ${n}` };
  });
  res.json(ok({
    ...m,
    authors: await loadAuthors(id),
    files: await loadFiles(id, ["MANUSCRIPT", "SUPPLEMENTARY", "REVISION", "RESPONSE_LETTER"]),
    timeline: await loadEvents(id, AUTHOR_EVENTS),
    decisions: await query(`SELECT round, decision, letter, created_at FROM jms.decisions WHERE manuscript_id = $1 ORDER BY round`, [id]),
    reviews: anon,
    fee: await one(`SELECT id, fee_type, amount, currency, status, due_date, paid_at, invoice_no FROM jms.fees WHERE manuscript_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]),
    article: await one(`SELECT id, doi FROM jms.articles WHERE manuscript_id = $1`, [id]),
  }));
});

// ---------------------------------------------------------------- files
r.post("/manuscripts/:id/files", upload.array("files", 10), async (req, res) => {
  const id = idParam(req);
  const files = (req.files as Express.Multer.File[]) ?? [];
  try {
    await ownDraft(req, id);
    const kind = parse(z.enum(["MANUSCRIPT", "SUPPLEMENTARY"]), req.body.kind ?? "MANUSCRIPT");
    if (!files.length) throw new HttpError(422, "Choose at least one file.");
    if (kind === "MANUSCRIPT" && files.length > 1) throw new HttpError(422, "Upload one main manuscript file.");
    if (kind === "MANUSCRIPT" && !/\.(pdf|docx?)$/i.test(files[0].originalname))
      throw new HttpError(422, "The manuscript must be a PDF or Word document.");
    files.forEach((f) => verifyMagic(f.path, f.originalname));
    const saved = await tx(async (c) => {
      if (kind === "MANUSCRIPT") {
        const old = await c.query(`DELETE FROM jms.manuscript_files WHERE manuscript_id=$1 AND kind='MANUSCRIPT' AND round=1 RETURNING stored_name`, [id]);
        const { UPLOAD_DIR } = await import("../lib/files.js");
        old.rows.forEach((o: any) => removeQuietly(`${UPLOAD_DIR}/${o.stored_name}`));
      }
      const out = [];
      for (const f of files) {
        const ins = await c.query(
          `INSERT INTO jms.manuscript_files (manuscript_id, round, kind, original_name, stored_name, mime_type, size_bytes, sha256, uploaded_by)
           VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, kind, original_name, size_bytes, created_at`,
          [id, kind, f.originalname, f.filename, f.mimetype, f.size, sha256(f.path), req.auth!.userId]);
        out.push(ins.rows[0]);
      }
      return out;
    });
    res.status(201).json(ok(saved, "File uploaded."));
  } catch (e) {
    files.forEach((f) => removeQuietly(f.path));
    throw e;
  }
});

r.delete("/manuscripts/:id/files/:fileId", async (req, res) => {
  const id = idParam(req);
  await ownDraft(req, id);
  const f = await one(`DELETE FROM jms.manuscript_files WHERE id=$1 AND manuscript_id=$2 RETURNING stored_name`, [idParam(req, "fileId"), id]);
  if (!f) throw notFound("File");
  const { UPLOAD_DIR } = await import("../lib/files.js");
  removeQuietly(`${UPLOAD_DIR}/${f.stored_name}`);
  res.json(ok(null, "File removed."));
});

// ---------------------------------------------------------------- submit (UC-JMS-01)
r.post("/manuscripts/:id/submit", async (req, res) => {
  const id = idParam(req);
  await ownDraft(req, id);
  const m = await loadManuscript(id);
  const problems: string[] = [];
  if (!m.abstract || m.abstract.trim().split(/\s+/).length < 20) problems.push("Abstract (at least 20 words) is required.");
  if (m.abstract && m.abstract.trim().split(/\s+/).length > 300) problems.push("Abstract must not exceed 300 words.");
  if (!m.keywords?.length) problems.push("At least one keyword is required.");
  if (!m.category_id) problems.push("Choose a category / subject area.");
  if (!m.article_type_id) problems.push("Choose an article type.");
  const main = await one(`SELECT 1 AS x FROM jms.manuscript_files WHERE manuscript_id=$1 AND kind='MANUSCRIPT'`, [id]);
  if (!main) problems.push("Upload the manuscript file (PDF or DOCX).");
  const d = m.declarations ?? {};
  for (const k of ["original_work", "authors_approved", "ethics", "no_conflict"]) {
    if (d[k] !== true) problems.push(`Declaration "${k.replace(/_/g, " ")}" must be confirmed.`);
  }
  if (problems.length) throw new HttpError(422, "The manuscript is not ready to submit.", problems.map((p) => ({ field: "submission", message: p })));
  const no = await tx(async (c) => {
    const n = await nextManuscriptNo(c);
    await c.query(`UPDATE jms.manuscripts SET manuscript_no=$2, submitted_at=now() WHERE id=$1`, [id, n]);
    await moveStatus(c, id, "SUBMITTED", req.auth!.userId, "SUBMITTED", "Manuscript submitted.");
    return n;
  });
  await notifyUser(req.auth!.userId, `Manuscript ${no} received`, `Your manuscript "${m.title}" was submitted successfully as ${no}.`, `/author/submissions`);
  res.json(ok(await loadManuscript(id), `Manuscript submitted as ${no}.`));
});

// ---------------------------------------------------------------- revision (UC-JMS-03)
r.post("/manuscripts/:id/revise", upload.array("files", 5), async (req, res) => {
  const id = idParam(req);
  const files = (req.files as Express.Multer.File[]) ?? [];
  try {
    const m = await ownManuscript(req, id);
    if (m.status !== "REVISION_REQUIRED") throw conflict("This manuscript is not waiting for a revision.");
    const response = parse(z.string().trim().min(10, "Describe how you addressed the reviewers' comments."), req.body.response_to_reviewers);
    if (!files.length) throw new HttpError(422, "Upload the revised manuscript.");
    files.forEach((f) => verifyMagic(f.path, f.originalname));
    const round = m.current_round + 1;
    await tx(async (c) => {
      for (const [i, f] of files.entries()) {
        await c.query(
          `INSERT INTO jms.manuscript_files (manuscript_id, round, kind, original_name, stored_name, mime_type, size_bytes, sha256, uploaded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, round, i === 0 ? "REVISION" : "RESPONSE_LETTER", f.originalname, f.filename, f.mimetype, f.size, sha256(f.path), req.auth!.userId]);
      }
      await c.query(`INSERT INTO jms.revision_submissions (manuscript_id, round, submitted_by, response_to_reviewers) VALUES ($1,$2,$3,$4)`,
        [id, round, req.auth!.userId, response]);
      await c.query(`UPDATE jms.manuscripts SET current_round = $2, decision = NULL WHERE id = $1`, [id, round]);
      await moveStatus(c, id, "REVISED", req.auth!.userId, "REVISION_SUBMITTED", `Revision (round ${round}) submitted.`);
    });
    res.json(ok(await loadManuscript(id), "Revision submitted."));
  } catch (e) {
    files.forEach((f) => removeQuietly(f.path));
    throw e;
  }
});

// ---------------------------------------------------------------- fees (UC-JMS-07)
const FEE_SQL = `
  SELECT f.id, f.fee_type, f.amount, f.currency, f.status, f.due_date, f.paid_at, f.invoice_no, f.payment_reference,
         m.id AS manuscript_id, m.manuscript_no, m.title, j.title AS journal_title
  FROM jms.fees f JOIN jms.manuscripts m ON m.id = f.manuscript_id JOIN jms.journals j ON j.id = m.journal_id
  WHERE m.submitted_by = $1`;

r.get("/fees", async (req, res) => {
  res.json(ok(await query(`${FEE_SQL} ORDER BY f.created_at DESC`, [req.auth!.userId])));
});

async function ownFee(req: any, id: string) {
  const f = await one(`${FEE_SQL} AND f.id = $2`, [req.auth.userId, id]);
  if (!f) throw notFound("Fee");
  return f;
}

// No payment gateway is wired in yet: the author reports the payment reference
// and the Journal Manager verifies it (status VERIFYING -> PAID).
r.post("/fees/:id/pay", async (req, res) => {
  const f = await ownFee(req, idParam(req));
  if (!["PENDING", "VERIFYING"].includes(f.status)) throw conflict(`This fee is already ${f.status}.`);
  const b = parse(z.object({ payment_reference: z.string().trim().min(3).max(120) }), req.body);
  await query(`UPDATE jms.fees SET status='VERIFYING', payment_reference=$2 WHERE id=$1`, [f.id, b.payment_reference]);
  res.json(ok(null, "Payment reference submitted. The journal office will verify it."));
});

r.post("/fees/:id/waiver", async (req, res) => {
  const f = await ownFee(req, idParam(req));
  if (f.status !== "PENDING") throw conflict(`A waiver cannot be requested for a ${f.status} fee.`);
  const b = parse(z.object({ reason: z.string().trim().min(10).max(2000) }), req.body);
  await query(`UPDATE jms.fees SET status='WAIVER_REQUESTED', waiver_reason=$2 WHERE id=$1`, [f.id, b.reason]);
  res.json(ok(null, "Waiver request sent."));
});

// ---------------------------------------------------------------- proofs (UC-JMS-09)
const PROOF_SQL = `
  SELECT p.id, p.version, p.message, p.response_due, p.status, p.author_comments, p.sent_at, p.responded_at, p.file_id,
         m.id AS manuscript_id, m.manuscript_no, m.title, j.title AS journal_title
  FROM jms.proofs p JOIN jms.manuscripts m ON m.id = p.manuscript_id JOIN jms.journals j ON j.id = m.journal_id
  WHERE m.submitted_by = $1`;

r.get("/proofs", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : null;
  res.json(ok(await query(`${PROOF_SQL} AND ($2::text IS NULL OR p.status = $2) ORDER BY p.sent_at DESC`, [req.auth!.userId, status])));
});

r.get("/proofs/:id", async (req, res) => {
  const p = await one(`${PROOF_SQL} AND p.id = $2`, [req.auth!.userId, idParam(req)]);
  if (!p) throw notFound("Proof");
  const m = await one(`SELECT abstract, keywords FROM jms.manuscripts WHERE id=$1`, [p.manuscript_id]);
  res.json(ok({ ...p, ...m, authors: await loadAuthors(p.manuscript_id) }));
});

r.post("/proofs/:id/respond", async (req, res) => {
  const p = await one(`${PROOF_SQL} AND p.id = $2`, [req.auth!.userId, idParam(req)]);
  if (!p) throw notFound("Proof");
  if (p.status !== "SENT") throw conflict("You have already responded to this proof.");
  const b = parse(z.object({
    action: z.enum(["ACCEPT", "CORRECTIONS"]),
    comments: z.string().trim().max(5000).optional().default(""),
  }).refine((v) => v.action === "ACCEPT" || v.comments.length >= 5, { message: "List the corrections you need.", path: ["comments"] }), req.body);
  const status = b.action === "ACCEPT" ? "ACCEPTED" : "CORRECTIONS";
  await tx(async (c) => {
    await c.query(`UPDATE jms.proofs SET status=$2, author_comments=$3, responded_at=now() WHERE id=$1`, [p.id, status, b.comments || null]);
    await addEvent(c, p.manuscript_id, req.auth!.userId, "PROOF_RESPONSE", null, null,
      status === "ACCEPTED" ? `Author approved proof v${p.version}.` : `Author requested corrections on proof v${p.version}.`);
  });
  res.json(ok(null, status === "ACCEPTED" ? "Proof approved. Thank you." : "Corrections sent to the journal office."));
});

// ---------------------------------------------------------------- dashboard
r.get("/dashboard", async (req, res) => {
  const uid = req.auth!.userId;
  const counts = await query(`SELECT status, count(*)::int AS n FROM jms.manuscripts WHERE submitted_by = $1 GROUP BY status`, [uid]);
  const by = Object.fromEntries(counts.map((c: any) => [c.status, c.n]));
  const total = counts.reduce((s: number, c: any) => s + c.n, 0);
  const recent = await query(`${MS_LIST_SQL} WHERE m.submitted_by = $1 ORDER BY m.updated_at DESC LIMIT 5`, [uid]);
  const pendingProofs = (await one(`SELECT count(*)::int AS n FROM jms.proofs p JOIN jms.manuscripts m ON m.id=p.manuscript_id WHERE m.submitted_by=$1 AND p.status='SENT'`, [uid]))!.n;
  const pendingFees = (await one(`SELECT count(*)::int AS n FROM jms.fees f JOIN jms.manuscripts m ON m.id=f.manuscript_id WHERE m.submitted_by=$1 AND f.status IN ('PENDING','VERIFYING')`, [uid]))!.n;
  const needsRevision = by.REVISION_REQUIRED ?? 0;
  res.json(ok({
    total, by_status: by,
    under_review: (by.UNDER_REVIEW ?? 0) + (by.UNDER_SCREENING ?? 0) + (by.SUBMITTED ?? 0) + (by.REVISED ?? 0),
    accepted: (by.ACCEPTED ?? 0) + (by.IN_PRODUCTION ?? 0), published: by.PUBLISHED ?? 0,
    pending_proofs: pendingProofs, pending_fees: pendingFees, needs_revision: needsRevision, recent,
  }));
});

export default r;
void fs; void NAME;
