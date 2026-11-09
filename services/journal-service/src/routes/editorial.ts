import { Router } from "express";
import { z } from "zod";
import { one, query, tx } from "../config/db.js";
import { HttpError, conflict, idParam, listQuery, notFound, ok, paged, parse, uuid } from "../lib/http.js";
import { EDITORS, hasRole, requireRole } from "../middleware/auth.js";
import { addEvent, moveStatus } from "../lib/workflow.js";
import { MS_LIST_SQL, loadAuthors, loadEvents, loadFiles, loadManuscript } from "../lib/manuscripts.js";
import { notifyUser } from "../lib/notify.js";

const r = Router();
r.use(requireRole(...EDITORS));

const REC = z.enum(["ACCEPT", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"]);

/** Per-manuscript review counters used by the list pages. */
const STATS_SQL = `
  SELECT m.id AS manuscript_id,
    count(*) FILTER (WHERE ra.status NOT IN ('CANCELLED','DECLINED'))::int AS assigned,
    count(*) FILTER (WHERE ra.status = 'COMPLETED')::int AS completed,
    count(*) FILTER (WHERE ra.status IN ('INVITED','ACCEPTED'))::int AS outstanding,
    count(*) FILTER (WHERE ra.recommendation = 'ACCEPT')::int AS rec_accept,
    count(*) FILTER (WHERE ra.recommendation = 'MINOR_REVISION')::int AS rec_minor,
    count(*) FILTER (WHERE ra.recommendation = 'MAJOR_REVISION')::int AS rec_major,
    count(*) FILTER (WHERE ra.recommendation = 'REJECT')::int AS rec_reject
  FROM jms.manuscripts m
  LEFT JOIN jms.review_assignments ra ON ra.manuscript_id = m.id AND ra.round = m.current_round
  GROUP BY m.id`;

r.get("/manuscripts", async (req, res) => {
  const q = parse(listQuery.extend({ stage: z.enum(["screening", "review", "decision", "all"]).default("all") }), req.query);
  const stageStatuses: Record<string, string[] | null> = {
    screening: ["SUBMITTED", "UNDER_SCREENING", "REVISED", "DESK_REJECTED", "UNDER_REVIEW"],
    review: ["UNDER_REVIEW"], decision: ["UNDER_REVIEW"], all: null,
  };
  const statuses = stageStatuses[q.stage];
  const params: unknown[] = [statuses, q.status && q.status !== "ALL" ? q.status : null, q.search ?? null];
  let extra = "";
  if (q.stage === "decision") extra = " AND s.completed >= 1 AND s.outstanding = 0";
  const base = `FROM (${MS_LIST_SQL}) m JOIN (${STATS_SQL}) s ON s.manuscript_id = m.id
      WHERE m.status <> 'DRAFT' AND ($1::text[] IS NULL OR m.status = ANY($1)) AND ($2::text IS NULL OR m.status = $2)
        AND ($3::text IS NULL OR m.title ILIKE '%'||$3||'%' OR m.manuscript_no ILIKE '%'||$3||'%' OR m.author_names ILIKE '%'||$3||'%')${extra}`;
  const total = (await one(`SELECT count(*)::int AS n ${base}`, params))!.n;
  const rows = await query(
    `SELECT m.*, s.assigned, s.completed, s.outstanding, s.rec_accept, s.rec_minor, s.rec_major, s.rec_reject,
            (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = m.associate_editor_id) AS associate_editor
     ${base} ORDER BY m.submitted_at DESC NULLS LAST LIMIT $4 OFFSET $5`,
    [...params, q.limit, (q.page - 1) * q.limit]
  );
  res.json(paged(rows, total, q.page, q.limit));
});

r.get("/manuscripts/:id", async (req, res) => {
  const id = idParam(req);
  const m = await loadManuscript(id);
  if (m.status === "DRAFT") throw notFound("Manuscript");
  const reviews = await query(
    `SELECT ra.id, ra.round, ra.reviewer_id, ra.status, ra.invited_at, ra.responded_at, ra.due_date, ra.decline_reason,
            ra.recommendation, ra.score, ra.comments_to_author, ra.confidential_comments, ra.checklist, ra.submitted_at,
            (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = ra.reviewer_id) AS reviewer_name,
            (SELECT email FROM iam.users WHERE id = ra.reviewer_id) AS reviewer_email
     FROM jms.review_assignments ra WHERE ra.manuscript_id = $1 ORDER BY ra.round, ra.invited_at`, [id]);
  res.json(ok({
    ...m,
    authors: await loadAuthors(id),
    files: await loadFiles(id),
    timeline: await loadEvents(id),
    reviews,
    screenings: await query(`SELECT s.*, (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = s.screened_by) AS screened_by_name FROM jms.screenings s WHERE manuscript_id = $1 ORDER BY created_at`, [id]),
    recommendations: await query(`SELECT e.*, (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = e.editor_id) AS editor_name FROM jms.editor_recommendations e WHERE manuscript_id = $1 ORDER BY round`, [id]),
    decisions: await query(`SELECT d.*, (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = d.decided_by) AS decided_by_name FROM jms.decisions d WHERE manuscript_id = $1 ORDER BY round`, [id]),
    revisions: await query(`SELECT round, response_to_reviewers, created_at FROM jms.revision_submissions WHERE manuscript_id = $1 ORDER BY round`, [id]),
  }));
});

// ---------------------------------------------------------------- editors
async function usersWithRole(codes: string[]) {
  return query(
    `SELECT DISTINCT u.id, u.first_name || ' ' || u.last_name AS name, u.email, array_agg(DISTINCT r.code) AS roles
     FROM iam.users u
     JOIN iam.user_module_assignments a ON a.user_id = u.id AND a.status = 'ACTIVE'
     JOIN iam.modules mo ON mo.id = a.module_id AND mo.code = 'JMS'
     JOIN iam.user_module_roles umr ON umr.module_assignment_id = a.id
     JOIN iam.roles r ON r.id = umr.role_id AND r.code = ANY($1)
     WHERE u.status = 'ACTIVE' AND u.deleted_at IS NULL
     GROUP BY u.id ORDER BY name`, [codes]);
}

r.get("/editors", async (_req, res) => res.json(ok(await usersWithRole(["EIC", "ASSOCIATE_EDITOR"]))));

r.post("/manuscripts/:id/claim", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({ editor_id: uuid.optional() }), req.body ?? {});
  const editorId = b.editor_id ?? req.auth!.userId;
  if (b.editor_id && b.editor_id !== req.auth!.userId && !hasRole(req.auth!, "EIC", "JOURNAL_MANAGER", "MODULE_ADMIN"))
    throw new HttpError(403, "Only the Editor-in-Chief can assign another editor.");
  await tx(async (c) => {
    const m = (await c.query(`SELECT status FROM jms.manuscripts WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!m) throw notFound("Manuscript");
    if (!["SUBMITTED", "REVISED", "UNDER_SCREENING"].includes(m.status)) throw conflict(`A ${m.status} manuscript cannot be claimed for screening.`);
    await c.query(`UPDATE jms.manuscripts SET associate_editor_id=$2 WHERE id=$1`, [id, editorId]);
    if (m.status === "UNDER_SCREENING") await addEvent(c, id, req.auth!.userId, "EDITOR_ASSIGNED", null, null, "Handling editor changed.");
    else await moveStatus(c, id, "UNDER_SCREENING", req.auth!.userId, "SCREENING_STARTED", "Screening started.");
  });
  res.json(ok(await loadManuscript(id), "Manuscript assigned for screening."));
});

// ---------------------------------------------------------------- screening (UC-JMS-02)
const screenSchema = z.object({
  outcome: z.enum(["SEND_TO_REVIEW", "DESK_REJECT", "RETURN_TO_AUTHOR"]),
  scope_ok: z.boolean().optional(),
  format_ok: z.boolean().optional(),
  ethics_ok: z.boolean().optional(),
  similarity_pct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(5000).optional().default(""),
}).refine((v) => v.outcome === "SEND_TO_REVIEW" || v.notes.length >= 5, { message: "Explain the reason.", path: ["notes"] });

r.post("/manuscripts/:id/screen", async (req, res) => {
  const id = idParam(req);
  const b = parse(screenSchema, req.body);
  const target = { SEND_TO_REVIEW: "UNDER_REVIEW", DESK_REJECT: "DESK_REJECTED", RETURN_TO_AUTHOR: "DRAFT" }[b.outcome];
  const evt = { SEND_TO_REVIEW: "SENT_TO_REVIEW", DESK_REJECT: "DESK_REJECTED", RETURN_TO_AUTHOR: "RETURNED_TO_AUTHOR" }[b.outcome];
  const { title, author } = await tx(async (c) => {
    const m = (await c.query(`SELECT status, current_round, title, submitted_by, associate_editor_id FROM jms.manuscripts WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!m) throw notFound("Manuscript");
    if (!["SUBMITTED", "UNDER_SCREENING", "REVISED"].includes(m.status)) throw conflict(`A ${m.status} manuscript cannot be screened.`);
    await c.query(
      `INSERT INTO jms.screenings (manuscript_id, round, screened_by, scope_ok, format_ok, ethics_ok, similarity_pct, outcome, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, m.current_round, req.auth!.userId, b.scope_ok ?? null, b.format_ok ?? null, b.ethics_ok ?? null, b.similarity_pct ?? null, b.outcome, b.notes || null]);
    if (!m.associate_editor_id) await c.query(`UPDATE jms.manuscripts SET associate_editor_id=$2 WHERE id=$1`, [id, req.auth!.userId]);
    if (m.status === "SUBMITTED" || m.status === "REVISED") {
      // go through UNDER_SCREENING so the timeline stays consistent
      await moveStatus(c, id, "UNDER_SCREENING", req.auth!.userId, "SCREENING_STARTED", null);
    }
    await moveStatus(c, id, target, req.auth!.userId, evt, b.notes || null);
    return { title: m.title as string, author: m.submitted_by as string };
  });
  if (b.outcome !== "SEND_TO_REVIEW")
    await notifyUser(author, `Update on "${title}"`, b.outcome === "DESK_REJECT"
      ? `After initial screening the editors cannot send your manuscript for peer review.\n\n${b.notes}`
      : `The editors returned your manuscript for changes before review.\n\n${b.notes}`, "/author/submissions");
  res.json(ok(await loadManuscript(id), "Screening recorded."));
});

// ---------------------------------------------------------------- reviewers (UC-JMS-02)
r.get("/reviewers", async (req, res) => {
  const manuscriptId = typeof req.query.manuscript_id === "string" ? parse(uuid, req.query.manuscript_id) : null;
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const people = await usersWithRole(["REVIEWER"]);
  const ids = people.map((p: any) => p.id);
  const stats = ids.length ? await query(
    `SELECT reviewer_id,
        count(*) FILTER (WHERE status IN ('INVITED','ACCEPTED'))::int AS active,
        count(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
        round(avg(EXTRACT(EPOCH FROM (submitted_at - invited_at))/86400) FILTER (WHERE status='COMPLETED'))::int AS avg_days
     FROM jms.review_assignments WHERE reviewer_id = ANY($1) GROUP BY reviewer_id`, [ids]) : [];
  const profiles = ids.length ? await query(`SELECT * FROM jms.reviewer_profiles WHERE user_id = ANY($1)`, [ids]) : [];
  const excluded = new Set<string>();
  if (manuscriptId) {
    (await query(`SELECT user_id FROM jms.manuscript_authors WHERE manuscript_id=$1 AND user_id IS NOT NULL`, [manuscriptId])).forEach((x: any) => excluded.add(x.user_id));
    (await query(`SELECT submitted_by FROM jms.manuscripts WHERE id=$1`, [manuscriptId])).forEach((x: any) => excluded.add(x.submitted_by));
  }
  const out = people
    .filter((p: any) => !excluded.has(p.id))
    .map((p: any) => {
      const s: any = stats.find((x: any) => x.reviewer_id === p.id) ?? {};
      const pr: any = profiles.find((x: any) => x.user_id === p.id) ?? {};
      const active = s.active ?? 0;
      return { id: p.id, name: p.name, email: p.email, expertise: pr.expertise ?? "", affiliation: pr.affiliation ?? "",
               active, completed: s.completed ?? 0, avg_days: s.avg_days ?? null,
               status: pr.is_available === false ? "Unavailable" : active >= 4 ? "Busy" : "Available" };
    })
    .filter((p: any) => !search || `${p.name} ${p.expertise} ${p.email}`.toLowerCase().includes(search));
  res.json(ok(out));
});

const assignSchema = z.object({
  reviewer_ids: z.array(uuid).min(1).max(10),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_days: z.coerce.number().int().min(3).max(90).optional(),
  message: z.string().trim().max(3000).optional(),
});

r.post("/manuscripts/:id/reviewers", async (req, res) => {
  const id = idParam(req);
  const b = parse(assignSchema, req.body);
  const due = b.due_date ?? new Date(Date.now() + (b.due_days ?? 21) * 86400000).toISOString().slice(0, 10);
  const eligible = new Set((await usersWithRole(["REVIEWER"])).map((p: any) => p.id));
  const ms = await loadManuscript(id);
  if (ms.status !== "UNDER_REVIEW") throw conflict("Reviewers can only be assigned once a manuscript has been sent to review.");
  const authorIds = new Set<string>([ms.submitted_by]);
  (await loadAuthors(id)).forEach((a: any) => a.user_id && authorIds.add(a.user_id));
  const created: string[] = [];
  await tx(async (c) => {
    for (const rid of b.reviewer_ids) {
      if (!eligible.has(rid)) throw new HttpError(422, "One of the selected people is not an active reviewer.");
      if (authorIds.has(rid)) throw new HttpError(422, "An author cannot review their own manuscript.");
      const ins = await c.query(
        `INSERT INTO jms.review_assignments (manuscript_id, round, reviewer_id, invited_by, due_date)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (manuscript_id, round, reviewer_id) DO NOTHING RETURNING id`,
        [id, ms.current_round, rid, req.auth!.userId, due]);
      if (ins.rows[0]) created.push(rid);
    }
    if (!created.length) throw conflict("These reviewers are already assigned to this round.");
    await addEvent(c, id, req.auth!.userId, "REVIEWERS_ASSIGNED", null, null, `${created.length} reviewer(s) invited.`);
  });
  for (const rid of created)
    await notifyUser(rid, `Review invitation: ${ms.manuscript_no}`,
      `You are invited to review the manuscript "${ms.title}" (${ms.manuscript_no}). Please accept or decline by signing in. The review is due ${due}.${b.message ? "\n\n" + b.message : ""}`,
      "/reviewer/assignments");
  res.status(201).json(ok(null, `${created.length} reviewer(s) invited.`));
});

r.delete("/assignments/:aid", async (req, res) => {
  const a = await one(`SELECT id, manuscript_id, status FROM jms.review_assignments WHERE id=$1`, [idParam(req, "aid")]);
  if (!a) throw notFound("Assignment");
  if (a.status === "COMPLETED") throw conflict("A completed review cannot be cancelled.");
  await tx(async (c) => {
    await c.query(`UPDATE jms.review_assignments SET status='CANCELLED' WHERE id=$1`, [a.id]);
    await addEvent(c, a.manuscript_id, req.auth!.userId, "REVIEWER_REMOVED", null, null, null);
  });
  res.json(ok(null, "Reviewer removed."));
});

// ---------------------------------------------------------------- recommendation (UC-JMS-05)
async function readiness(id: string, round: number) {
  const s = await one(
    `SELECT count(*) FILTER (WHERE status='COMPLETED')::int AS completed,
            count(*) FILTER (WHERE status IN ('INVITED','ACCEPTED'))::int AS outstanding
     FROM jms.review_assignments WHERE manuscript_id=$1 AND round=$2`, [id, round]);
  return s!;
}

r.post("/manuscripts/:id/recommendation", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({ recommendation: REC, summary: z.string().trim().min(10, "Summarise the reviews for the Editor-in-Chief.").max(5000) }), req.body);
  const ms = await loadManuscript(id);
  if (ms.status !== "UNDER_REVIEW") throw conflict("This manuscript is not under review.");
  const rd = await readiness(id, ms.current_round);
  if (rd.completed < 1) throw conflict("At least one completed review is needed before you can recommend a decision.");
  if (rd.outstanding > 0) throw conflict(`${rd.outstanding} review(s) are still outstanding. Remove them or wait.`);
  await tx(async (c) => {
    await c.query(
      `INSERT INTO jms.editor_recommendations (manuscript_id, round, editor_id, recommendation, summary) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (manuscript_id, round) DO UPDATE SET editor_id=$3, recommendation=$4, summary=$5, created_at=now()`,
      [id, ms.current_round, req.auth!.userId, b.recommendation, b.summary]);
    await addEvent(c, id, req.auth!.userId, "EDITOR_RECOMMENDATION", null, null, `Recommended: ${b.recommendation}`);
  });
  res.json(ok(null, "Recommendation sent to the Editor-in-Chief."));
});

// ---------------------------------------------------------------- final decision (UC-JMS-06)
r.post("/manuscripts/:id/decision", requireRole("EIC"), async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({ decision: REC, letter: z.string().trim().min(10, "Write the decision letter to the author.").max(8000) }), req.body);
  const ms = await loadManuscript(id);
  if (ms.status !== "UNDER_REVIEW") throw conflict(`A ${ms.status} manuscript cannot receive a decision.`);
  const rd = await readiness(id, ms.current_round);
  if (rd.completed < 1) throw conflict("A decision needs at least one completed peer review.");
  if (rd.outstanding > 0) throw conflict(`${rd.outstanding} review(s) are still outstanding.`);
  const status = { ACCEPT: "ACCEPTED", MINOR_REVISION: "REVISION_REQUIRED", MAJOR_REVISION: "REVISION_REQUIRED", REJECT: "REJECTED" }[b.decision];
  await tx(async (c) => {
    await c.query(
      `INSERT INTO jms.decisions (manuscript_id, round, decided_by, decision, letter) VALUES ($1,$2,$3,$4,$5)`,
      [id, ms.current_round, req.auth!.userId, b.decision, b.letter]);
    await c.query(`UPDATE jms.manuscripts SET decision=$2, decision_at=now() WHERE id=$1`, [id, b.decision]);
    await moveStatus(c, id, status, req.auth!.userId, "DECISION", `Decision: ${b.decision}`);
    if (b.decision === "ACCEPT") {
      const j = (await c.query(`SELECT apc_amount, apc_currency FROM jms.journals WHERE id=$1`, [ms.journal_id])).rows[0];
      if (j.apc_amount > 0) {
        const inv = `INV-${new Date().getFullYear()}-${ms.manuscript_no.split("-").pop()}`;
        await c.query(
          `INSERT INTO jms.fees (manuscript_id, fee_type, amount, currency, due_date, invoice_no)
           VALUES ($1,'APC',$2,$3, (now() + interval '30 days')::date, $4)`, [id, j.apc_amount, j.apc_currency, inv]);
      }
    }
  });
  await notifyUser(ms.submitted_by, `Decision on ${ms.manuscript_no}`,
    `The Editor-in-Chief has made a decision on "${ms.title}": ${b.decision.replace("_", " ")}.\n\n${b.letter}`, "/author/submissions");
  res.json(ok(await loadManuscript(id), "Decision recorded and the author has been notified."));
});

// ---------------------------------------------------------------- dashboard & reports (FR-JM-004)
r.get("/dashboard", async (_req, res) => {
  const counts = await query(`SELECT status, count(*)::int AS n FROM jms.manuscripts WHERE status <> 'DRAFT' GROUP BY status`);
  const by = Object.fromEntries(counts.map((c: any) => [c.status, c.n]));
  const ready = (await one(
    `SELECT count(*)::int AS n FROM (${MS_LIST_SQL}) m JOIN (${STATS_SQL}) s ON s.manuscript_id = m.id
     WHERE m.status='UNDER_REVIEW' AND s.completed >= 1 AND s.outstanding = 0`))!.n;
  const needsReviewers = (await one(
    `SELECT count(*)::int AS n FROM (${MS_LIST_SQL}) m JOIN (${STATS_SQL}) s ON s.manuscript_id = m.id
     WHERE m.status='UNDER_REVIEW' AND s.assigned = 0`))!.n;
  const recent = await query(`${MS_LIST_SQL} WHERE m.status <> 'DRAFT' ORDER BY m.updated_at DESC LIMIT 6`);
  res.json(ok({
    by_status: by,
    awaiting_screening: (by.SUBMITTED ?? 0) + (by.REVISED ?? 0) + (by.UNDER_SCREENING ?? 0),
    under_review: by.UNDER_REVIEW ?? 0, needs_reviewers: needsReviewers, ready_for_decision: ready,
    accepted: (by.ACCEPTED ?? 0) + (by.IN_PRODUCTION ?? 0), published: by.PUBLISHED ?? 0, rejected: (by.REJECTED ?? 0) + (by.DESK_REJECTED ?? 0),
    recent,
  }));
});

r.get("/reports", async (_req, res) => {
  const byStatus = await query(`SELECT status, count(*)::int AS n FROM jms.manuscripts WHERE status<>'DRAFT' GROUP BY status ORDER BY n DESC`);
  const monthly = await query(
    `SELECT to_char(date_trunc('month', submitted_at), 'YYYY-MM') AS month, count(*)::int AS submissions
     FROM jms.manuscripts WHERE submitted_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
  const timing = await one(
    `SELECT round(avg(EXTRACT(EPOCH FROM (decision_at - submitted_at))/86400)::numeric, 1) AS avg_days_to_decision,
            count(*) FILTER (WHERE decision = 'ACCEPT')::int AS accepted,
            count(*) FILTER (WHERE decision = 'REJECT')::int AS rejected, count(*)::int AS decided
     FROM jms.manuscripts WHERE decision_at IS NOT NULL`);
  const reviewers = await query(
    `SELECT (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = reviewer_id) AS reviewer,
            count(*) FILTER (WHERE status='COMPLETED')::int AS completed,
            count(*) FILTER (WHERE status IN ('INVITED','ACCEPTED'))::int AS active,
            count(*) FILTER (WHERE status='DECLINED')::int AS declined
     FROM jms.review_assignments GROUP BY reviewer_id ORDER BY completed DESC LIMIT 10`);
  res.json(ok({ by_status: byStatus, monthly, timing, reviewers }));
});

export default r;
