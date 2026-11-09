import { Router } from "express";
import { z } from "zod";
import { one, query, tx } from "../config/db.js";
import { conflict, idParam, notFound, ok, parse } from "../lib/http.js";
import { requireRole } from "../middleware/auth.js";
import { addEvent } from "../lib/workflow.js";
import { notifyUser } from "../lib/notify.js";

const r = Router();
r.use(requireRole("REVIEWER"));

// Double-blind: reviewers never receive author names, affiliations or the cover letter.
const ASSIGN_SQL = `
  SELECT ra.id, ra.round, ra.status AS invitation_status, ra.invited_at, ra.responded_at, ra.due_date,
         ra.recommendation, ra.score, ra.submitted_at,
         m.id AS manuscript_id, m.manuscript_no, m.title, m.status AS manuscript_status,
         c.name AS category, t.name AS article_type, j.title AS journal_title,
         CASE WHEN ra.status = 'COMPLETED' THEN 'Completed'
              WHEN ra.status = 'ACCEPTED' AND ra.due_date < current_date THEN 'Overdue'
              WHEN ra.status = 'ACCEPTED' THEN 'In Progress'
              WHEN ra.status = 'INVITED' THEN 'Awaiting response'
              ELSE 'N/A' END AS progress
  FROM jms.review_assignments ra
  JOIN jms.manuscripts m ON m.id = ra.manuscript_id
  JOIN jms.journals j ON j.id = m.journal_id
  LEFT JOIN jms.categories c ON c.id = m.category_id
  LEFT JOIN jms.article_types t ON t.id = m.article_type_id
  WHERE ra.reviewer_id = $1 AND ra.status <> 'CANCELLED'`;

r.get("/assignments", async (req, res) => {
  const status = typeof req.query.status === "string" && req.query.status !== "ALL" ? req.query.status.toUpperCase() : null;
  res.json(ok(await query(`${ASSIGN_SQL} AND ($2::text IS NULL OR ra.status = $2) ORDER BY ra.invited_at DESC`, [req.auth!.userId, status])));
});

r.get("/assignments/:id", async (req, res) => {
  const a = await one(`${ASSIGN_SQL} AND ra.id = $2`, [req.auth!.userId, idParam(req)]);
  if (!a) throw notFound("Assignment");
  const m = await one(`SELECT abstract, keywords, data_availability FROM jms.manuscripts WHERE id=$1`, [a.manuscript_id]);
  // Files are only visible once the invitation is accepted.
  const files = ["ACCEPTED", "COMPLETED"].includes(a.invitation_status)
    ? await query(
        `SELECT id, kind, original_name, size_bytes FROM jms.manuscript_files
         WHERE manuscript_id=$1 AND round=$2 AND kind IN ('MANUSCRIPT','REVISION','SUPPLEMENTARY')`, [a.manuscript_id, a.round])
    : [];
  const own = await one(`SELECT comments_to_author, confidential_comments, checklist FROM jms.review_assignments WHERE id=$1`, [a.id]);
  res.json(ok({ ...a, ...m, files, review: a.invitation_status === "COMPLETED" ? own : null }));
});

r.post("/assignments/:id/respond", async (req, res) => {
  const b = parse(z.object({ accept: z.boolean(), reason: z.string().trim().max(2000).optional() })
    .refine((v) => v.accept || (v.reason && v.reason.length >= 3), { message: "Tell the editor why you are declining.", path: ["reason"] }), req.body);
  const a = await one(`SELECT id, status, manuscript_id, invited_by FROM jms.review_assignments WHERE id=$1 AND reviewer_id=$2`, [idParam(req), req.auth!.userId]);
  if (!a) throw notFound("Assignment");
  if (a.status !== "INVITED") throw conflict(`You already responded (${a.status}).`);
  await tx(async (c) => {
    await c.query(`UPDATE jms.review_assignments SET status=$2, responded_at=now(), decline_reason=$3 WHERE id=$1`,
      [a.id, b.accept ? "ACCEPTED" : "DECLINED", b.accept ? null : b.reason]);
    await addEvent(c, a.manuscript_id, req.auth!.userId, b.accept ? "REVIEW_ACCEPTED" : "REVIEW_DECLINED", null, null, b.accept ? null : b.reason);
  });
  await notifyUser(a.invited_by, `Reviewer ${b.accept ? "accepted" : "declined"}`,
    `A reviewer has ${b.accept ? "accepted" : "declined"} the invitation.${b.accept ? "" : "\n\nReason: " + b.reason}`, "/eic/assign-reviewers");
  res.json(ok(null, b.accept ? "Invitation accepted." : "Invitation declined."));
});

// FR-JM-003: comments + recommendation (Accept, Minor Revisions, Major Revisions, Reject)
const reviewSchema = z.object({
  recommendation: z.enum(["ACCEPT", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"]),
  score: z.coerce.number().int().min(1).max(10),
  comments_to_author: z.string().trim().min(20, "Write comments for the author (at least 20 characters).").max(20000),
  confidential_comments: z.string().trim().max(10000).optional().default(""),
  checklist: z.record(z.string(), z.boolean()).optional().default({}),
});

r.post("/assignments/:id/review", async (req, res) => {
  const b = parse(reviewSchema, req.body);
  const a = await one(`SELECT id, status, manuscript_id, invited_by FROM jms.review_assignments WHERE id=$1 AND reviewer_id=$2`, [idParam(req), req.auth!.userId]);
  if (!a) throw notFound("Assignment");
  if (a.status === "COMPLETED") throw conflict("You have already submitted this review.");
  if (a.status !== "ACCEPTED") throw conflict("Accept the invitation before submitting a review.");
  await tx(async (c) => {
    await c.query(
      `UPDATE jms.review_assignments SET status='COMPLETED', recommendation=$2, score=$3, comments_to_author=$4,
              confidential_comments=$5, checklist=$6, submitted_at=now() WHERE id=$1`,
      [a.id, b.recommendation, b.score, b.comments_to_author, b.confidential_comments || null, b.checklist]);
    await addEvent(c, a.manuscript_id, req.auth!.userId, "REVIEW_SUBMITTED", null, null, null);
  });
  await notifyUser(a.invited_by, "A review was submitted", "A reviewer has submitted a review. Check the manuscript in your dashboard.", "/eic/final-decisions");
  res.json(ok(null, "Review submitted. Thank you."));
});

r.get("/profile", async (req, res) => {
  const p = await one(`SELECT expertise, affiliation, orcid, is_available FROM jms.reviewer_profiles WHERE user_id=$1`, [req.auth!.userId]);
  res.json(ok(p ?? { expertise: "", affiliation: "", orcid: null, is_available: true }));
});

r.put("/profile", async (req, res) => {
  const b = parse(z.object({
    expertise: z.string().trim().max(500).optional().default(""),
    affiliation: z.string().trim().max(255).optional().default(""),
    orcid: z.string().trim().regex(/^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9Xx]$/).optional().nullable().or(z.literal("").transform(() => null)),
    is_available: z.boolean().optional().default(true),
  }), req.body);
  await query(
    `INSERT INTO jms.reviewer_profiles (user_id, expertise, affiliation, orcid, is_available) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE SET expertise=$2, affiliation=$3, orcid=$4, is_available=$5, updated_at=now()`,
    [req.auth!.userId, b.expertise, b.affiliation, b.orcid ?? null, b.is_available]);
  res.json(ok(b, "Profile saved."));
});

r.get("/dashboard", async (req, res) => {
  const uid = req.auth!.userId;
  const s = await one(
    `SELECT count(*) FILTER (WHERE status='INVITED')::int AS pending_invitations,
            count(*) FILTER (WHERE status='ACCEPTED')::int AS in_progress,
            count(*) FILTER (WHERE status='ACCEPTED' AND due_date < current_date)::int AS overdue,
            count(*) FILTER (WHERE status='COMPLETED')::int AS completed,
            round(avg(EXTRACT(EPOCH FROM (submitted_at - invited_at))/86400) FILTER (WHERE status='COMPLETED'))::int AS avg_days
     FROM jms.review_assignments WHERE reviewer_id=$1`, [uid]);
  const recent = await query(`${ASSIGN_SQL} ORDER BY ra.invited_at DESC LIMIT 5`, [uid]);
  res.json(ok({ ...s, recent }));
});

export default r;
