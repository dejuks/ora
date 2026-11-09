/**
 * Demo journal content: one published issue (Vol. 1, No. 1) with 6 articles,
 * each with a real PDF, plus a sample announcement. Idempotent.
 * Run `npm run seed` first (needs jms.author + jms.manager), then:
 *
 *   npm run seed:demo
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const envFile = new URL("../.env", import.meta.url);
const envText = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const fromFile = (k) => envText.match(new RegExp(`^${k}=("?)(.*)\\1$`, "m"))?.[2];
const DATABASE_URL = process.env.DATABASE_URL || fromFile("DATABASE_URL");
if (!DATABASE_URL) { console.error("DATABASE_URL is not set (services/journal-service/.env)."); process.exit(1); }
const UPLOAD_DIR = path.resolve(new URL("..", import.meta.url).pathname, process.env.UPLOAD_DIR || fromFile("UPLOAD_DIR") || "./uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const YEAR = new Date().getFullYear();
const VOLUME = 1, ISSUE = 1;
const PUB_DATE = `${YEAR}-01-15`;

const ARTICLES = [
  { title: "Gadaa Governance and Contemporary Democratic Practice in Borana", cat: "Society & Governance", type: "Original Research", pages: "1-18",
    keywords: ["Gadaa", "democracy", "Borana", "indigenous governance"],
    authors: [["Dr. Bekele Jaldessa", "Oromo Studies Centre, Addis Ababa"], ["Dr. Halima Guyo", "Borana Zone Cultural Bureau"]],
    abstract: "This study examines how the Gadaa system of age-grade governance continues to shape deliberation, conflict resolution and leadership succession among the Borana Oromo. Drawing on fieldwork in three districts, we show how assembly practices coexist with state administrative structures and discuss implications for plural democratic models." },
  { title: "Oral Poetry and Collective Memory among the Guji Oromo", cat: "History & Heritage", type: "Original Research", pages: "19-40",
    keywords: ["oral poetry", "memory", "Guji", "folklore"],
    authors: [["Dr. Tigist Wako", "Department of Literature, Bule Hora University"]],
    abstract: "Oral poetry is a primary vehicle through which Guji communities transmit history, ethics and identity. Using a corpus of recorded praise songs and laments, the article analyses recurring images and the social settings in which memory is performed and contested." },
  { title: "Afaan Oromo Orthography: A Quarter Century of Qubee in Education", cat: "Language & Linguistics", type: "Review Article", pages: "41-62",
    keywords: ["Afaan Oromo", "Qubee", "orthography", "language policy"],
    authors: [["Dr. Daniel Kumsa", "Institute of Linguistics, Jimma University"], ["Prof. Mulu Lemma", "Institute of Linguistics, Jimma University"]],
    abstract: "Since the adoption of the Latin-based Qubee script, Afaan Oromo has expanded rapidly as a language of instruction. This review synthesises two and a half decades of research on spelling standardisation, textbook production and teacher preparation, and identifies open questions for corpus planning." },
  { title: "Irreecha and the Politics of Cultural Heritage in Ethiopia", cat: "History & Heritage", type: "Case Study", pages: "63-80",
    keywords: ["Irreecha", "heritage", "ritual", "public space"],
    authors: [["Dr. Fikadu Teshome", "School of Anthropology, Addis Ababa University"]],
    abstract: "Irreecha, the thanksgiving festival of the Oromo, has become a prominent site of cultural expression and public debate. This case study traces how the festival is organised, represented and regulated, and how participants articulate meanings of belonging." },
  { title: "Pastoral Mobility and Climate Adaptation in Southern Oromia", cat: "Society & Governance", type: "Original Research", pages: "81-104",
    keywords: ["pastoralism", "climate adaptation", "mobility", "rangeland"],
    authors: [["Dr. Ayantu Roba", "Dryland Research Unit, Haramaya University"], ["Dr. Jarso Dabasa", "Dryland Research Unit, Haramaya University"], ["Gemechu Ali", "Independent researcher"]],
    abstract: "Recurrent drought has altered seasonal herd movement across southern Oromia. Combining household surveys with participatory mapping, we document changes in grazing routes and customary water-access rules, and argue that mobility remains the core adaptive strategy." },
  { title: "Women's Leadership in Siiqqee Institutions: An Ethnographic Study", cat: "Society & Governance", type: "Original Research", pages: "105-124",
    keywords: ["Siiqqee", "gender", "women's leadership", "ethnography"],
    authors: [["Dr. Birtukan Daba", "Gender Studies Programme, Ambo University"]],
    abstract: "The Siiqqee institution gives Oromo women a recognised sphere of authority and collective protection. This ethnographic study explores how women leaders mediate disputes and how the institution is being reinterpreted by younger generations." },
];

const ANNOUNCEMENT = {
  title: "Call for Manuscripts: Volume 1, Issue 2",
  body: "The Journal of Oromo Research invites original research, review articles, case studies and short communications on all aspects of Oromo history, language, culture, society and development.\n\nSubmissions are accepted year-round through our online system. All manuscripts undergo double-blind peer review. Please read the Author Guidelines before submitting.",
};

/* ---- minimal valid PDF writer (Helvetica, A4) ---- */
function wrap(text, n = 88) {
  const out = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      if ((line + " " + w).trim().length > n) { out.push(line); line = w; } else line = (line + " " + w).trim();
    }
    out.push(line);
  }
  return out;
}
const esc = (s) => s.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?");
function makePdf(lines) {
  const content = ["BT", "/F1 11 Tf", "14 TL", "56 780 Td"];
  for (const l of lines) {
    if (l.startsWith("# ")) content.push("/F2 15 Tf", `(${esc(l.slice(2))}) Tj T*`, "/F1 11 Tf");
    else content.push(`(${esc(l)}) Tj T*`);
  }
  content.push("ET");
  const stream = content.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n"; const off = [];
  objs.forEach((o, i) => { off.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const q = (t, p) => pool.query(t, p);

try {
  const journal = (await q(`SELECT id, code, title FROM jms.journals WHERE is_active ORDER BY created_at LIMIT 1`)).rows[0];
  if (!journal) throw new Error("No journal found. Run ./scripts/setup.sh first.");
  const userId = async (u) => (await q(`SELECT id FROM iam.users WHERE username=$1`, [u])).rows[0]?.id;
  const author = await userId("jms.author"), manager = await userId("jms.manager");
  if (!author || !manager) throw new Error("Demo users missing. Run `npm run seed` first.");

  let issue = (await q(`SELECT id FROM jms.issues WHERE journal_id=$1 AND volume=$2 AND issue_number=$3`, [journal.id, VOLUME, ISSUE])).rows[0];
  if (!issue) {
    issue = (await q(
      `INSERT INTO jms.issues (journal_id, volume, issue_number, title, description, publication_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,'PUBLISHED') RETURNING id`,
      [journal.id, VOLUME, ISSUE, "Inaugural Issue", "The inaugural issue of the Journal of Oromo Research.", PUB_DATE])).rows[0];
  } else {
    await q(`UPDATE jms.issues SET status='PUBLISHED', publication_date=COALESCE(publication_date,$2) WHERE id=$1`, [issue.id, PUB_DATE]);
  }

  let created = 0;
  for (const a of ARTICLES) {
    if ((await q(`SELECT 1 FROM jms.manuscripts WHERE journal_id=$1 AND title=$2`, [journal.id, a.title])).rows.length) continue;
    const cat = (await q(`SELECT id FROM jms.categories WHERE name=$1`, [a.cat])).rows[0]?.id ?? null;
    const typ = (await q(`SELECT id FROM jms.article_types WHERE name=$1`, [a.type])).rows[0]?.id ?? null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const no = `ORA-${YEAR}-D${String((await client.query("SELECT nextval('jms.manuscript_seq') AS n")).rows[0].n).padStart(3, "0")}`;
      const ms = (await client.query(
        `INSERT INTO jms.manuscripts (manuscript_no, journal_id, submitted_by, title, abstract, keywords, category_id, article_type_id,
                                      data_availability, status, current_round, decision, decision_at, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'OPEN_ACCESS','PUBLISHED',1,'ACCEPT',$9,$9) RETURNING id`,
        [no, journal.id, author, a.title, a.abstract, a.keywords, cat, typ, `${YEAR - 1}-11-01`])).rows[0];
      for (const [i, [name, aff]] of a.authors.entries()) {
        await client.query(
          `INSERT INTO jms.manuscript_authors (manuscript_id, position, full_name, email, affiliation, is_corresponding)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [ms.id, i + 1, name, `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@example.org`, aff, i === 0]);
      }
      const n = (await client.query(
        `INSERT INTO jms.doi_counters (journal_id, year, volume, issue_number, last_number) VALUES ($1,$2,$3,$4,1)
         ON CONFLICT (journal_id, year, volume, issue_number) DO UPDATE SET last_number = jms.doi_counters.last_number + 1
         RETURNING last_number`, [journal.id, YEAR, VOLUME, ISSUE])).rows[0].last_number;
      const doi = `ORA/${journal.code}/${YEAR}/${VOLUME}/${ISSUE}/${String(n).padStart(5, "0")}`;
      await client.query(
        `INSERT INTO jms.articles (manuscript_id, journal_id, issue_id, article_number, pages, doi, status, published_at, published_by)
         VALUES ($1,$2,$3,$4,$5,$6,'PUBLISHED',$7,$8)`,
        [ms.id, journal.id, issue.id, String(n), a.pages, doi, PUB_DATE, manager]);

      const lines = ["# " + a.title, "", a.authors.map((x) => x[0]).join(", "), a.authors.map((x) => x[1]).join("; "), "",
        `${journal.title}, Vol. ${VOLUME}, No. ${ISSUE} (${YEAR}), pp. ${a.pages}`, `DOI: ${doi}`, "", "# Abstract", ...wrap(a.abstract), "",
        `Keywords: ${a.keywords.join(", ")}`, "", "This is a demonstration PDF generated by the ORA seed script."];
      const buf = makePdf(lines);
      const stored = crypto.randomUUID();
      fs.writeFileSync(path.join(UPLOAD_DIR, stored), buf);
      await client.query(
        `INSERT INTO jms.manuscript_files (manuscript_id, round, kind, original_name, stored_name, mime_type, size_bytes, sha256, uploaded_by)
         VALUES ($1,1,'FINAL_PDF',$2,$3,'application/pdf',$4,$5,$6)`,
        [ms.id, `${a.title.slice(0, 50).replace(/[^A-Za-z0-9]+/g, "_")}.pdf`, stored, buf.length, crypto.createHash("sha256").update(buf).digest("hex"), manager]);
      await client.query("COMMIT");
      created++;
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  }

  if (!(await q(`SELECT 1 FROM jms.announcements WHERE title=$1`, [ANNOUNCEMENT.title])).rows.length) {
    await q(`INSERT INTO jms.announcements (journal_id, title, body, is_published, published_at, created_by) VALUES ($1,$2,$3,true,CURRENT_DATE,$4)`,
      [journal.id, ANNOUNCEMENT.title, ANNOUNCEMENT.body, manager]);
  }
  const n = (await q(`SELECT count(*)::int n FROM jms.articles WHERE issue_id=$1`, [issue.id])).rows[0].n;
  console.log(`Demo content ready: Vol. ${VOLUME} No. ${ISSUE} now has ${n} published article(s) (${created} created this run).`);
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await pool.end(); }
