import { one, query } from "../config/db.js";
import { notFound } from "./http.js";

export const MS_LIST_SQL = `
  SELECT m.id, m.manuscript_no, m.title, m.status, m.current_round, m.submitted_at, m.created_at, m.updated_at,
         m.decision, m.decision_at, m.associate_editor_id, m.submitted_by,
         j.title AS journal_title, j.id AS journal_id,
         c.name AS category, t.name AS article_type,
         COALESCE((SELECT string_agg(x.full_name, ', ' ORDER BY x.position) FROM jms.manuscript_authors x
                   WHERE x.manuscript_id = m.id), '') AS author_names
  FROM jms.manuscripts m
  JOIN jms.journals j ON j.id = m.journal_id
  LEFT JOIN jms.categories c ON c.id = m.category_id
  LEFT JOIN jms.article_types t ON t.id = m.article_type_id`;

export async function loadManuscript(id: string) {
  const m = await one(`${MS_LIST_SQL} WHERE m.id = $1`, [id]);
  if (!m) throw notFound("Manuscript");
  const full = await one(
    `SELECT abstract, keywords, cover_letter, data_availability, declarations, category_id, article_type_id
     FROM jms.manuscripts WHERE id = $1`, [id]);
  return { ...m, ...full };
}

export const loadAuthors = (id: string) =>
  query(`SELECT id, position, user_id, full_name, email, affiliation, orcid, is_corresponding
         FROM jms.manuscript_authors WHERE manuscript_id = $1 ORDER BY position`, [id]);

export const loadFiles = (id: string, kinds?: string[]) =>
  query(`SELECT id, round, kind, original_name, mime_type, size_bytes, created_at, uploaded_by
         FROM jms.manuscript_files WHERE manuscript_id = $1 AND ($2::text[] IS NULL OR kind = ANY($2))
         ORDER BY round, created_at`, [id, kinds ?? null]);

export const loadEvents = (id: string, types?: string[]) =>
  query(`SELECT e.id, e.event_type, e.from_status, e.to_status, e.note, e.created_at,
                (SELECT first_name || ' ' || last_name FROM iam.users WHERE id = e.actor_id) AS actor
         FROM jms.manuscript_events e WHERE e.manuscript_id = $1 AND ($2::text[] IS NULL OR e.event_type = ANY($2))
         ORDER BY e.created_at`, [id, types ?? null]);

/** Events an author may see (no internal editorial chatter). */
export const AUTHOR_EVENTS = [
  "SUBMITTED", "DESK_REJECTED", "SENT_TO_REVIEW", "DECISION", "REVISION_SUBMITTED",
  "PROOF_SENT", "PROOF_RESPONSE", "PUBLISHED", "RETURNED_TO_AUTHOR", "WITHDRAWN",
];

export const REVIEW_COUNTS_SQL = `
  (SELECT count(*) FROM jms.review_assignments ra WHERE ra.manuscript_id = m.id AND ra.round = m.current_round
     AND ra.status <> 'CANCELLED' AND ra.status <> 'DECLINED')`;
