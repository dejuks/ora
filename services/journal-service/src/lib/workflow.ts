import type pg from "pg";

export type Decision = "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";

/** Allowed manuscript status transitions (SRS UC-JMS-01 .. 10). */
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_SCREENING", "UNDER_REVIEW", "DESK_REJECTED", "DRAFT", "WITHDRAWN"],
  UNDER_SCREENING: ["UNDER_REVIEW", "DESK_REJECTED", "DRAFT"],
  UNDER_REVIEW: ["ACCEPTED", "REVISION_REQUIRED", "REJECTED"],
  REVISION_REQUIRED: ["REVISED", "WITHDRAWN"],
  REVISED: ["UNDER_REVIEW", "UNDER_SCREENING", "DESK_REJECTED"],
  ACCEPTED: ["IN_PRODUCTION", "PUBLISHED"],
  IN_PRODUCTION: ["PUBLISHED"],
};

export function canMove(from: string, to: string): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** Move a manuscript to a new status and write a timeline event. Throws when not allowed. */
export async function moveStatus(
  c: pg.PoolClient,
  manuscriptId: string,
  to: string,
  actorId: string,
  eventType: string,
  note?: string | null
): Promise<void> {
  const cur = await c.query("SELECT status FROM jms.manuscripts WHERE id = $1 FOR UPDATE", [manuscriptId]);
  if (!cur.rows[0]) throw new Error("Manuscript not found");
  const from: string = cur.rows[0].status;
  if (from !== to && !canMove(from, to)) {
    const { HttpError } = await import("./http.js");
    throw new HttpError(409, `A manuscript that is ${from} cannot become ${to}.`);
  }
  await c.query("UPDATE jms.manuscripts SET status = $2 WHERE id = $1", [manuscriptId, to]);
  await addEvent(c, manuscriptId, actorId, eventType, from, to, note);
}

export async function addEvent(
  c: pg.PoolClient | { query: (...a: any[]) => Promise<any> },
  manuscriptId: string,
  actorId: string | null,
  eventType: string,
  from?: string | null,
  to?: string | null,
  note?: string | null
) {
  await c.query(
    `INSERT INTO jms.manuscript_events (manuscript_id, actor_id, event_type, from_status, to_status, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [manuscriptId, actorId, eventType, from ?? null, to ?? null, note ?? null]
  );
}

/** FR-JM-007: ORA/<JOURNAL>/<YYYY>/<VOL>/<ISSUE>/<XXXXX>, number is unique per journal+year+volume+issue. */
export async function generateDoi(
  c: pg.PoolClient,
  journal: { id: string; code: string },
  year: number,
  volume: number,
  issueNumber: number
): Promise<string> {
  const r = await c.query(
    `INSERT INTO jms.doi_counters (journal_id, year, volume, issue_number, last_number)
     VALUES ($1,$2,$3,$4,1)
     ON CONFLICT (journal_id, year, volume, issue_number)
     DO UPDATE SET last_number = jms.doi_counters.last_number + 1
     RETURNING last_number`,
    [journal.id, year, volume, issueNumber]
  );
  const n = String(r.rows[0].last_number).padStart(5, "0");
  return `ORA/${journal.code}/${year}/${volume}/${issueNumber}/${n}`;
}

/** Next human readable manuscript number: ORA-2026-001 */
export async function nextManuscriptNo(c: pg.PoolClient): Promise<string> {
  const r = await c.query("SELECT nextval('jms.manuscript_seq') AS n");
  return `ORA-${new Date().getFullYear()}-${String(r.rows[0].n).padStart(3, "0")}`;
}
