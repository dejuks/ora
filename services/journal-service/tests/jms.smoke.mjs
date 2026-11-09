// End-to-end test of the Journal Management System API.
// Creates its own users/data, mints tokens like the auth service does, then cleans up.
//   BASE_URL (default http://localhost:4001/api/v1/jms)  DATABASE_URL  ACCESS_TOKEN_SECRET
import "dotenv/config";
import pg from "pg";
import { SignJWT } from "jose";

const BASE = process.env.BASE_URL || "http://localhost:4001/api/v1/jms";
const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const tag = Math.random().toString(36).slice(2, 8);

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL ${name}${extra !== undefined ? "  -> " + JSON.stringify(extra).slice(0, 300) : ""}`); }
}

const PDF = () => new Blob([Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")], { type: "application/pdf" });
const DOCX = () => new Blob([Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(200, 1)])], { type: "application/octet-stream" });

async function call(method, path, { token, json, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(BASE + path, { method, headers, body });
  if (raw) return res;
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, body: data, data: data?.data };
}

async function mint(userId, jms, extra = {}) {
  return new SignJWT({ sid: "test-session", roles: extra.roles ?? [], modules: { JMS: jms }, mcp: extra.mcp ?? false })
    .setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setIssuer("ora-auth-service").setAudience("ora-digital-platform").setExpirationTime("15m")
    .sign(extra.badSecret ? new TextEncoder().encode("x".repeat(40)) : secret);
}

const createdUsers = [];
async function makeUser(label, roleCodes) {
  const email = `jms.${label}.${tag}@test.ora`;
  const u = (await pool.query(
    `INSERT INTO iam.users (first_name, last_name, username, email, status) VALUES ($1,'Tester',$2,$3,'ACTIVE') RETURNING id`,
    [label[0].toUpperCase() + label.slice(1), `jms_${label}_${tag}`, email])).rows[0];
  const mod = (await pool.query(`SELECT id FROM iam.modules WHERE code='JMS'`)).rows[0];
  const a = (await pool.query(
    `INSERT INTO iam.user_module_assignments (user_id, module_id) VALUES ($1,$2) RETURNING id`, [u.id, mod.id])).rows[0];
  for (const code of roleCodes) {
    await pool.query(
      `INSERT INTO iam.user_module_roles (module_assignment_id, module_id, role_id)
       SELECT $1, $2, id FROM iam.roles WHERE module_id=$2 AND code=$3`, [a.id, mod.id, code]);
  }
  createdUsers.push(u.id);
  return { id: u.id, email, token: await mint(u.id, roleCodes) };
}

async function cleanup() {
  const ids = createdUsers;
  if (!ids.length) return;
  await pool.query(`DELETE FROM jms.articles WHERE manuscript_id IN (SELECT id FROM jms.manuscripts WHERE submitted_by = ANY($1))`, [ids]);
  await pool.query(`DELETE FROM jms.manuscripts WHERE submitted_by = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM jms.issues WHERE volume = 99 AND issue_number IN (1,2)`);
  await pool.query(`DELETE FROM jms.categories WHERE slug LIKE $1`, [`%${tag}%`]);
  await pool.query(`DELETE FROM jms.article_types WHERE name LIKE $1`, [`%${tag}%`]);
  await pool.query(`DELETE FROM jms.contact_messages WHERE email LIKE '%@test.ora'`);
  await pool.query(`DELETE FROM jms.reviewer_profiles WHERE user_id = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM iam.user_module_roles WHERE module_assignment_id IN (SELECT id FROM iam.user_module_assignments WHERE user_id = ANY($1))`, [ids]);
  await pool.query(`DELETE FROM iam.user_module_assignments WHERE user_id = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM iam.users WHERE id = ANY($1)`, [ids]);
}

async function main() {
  console.log(`JMS smoke test against ${BASE}`);
  const journal = (await pool.query(`SELECT id, apc_amount FROM jms.journals WHERE code='JOR'`)).rows[0];
  await pool.query(`UPDATE jms.journals SET apc_amount = 100 WHERE id=$1`, [journal.id]);

  const author = await makeUser("author", ["AUTHOR"]);
  const author2 = await makeUser("authortwo", ["AUTHOR"]);
  const ae = await makeUser("assocedit", ["ASSOCIATE_EDITOR"]);
  const eic = await makeUser("chief", ["EIC"]);
  const rev1 = await makeUser("reviewone", ["REVIEWER"]);
  const rev2 = await makeUser("reviewtwo", ["REVIEWER"]);
  const mgr = await makeUser("manager", ["JOURNAL_MANAGER"]);
  const nobody = await makeUser("nobody", []);

  console.log("\n[health & public]");
  let r = await call("GET", "/health");
  check("health reports database connected", r.status === 200 && r.body.database === "connected");
  r = await call("GET", "/public/journals");
  check("public journal list", r.status === 200 && r.data.some((j) => j.code === "JOR" && j.issn === "2049-3630"), r.body);
  r = await call("GET", "/public/categories");
  check("public categories", r.status === 200 && r.data.length >= 1);
  const category = r.data[0];
  r = await call("GET", "/public/article-types");
  check("public article types", r.status === 200 && r.data.length >= 1);
  const atype = r.data[0];
  r = await call("POST", "/public/contact", { json: { name: "Visitor", email: `visitor.${tag}@test.ora`, subject: "Question", message: "Hello, how do I submit a manuscript?" } });
  check("contact form accepted", r.status === 201);
  r = await call("POST", "/public/contact", { json: { name: "V", email: "bad", subject: "x", message: "short" } });
  check("contact form validates input", r.status === 422 && Array.isArray(r.body.errors));

  console.log("\n[authentication & authorization]");
  r = await call("GET", "/author/manuscripts");
  check("no token -> 401", r.status === 401);
  r = await call("GET", "/author/manuscripts", { token: await mint(author.id, ["AUTHOR"], { badSecret: true }) });
  check("token with wrong signature -> 401", r.status === 401);
  r = await call("GET", "/author/manuscripts", { token: await mint(author.id, ["AUTHOR"], { mcp: true }) });
  check("must-change-password token -> 403", r.status === 403);
  r = await call("GET", "/editorial/manuscripts", { token: author.token });
  check("author cannot use editorial API", r.status === 403);
  r = await call("GET", "/author/manuscripts", { token: nobody.token });
  check("user without JMS role cannot submit", r.status === 403);
  r = await call("GET", "/production/manuscripts", { token: ae.token });
  check("associate editor cannot use production API", r.status === 403);
  r = await call("GET", "/editorial/manuscripts", { token: await mint(nobody.id, [], { roles: ["SUPER_ADMIN"] }) });
  check("super admin passes every role check", r.status === 200);

  console.log("\n[author: draft, files, submit]  UC-JMS-01");
  const draft = {
    title: "Gadaa system and contemporary governance in Oromia",
    abstract: Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "),
    keywords: "gadaa, governance, oromia",
    category_id: category.id, article_type_id: atype.id,
    cover_letter: "Please consider our work.", data_availability: "ON_REQUEST",
    declarations: { original_work: true, authors_approved: true, ethics: true, no_conflict: true },
    authors: [{ full_name: "Dr. Co Author", email: `co.${tag}@test.ora`, affiliation: "Jimma University", orcid: "0000-0002-1825-0097" }],
  };
  r = await call("POST", "/author/manuscripts", { token: author.token, json: { ...draft, title: "x" } });
  check("draft title validated", r.status === 422);
  r = await call("POST", "/author/manuscripts", { token: author.token, json: { ...draft, authors: [{ full_name: "A B", email: "a@b.co", orcid: "123" }] } });
  check("ORCID format validated", r.status === 422);
  r = await call("POST", "/author/manuscripts", { token: author.token, json: draft });
  check("draft created", r.status === 201 && r.data.status === "DRAFT" && r.data.manuscript_no === null, r.body);
  const msId = r.data.id;
  r = await call("GET", `/author/manuscripts/${msId}`, { token: author.token });
  check("draft has corresponding author + co-author", r.data.authors.length === 2 && r.data.authors[0].is_corresponding, r.data.authors);
  check("keywords split into array", r.data.keywords.length === 3);
  r = await call("POST", `/author/manuscripts/${msId}/submit`, { token: author.token });
  check("cannot submit without a manuscript file", r.status === 422 && r.body.errors.some((e) => /upload the manuscript/i.test(e.message)), r.body);
  let form = new FormData(); form.append("kind", "MANUSCRIPT"); form.append("files", new Blob(["hello"], { type: "text/plain" }), "notes.txt");
  r = await call("POST", `/author/manuscripts/${msId}/files`, { token: author.token, form });
  check(".txt upload rejected (415)", r.status === 415, r.body);
  form = new FormData(); form.append("kind", "MANUSCRIPT"); form.append("files", new Blob(["not really a pdf"], { type: "application/pdf" }), "fake.pdf");
  r = await call("POST", `/author/manuscripts/${msId}/files`, { token: author.token, form });
  check("fake PDF (wrong content) rejected (415)", r.status === 415, r.body);
  form = new FormData(); form.append("kind", "MANUSCRIPT"); form.append("files", DOCX(), "manuscript-v1.docx");
  r = await call("POST", `/author/manuscripts/${msId}/files`, { token: author.token, form });
  check("DOCX manuscript uploaded", r.status === 201 && r.data[0].kind === "MANUSCRIPT", r.body);
  const mainFileId = r.data[0].id;
  form = new FormData(); form.append("kind", "SUPPLEMENTARY"); form.append("files", PDF(), "dataset-notes.pdf");
  r = await call("POST", `/author/manuscripts/${msId}/files`, { token: author.token, form });
  check("supplementary file uploaded", r.status === 201);
  r = await call("PUT", `/author/manuscripts/${msId}`, { token: author.token, json: { ...draft, declarations: { original_work: true } } });
  check("draft can be edited", r.status === 200);
  r = await call("POST", `/author/manuscripts/${msId}/submit`, { token: author.token });
  check("incomplete declarations block submission", r.status === 422 && r.body.errors.length >= 3, r.body);
  await call("PUT", `/author/manuscripts/${msId}`, { token: author.token, json: draft });
  r = await call("POST", `/author/manuscripts/${msId}/submit`, { token: author2.token });
  check("another author cannot submit it (404)", r.status === 404);
  r = await call("POST", `/author/manuscripts/${msId}/submit`, { token: author.token });
  check("manuscript submitted with number", r.status === 200 && /^ORA-\d{4}-\d{3,}$/.test(r.data.manuscript_no) && r.data.status === "SUBMITTED", r.body);
  const msNo = r.data.manuscript_no;
  r = await call("PUT", `/author/manuscripts/${msId}`, { token: author.token, json: draft });
  check("submitted manuscript can no longer be edited (409)", r.status === 409);
  r = await call("GET", "/author/manuscripts", { token: author.token });
  check("author sees own manuscript in list", r.data.some((m) => m.id === msId) && r.pagination !== undefined || r.body.pagination?.total >= 1);
  r = await call("GET", "/author/manuscripts", { token: author2.token });
  check("other author's list is empty", r.body.pagination.total === 0);
  r = await call("GET", `/author/manuscripts/${msId}`, { token: author2.token });
  check("other author cannot read it (404)", r.status === 404);

  console.log("\n[editor: screening, reviewers]  UC-JMS-02");
  r = await call("GET", "/editorial/manuscripts?stage=screening", { token: ae.token });
  check("submitted manuscript appears in screening queue", r.status === 200 && r.data.some((m) => m.id === msId && m.status === "SUBMITTED"), r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/claim`, { token: ae.token, json: {} });
  check("associate editor claims manuscript", r.status === 200 && r.data.status === "UNDER_SCREENING", r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/reviewers`, { token: ae.token, json: { reviewer_ids: [rev1.id] } });
  check("cannot assign reviewers before screening is done (409)", r.status === 409);
  r = await call("POST", `/editorial/manuscripts/${msId}/screen`, { token: ae.token, json: { outcome: "DESK_REJECT", notes: "" } });
  check("desk reject needs a reason", r.status === 422);
  r = await call("POST", `/editorial/manuscripts/${msId}/screen`, { token: ae.token, json: { outcome: "SEND_TO_REVIEW", scope_ok: true, format_ok: true, ethics_ok: true, similarity_pct: 6.5, notes: "Good fit." } });
  check("sent to review", r.status === 200 && r.data.status === "UNDER_REVIEW", r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/screen`, { token: ae.token, json: { outcome: "SEND_TO_REVIEW" } });
  check("cannot screen twice (409)", r.status === 409);
  r = await call("GET", `/editorial/reviewers?manuscript_id=${msId}`, { token: ae.token });
  check("reviewer list contains reviewers only", r.status === 200 && r.data.some((x) => x.id === rev1.id) && !r.data.some((x) => x.id === author.id), r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/reviewers`, { token: ae.token, json: { reviewer_ids: [author2.id] } });
  check("non-reviewer cannot be assigned (422)", r.status === 422);
  r = await call("POST", `/editorial/manuscripts/${msId}/reviewers`, { token: ae.token, json: { reviewer_ids: [rev1.id, rev2.id], due_days: 14 } });
  check("two reviewers invited", r.status === 201, r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/reviewers`, { token: ae.token, json: { reviewer_ids: [rev1.id] } });
  check("duplicate invitation rejected (409)", r.status === 409);

  console.log("\n[reviewer: double-blind review]  UC-JMS-04, FR-JM-003");
  r = await call("GET", "/reviewer/assignments", { token: rev1.token });
  check("reviewer sees invitation", r.status === 200 && r.data.length === 1 && r.data[0].invitation_status === "INVITED", r.body);
  const a1 = r.data[0].id;
  const listJson = JSON.stringify(r.body);
  check("list does not leak author names", !/Tester|Co Author|Jimma/.test(listJson) && !("author_names" in r.data[0]));
  r = await call("GET", `/reviewer/assignments/${a1}`, { token: rev1.token });
  const detailJson = JSON.stringify(r.body);
  check("detail hides authors, emails and cover letter", !/Tester|Co Author|Jimma|Please consider|@test\.ora/.test(detailJson) && !("authors" in r.data) && !("cover_letter" in r.data), r.body);
  check("files hidden until the invitation is accepted", r.data.files.length === 0);
  r = await call("GET", `/reviewer/assignments/${a1}`, { token: rev2.token });
  check("other reviewer cannot open this assignment (404)", r.status === 404);
  r = await call("GET", `/files/${mainFileId}/download`, { token: rev1.token, raw: true });
  check("file download blocked before accepting (403)", r.status === 403);
  r = await call("POST", `/reviewer/assignments/${a1}/review`, { token: rev1.token, json: { recommendation: "ACCEPT", score: 8, comments_to_author: "Looks fine to me overall." } });
  check("cannot review before accepting (409)", r.status === 409);
  r = await call("POST", `/reviewer/assignments/${a1}/respond`, { token: rev1.token, json: { accept: true } });
  check("reviewer accepts", r.status === 200);
  r = await call("GET", `/reviewer/assignments/${a1}`, { token: rev1.token });
  check("files visible after accepting", r.data.files.length >= 1);
  r = await call("GET", `/files/${mainFileId}/download`, { token: rev1.token, raw: true });
  check("assigned reviewer can download the manuscript", r.status === 200 && (await r.arrayBuffer()).byteLength > 100);
  r = await call("GET", `/files/${mainFileId}/download`, { token: rev2.token, raw: true });
  check("reviewer who has not accepted still blocked (403)", r.status === 403);
  r = await call("GET", `/files/${mainFileId}/download`, { token: author2.token, raw: true });
  check("unrelated author blocked from files (403)", r.status === 403);
  r = await call("GET", `/files/${mainFileId}/download`, { token: author.token, raw: true });
  check("author can download own file", r.status === 200);
  r = await call("POST", `/reviewer/assignments/${a1}/review`, { token: rev1.token, json: { recommendation: "MAJOR_REVISION", score: 5, comments_to_author: "short" } });
  check("review comments validated", r.status === 422);
  r = await call("POST", `/reviewer/assignments/${a1}/review`, { token: rev1.token, json: { recommendation: "MAJOR_REVISION", score: 5, comments_to_author: "Please clarify the sampling method and add the missing references.", confidential_comments: "Possible overlap with prior work.", checklist: { methodology: true, ethics: true } } });
  check("review submitted", r.status === 200, r.body);
  r = await call("POST", `/reviewer/assignments/${a1}/review`, { token: rev1.token, json: { recommendation: "ACCEPT", score: 9, comments_to_author: "Changed my mind about everything here." } });
  check("cannot review twice (409)", r.status === 409);
  r = await call("GET", "/reviewer/assignments", { token: rev2.token });
  const a2 = r.data[0].id;
  r = await call("POST", `/reviewer/assignments/${a2}/respond`, { token: rev2.token, json: { accept: false } });
  check("decline needs a reason", r.status === 422);
  r = await call("POST", `/reviewer/assignments/${a2}/respond`, { token: rev2.token, json: { accept: false, reason: "Conflict of interest." } });
  check("reviewer declines", r.status === 200);
  r = await call("PUT", "/reviewer/profile", { token: rev1.token, json: { expertise: "Oromo history", affiliation: "AAU", is_available: true } });
  check("reviewer profile saved", r.status === 200);
  r = await call("GET", "/reviewer/dashboard", { token: rev1.token });
  check("reviewer dashboard counts", r.data.completed === 1, r.body);

  console.log("\n[editor recommendation + EIC decision]  UC-JMS-05/06");
  r = await call("GET", "/editorial/manuscripts?stage=decision", { token: eic.token });
  check("manuscript ready for decision", r.data.some((m) => m.id === msId && m.completed === 1 && m.rec_major === 1), r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/recommendation`, { token: ae.token, json: { recommendation: "MAJOR_REVISION", summary: "Reviewer asks for clarification of methods." } });
  check("associate editor recommends", r.status === 200, r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/decision`, { token: ae.token, json: { decision: "MAJOR_REVISION", letter: "Please revise your manuscript." } });
  check("only the EIC can decide (403)", r.status === 403);
  r = await call("POST", `/editorial/manuscripts/${msId}/decision`, { token: eic.token, json: { decision: "MAJOR_REVISION", letter: "short" } });
  check("decision letter validated", r.status === 422);
  r = await call("POST", `/editorial/manuscripts/${msId}/decision`, { token: eic.token, json: { decision: "MAJOR_REVISION", letter: "Please address the reviewer's concerns and resubmit." } });
  check("EIC requests major revision", r.status === 200 && r.data.status === "REVISION_REQUIRED", r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/decision`, { token: eic.token, json: { decision: "ACCEPT", letter: "Accepting it right now." } });
  check("cannot decide twice (409)", r.status === 409);

  console.log("\n[author: revision]  UC-JMS-03");
  r = await call("GET", `/author/manuscripts/${msId}`, { token: author.token });
  check("author sees the decision letter", r.data.decisions.length === 1 && r.data.decisions[0].decision === "MAJOR_REVISION");
  check("author sees anonymised review", r.data.reviews.length === 1 && r.data.reviews[0].reviewer === "Reviewer 1" && !JSON.stringify(r.data.reviews).includes("Reviewone") && !("confidential_comments" in r.data.reviews[0]), r.data.reviews);
  check("author never sees confidential comments", !JSON.stringify(r.body).includes("Possible overlap"));
  form = new FormData(); form.append("response_to_reviewers", "We clarified the sampling method and added references.");
  r = await call("POST", `/author/manuscripts/${msId}/revise`, { token: author.token, form });
  check("revision needs a file (422)", r.status === 422);
  form = new FormData(); form.append("response_to_reviewers", "ok"); form.append("files", DOCX(), "revised.docx");
  r = await call("POST", `/author/manuscripts/${msId}/revise`, { token: author.token, form });
  check("response letter validated (422)", r.status === 422);
  form = new FormData(); form.append("response_to_reviewers", "We clarified the sampling method and added references."); form.append("files", DOCX(), "revised.docx");
  r = await call("POST", `/author/manuscripts/${msId}/revise`, { token: author.token, form });
  check("revision submitted (round 2)", r.status === 200 && r.data.status === "REVISED" && r.data.current_round === 2, r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/screen`, { token: ae.token, json: { outcome: "SEND_TO_REVIEW", notes: "Revised version looks good." } });
  check("revised manuscript back to review", r.status === 200 && r.data.status === "UNDER_REVIEW", r.body);
  r = await call("POST", `/editorial/manuscripts/${msId}/reviewers`, { token: ae.token, json: { reviewer_ids: [rev1.id], due_days: 10 } });
  check("reviewer invited for round 2", r.status === 201, r.body);
  r = await call("GET", "/reviewer/assignments?status=INVITED", { token: rev1.token });
  const a3 = r.data[0].id;
  await call("POST", `/reviewer/assignments/${a3}/respond`, { token: rev1.token, json: { accept: true } });
  r = await call("GET", `/reviewer/assignments/${a3}`, { token: rev1.token });
  const revFile = r.data.files.find((f) => f.kind === "REVISION");
  check("reviewer sees the revised file (round 2)", !!revFile && !r.data.files.some((f) => f.kind === "MANUSCRIPT"), r.data.files);
  r = await call("POST", `/reviewer/assignments/${a3}/review`, { token: rev1.token, json: { recommendation: "ACCEPT", score: 9, comments_to_author: "All my concerns have been addressed. Well done." } });
  check("round-2 review submitted", r.status === 200);
  r = await call("POST", `/editorial/manuscripts/${msId}/decision`, { token: eic.token, json: { decision: "ACCEPT", letter: "Congratulations, your article is accepted for publication." } });
  check("EIC accepts", r.status === 200 && r.data.status === "ACCEPTED", r.body);
  r = await call("GET", `/author/manuscripts/${msId}`, { token: author.token });
  check("APC fee created on acceptance", r.data.fee && r.data.fee.amount === 100 && r.data.fee.status === "PENDING", r.data.fee);

  console.log("\n[fee + proofs + publish]  UC-JMS-07/08/09/10");
  r = await call("GET", "/production/manuscripts", { token: mgr.token });
  const prod = r.data.find((m) => m.id === msId);
  check("accepted manuscript in production queue", !!prod && prod.production_status === "AWAITING_PROOF", r.body);
  r = await call("POST", `/production/manuscripts/${msId}/publish`, { token: mgr.token, json: { issue_id: "00000000-0000-0000-0000-000000000000" } });
  check("cannot publish without an approved proof (409)", r.status === 409, r.body);
  form = new FormData(); form.append("message", "Please review the attached proof."); form.append("response_due", "2030-01-31"); form.append("file", DOCX(), "proof.docx");
  r = await call("POST", `/production/manuscripts/${msId}/proofs`, { token: mgr.token, form });
  check("proof must be a PDF (422)", r.status === 422);
  form = new FormData(); form.append("message", "Please review the attached proof."); form.append("response_due", "2030-01-31"); form.append("internal_notes", "INTERNAL ONLY"); form.append("file", PDF(), "proof-v1.pdf");
  r = await call("POST", `/production/manuscripts/${msId}/proofs`, { token: mgr.token, form });
  check("proof v1 sent", r.status === 201 && r.data.version === 1, r.body);
  form = new FormData(); form.append("message", "Another proof."); form.append("response_due", "2030-01-31");
  r = await call("POST", `/production/manuscripts/${msId}/proofs`, { token: mgr.token, form });
  check("cannot send a second proof before the author answers (409)", r.status === 409);
  r = await call("GET", "/author/proofs?status=SENT", { token: author.token });
  check("author sees pending proof", r.data.length === 1 && !JSON.stringify(r.body).includes("INTERNAL ONLY"), r.body);
  const proof1 = r.data[0].id;
  r = await call("POST", `/author/proofs/${proof1}/respond`, { token: author.token, json: { action: "CORRECTIONS", comments: "" } });
  check("corrections need details (422)", r.status === 422);
  r = await call("POST", `/author/proofs/${proof1}/respond`, { token: author2.token, json: { action: "ACCEPT" } });
  check("other author cannot answer the proof (404)", r.status === 404);
  r = await call("POST", `/author/proofs/${proof1}/respond`, { token: author.token, json: { action: "CORRECTIONS", comments: "Fix the affiliation of the second author." } });
  check("author requests corrections", r.status === 200);
  r = await call("GET", `/production/manuscripts/${msId}`, { token: mgr.token });
  check("production status becomes COMMENT_RECEIVED", r.data.production_status === "COMMENT_RECEIVED", r.data?.production_status);
  form = new FormData(); form.append("message", "Corrected proof attached."); form.append("response_due", "2030-02-15"); form.append("file", PDF(), "proof-v2.pdf");
  r = await call("POST", `/production/manuscripts/${msId}/proofs`, { token: mgr.token, form });
  check("proof v2 sent", r.status === 201 && r.data.version === 2);
  r = await call("GET", "/author/proofs?status=SENT", { token: author.token });
  r = await call("POST", `/author/proofs/${r.data[0].id}/respond`, { token: author.token, json: { action: "ACCEPT" } });
  check("author approves proof v2", r.status === 200);
  r = await call("POST", `/author/proofs/${proof1}/respond`, { token: author.token, json: { action: "ACCEPT" } });
  check("answered proof cannot be answered again (409)", r.status === 409);

  r = await call("POST", "/production/issues", { token: mgr.token, json: { volume: 99, issue_number: 1, title: "Test issue", publication_date: "2026-12-01", status: "PUBLISHED" } });
  check("issue created", r.status === 201, r.body);
  const issueId = r.data.id;
  r = await call("POST", "/production/issues", { token: mgr.token, json: { volume: 99, issue_number: 1 } });
  check("duplicate volume/issue rejected (409)", r.status === 409);
  r = await call("POST", `/production/manuscripts/${msId}/publish`, { token: mgr.token, json: { issue_id: issueId, pages: "1-18" } });
  check("publish blocked while the fee is unpaid (409)", r.status === 409 && /fee/i.test(r.body.message), r.body);
  r = await call("GET", "/author/fees", { token: author.token });
  const feeId = r.data[0].id;
  check("author sees the fee with invoice number", r.data[0].amount === 100 && /^INV-/.test(r.data[0].invoice_no));
  r = await call("POST", `/author/fees/${feeId}/pay`, { token: author.token, json: { payment_reference: "" } });
  check("payment reference required (422)", r.status === 422);
  r = await call("POST", `/author/fees/${feeId}/pay`, { token: author.token, json: { payment_reference: "BANK-TRX-884213" } });
  check("author reports payment", r.status === 200);
  r = await call("PATCH", `/production/fees/${feeId}`, { token: author.token, json: { action: "CONFIRM_PAYMENT" } });
  check("author cannot confirm own payment (403)", r.status === 403);
  r = await call("PATCH", `/production/fees/${feeId}`, { token: mgr.token, json: { action: "CONFIRM_PAYMENT" } });
  check("journal manager confirms payment", r.status === 200);
  r = await call("POST", `/production/manuscripts/${msId}/publish`, { token: mgr.token, json: { issue_id: issueId, article_number: "001", pages: "1-18" } });
  const doi = r.data?.doi;
  check("published with ORA DOI (FR-JM-007)", r.status === 201 && /^ORA\/JOR\/\d{4}\/99\/1\/\d{5}$/.test(doi), r.body);
  r = await call("POST", `/production/manuscripts/${msId}/publish`, { token: mgr.token, json: { issue_id: issueId } });
  check("cannot publish twice (409)", r.status === 409);
  r = await call("GET", `/author/manuscripts/${msId}`, { token: author.token });
  check("author sees PUBLISHED + DOI", r.data.status === "PUBLISHED" && r.data.article?.doi === doi);
  const trail = r.data.timeline.map((e) => e.event_type);
  check("timeline covers the whole workflow", ["SUBMITTED", "SENT_TO_REVIEW", "DECISION", "REVISION_SUBMITTED", "PROOF_SENT", "PUBLISHED"].every((t) => trail.includes(t)), trail);

  console.log("\n[public site: issue, article, citations]  FR-JM-006/008");
  r = await call("GET", "/public/issues/current");
  check("current issue lists the article", r.status === 200 && r.data.articles.some((a) => a.doi === doi), r.body);
  const articleId = r.data.articles.find((a) => a.doi === doi).id;
  r = await call("GET", `/public/articles/${articleId}`);
  check("article page has DOI, ISSN, authors with affiliation", r.data.doi === doi && r.data.issn === "2049-3630" && r.data.authors.some((a) => a.affiliation === "Jimma University"), r.body);
  for (const style of ["apa", "mla", "chicago", "harvard", "ris", "bibtex"]) {
    r = await call("GET", `/public/articles/${articleId}/cite?style=${style}`);
    check(`citation (${style}) contains the DOI`, r.status === 200 && r.data.citation.includes(doi), r.body);
  }
  r = await call("GET", `/public/articles/${articleId}/cite?style=bibtex&download=1`, { raw: true });
  check("BibTeX download", r.status === 200 && /attachment/.test(r.headers.get("content-disposition") || "") && (await r.text()).startsWith("@article"));
  r = await call("GET", `/public/articles/${articleId}/cite?style=nonsense`);
  check("unknown citation style rejected", r.status === 422);
  r = await call("GET", `/public/articles/${articleId}/pdf`, { raw: true });
  check("public PDF served", r.status === 200 && /pdf/.test(r.headers.get("content-type")));
  r = await call("GET", "/public/articles?search=Gadaa");
  check("article search", r.data.some((a) => a.id === articleId));
  r = await call("GET", "/public/journals/journal-of-oromo-research");
  check("journal page with ISSN", r.status === 200 && r.data.issn === "2049-3630");
  await call("PUT", `/production/issues/${issueId}`, { token: mgr.token, json: { volume: 99, issue_number: 1, status: "DRAFT" } });
  r = await call("GET", `/public/articles/${articleId}`);
  check("articles of unpublished issues are hidden", r.status === 404);
  await call("PUT", `/production/issues/${issueId}`, { token: mgr.token, json: { volume: 99, issue_number: 1, status: "PUBLISHED" } });
  r = await call("DELETE", `/production/issues/${issueId}`, { token: mgr.token });
  check("issue with articles cannot be deleted (409)", r.status === 409);

  console.log("\n[journal manager & admin]");
  r = await call("POST", "/admin/categories", { token: mgr.token, json: { name: `Cat ${tag}`, slug: `cat-${tag}`, description: "d" } });
  check("category created", r.status === 201);
  const catId = r.data.id;
  r = await call("POST", "/admin/categories", { token: mgr.token, json: { name: `Other ${tag}`, slug: `cat-${tag}` } });
  check("duplicate category slug (409)", r.status === 409);
  r = await call("PUT", `/admin/categories/${catId}`, { token: mgr.token, json: { name: `Cat ${tag}`, slug: `cat-${tag}`, status: "HIDDEN", parent_id: catId } });
  check("category cannot be its own parent (409)", r.status === 409);
  r = await call("DELETE", `/admin/categories/${category.id}`, { token: mgr.token });
  check("category in use cannot be deleted (409)", r.status === 409, r.body);
  r = await call("DELETE", `/admin/categories/${catId}`, { token: mgr.token });
  check("unused category deleted", r.status === 200);
  r = await call("POST", "/admin/article-types", { token: mgr.token, json: { name: `Type ${tag}`, description: "x" } });
  check("article type created", r.status === 201);
  r = await call("POST", "/admin/article-types", { token: mgr.token, json: { name: `type ${tag}` } });
  check("duplicate article type is case-insensitive (409)", r.status === 409);
  r = await call("PUT", `/admin/journals/${journal.id}`, { token: mgr.token, json: { title: "Journal of Oromo Research", issn: "1234-56", is_active: true } });
  check("invalid ISSN rejected (FR-JM-006)", r.status === 422);
  r = await call("PUT", `/admin/journals/${journal.id}`, { token: mgr.token, json: { title: "Journal of Oromo Research", issn: "2049-3630", e_issn: "2049-3648", apc_amount: 100, is_active: true } });
  check("journal ISSN saved", r.status === 200);
  r = await call("GET", "/admin/messages?status=UNREAD", { token: mgr.token });
  const msg = r.data.find((m) => m.email === `visitor.${tag}@test.ora`);
  check("contact message arrives unread", !!msg);
  r = await call("GET", `/admin/messages/${msg.id}`, { token: mgr.token });
  check("opening a message marks it read", r.data.status === "READ" && r.data.body.includes("submit a manuscript"));
  r = await call("PATCH", `/admin/messages/${msg.id}`, { token: mgr.token, json: { status: "ARCHIVED" } });
  check("message archived", r.status === 200);
  r = await call("GET", "/admin/categories", { token: ae.token });
  check("editor cannot use admin API (403)", r.status === 403);

  console.log("\n[dashboards & reports]");
  for (const [who, path] of [[author, "/author/dashboard"], [ae, "/editorial/dashboard"], [ae, "/editorial/reports"], [rev1, "/reviewer/dashboard"], [mgr, "/production/dashboard"], [mgr, "/production/reports"], [mgr, "/admin/dashboard"], [mgr, "/production/published"], [mgr, "/production/fees"]]) {
    r = await call("GET", path, { token: who.token });
    check(`GET ${path}`, r.status === 200 && r.body.success === true, r.body);
  }
  r = await call("GET", "/author/dashboard", { token: author.token });
  check("author dashboard shows 1 published", r.data.published === 1 && r.data.total === 1, r.data);

  console.log("\n[misc]");
  r = await call("GET", "/author/manuscripts/not-a-uuid", { token: author.token });
  check("bad id -> 422", r.status === 422);
  r = await call("GET", "/nope", { token: author.token });
  check("unknown route -> 404 JSON", r.status === 404 && r.body.success === false);
  r = await call("POST", "/author/manuscripts", { token: author.token, json: "{bad" });
  check("malformed body handled", r.status >= 400 && r.status < 500);

  await pool.query(`UPDATE jms.journals SET apc_amount = $2 WHERE id=$1`, [journal.id, journal.apc_amount]);
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) console.log("Failures:\n - " + failures.join("\n - "));
  return failed;
}

let code = 1;
try { code = (await main()) ? 1 : 0; }
catch (e) { console.error("Test crashed:", e); }
finally { await cleanup().catch((e) => console.error("cleanup failed", e)); await pool.end(); }
process.exit(code);
