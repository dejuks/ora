import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { one, query } from "../config/db.js";
import { UPLOAD_DIR } from "../lib/files.js";
import { cite, type CiteStyle } from "../lib/citation.js";
import { HttpError, idParam, notFound, ok, parse } from "../lib/http.js";

const r = Router();

const ARTICLE_SQL = `
  SELECT a.id, a.doi, a.pages, a.article_number, a.license, a.status, a.published_at, a.issn, a.correction_note,
         m.title, m.abstract, m.keywords, m.manuscript_no,
         j.id AS journal_id, j.title AS journal_title, j.slug AS journal_slug, j.code AS journal_code,
         i.id AS issue_id, i.volume, i.issue_number, i.title AS issue_title,
         c.name AS category, t.name AS article_type,
         COALESCE((SELECT json_agg(json_build_object('name', x.full_name, 'affiliation', x.affiliation, 'orcid', x.orcid)
                                   ORDER BY x.position)
                   FROM jms.manuscript_authors x WHERE x.manuscript_id = m.id), '[]') AS authors
  FROM jms.articles a
  JOIN jms.manuscripts m ON m.id = a.manuscript_id
  JOIN jms.journals j ON j.id = a.journal_id
  JOIN jms.issues i ON i.id = a.issue_id
  LEFT JOIN jms.categories c ON c.id = m.category_id
  LEFT JOIN jms.article_types t ON t.id = m.article_type_id
  WHERE i.status = 'PUBLISHED'`;

r.get("/journals", async (_req, res) => {
  const rows = await query(
    `SELECT j.id, j.code, j.title, j.slug, j.description, j.issn, j.e_issn, j.publisher, j.cover_url,
            (SELECT count(*) FROM jms.articles a JOIN jms.issues i ON i.id=a.issue_id
              WHERE a.journal_id=j.id AND i.status='PUBLISHED') AS article_count,
            (SELECT json_build_object('id', i.id, 'volume', i.volume, 'issue_number', i.issue_number,
                                      'publication_date', i.publication_date)
               FROM jms.issues i WHERE i.journal_id=j.id AND i.status='PUBLISHED'
               ORDER BY i.volume DESC, i.issue_number DESC LIMIT 1) AS latest_issue
     FROM jms.journals j WHERE j.is_active ORDER BY j.title`
  );
  res.json(ok(rows));
});

r.get("/journals/:slug", async (req, res) => {
  const j = await one(
    `SELECT id, code, title, slug, description, aims_scope, issn, e_issn, publisher, language, review_model, cover_url
     FROM jms.journals WHERE slug = $1 AND is_active`,
    [req.params.slug]
  );
  if (!j) throw notFound("Journal");
  const staff = await query(
    `SELECT id, full_name, position, affiliation, photo_url FROM jms.journal_staff
     WHERE journal_id = $1 AND is_public ORDER BY display_order, full_name`,
    [j.id]
  );
  res.json(ok({ ...j, staff }));
});

r.get("/issues", async (req, res) => {
  const journalId = typeof req.query.journal_id === "string" ? req.query.journal_id : null;
  const rows = await query(
    `SELECT i.id, i.volume, i.issue_number, i.title, i.description, i.cover_url, i.publication_date,
            j.title AS journal_title, j.issn,
            (SELECT count(*) FROM jms.articles a WHERE a.issue_id = i.id) AS article_count
     FROM jms.issues i JOIN jms.journals j ON j.id = i.journal_id
     WHERE i.status = 'PUBLISHED' AND ($1::uuid IS NULL OR i.journal_id = $1)
     ORDER BY i.volume DESC, i.issue_number DESC`,
    [journalId && /^[0-9a-f-]{36}$/i.test(journalId) ? journalId : null]
  );
  res.json(ok(rows));
});

async function issueWithArticles(issueId: string) {
  const issue = await one(
    `SELECT i.id, i.volume, i.issue_number, i.title, i.description, i.cover_url, i.publication_date,
            j.title AS journal_title, j.issn, j.slug AS journal_slug
     FROM jms.issues i JOIN jms.journals j ON j.id = i.journal_id
     WHERE i.id = $1 AND i.status = 'PUBLISHED'`,
    [issueId]
  );
  if (!issue) return null;
  const articles = await query(ARTICLE_SQL + ` AND a.issue_id = $1 ORDER BY a.article_number NULLS LAST, a.published_at`, [issueId]);
  return { ...issue, articles };
}

r.get("/issues/current", async (_req, res) => {
  const latest = await one(
    `SELECT id FROM jms.issues WHERE status='PUBLISHED' ORDER BY volume DESC, issue_number DESC LIMIT 1`
  );
  res.json(ok(latest ? await issueWithArticles(latest.id) : null));
});

r.get("/issues/:id", async (req, res) => {
  const data = await issueWithArticles(idParam(req));
  if (!data) throw notFound("Issue");
  res.json(ok(data));
});

r.get("/articles", async (req, res) => {
  const q = parse(z.object({ search: z.string().trim().max(200).optional(), limit: z.coerce.number().int().min(1).max(100).default(20) }), req.query);
  const rows = await query(
    ARTICLE_SQL + ` AND ($1::text IS NULL OR m.title ILIKE '%'||$1||'%' OR m.abstract ILIKE '%'||$1||'%' OR a.doi ILIKE '%'||$1||'%')
     ORDER BY a.published_at DESC LIMIT $2`,
    [q.search ?? null, q.limit]
  );
  res.json(ok(rows));
});

async function getArticle(id: string) {
  const a = await one(ARTICLE_SQL + ` AND a.id = $1`, [id]);
  if (!a) throw notFound("Article");
  return a;
}

r.get("/articles/:id", async (req, res) => {
  res.json(ok(await getArticle(idParam(req))));
});

// Citation tools: APA, MLA, Chicago, Harvard + RIS / BibTeX export (FR-JM-008)
r.get("/articles/:id/cite", async (req, res) => {
  const style = parse(z.enum(["apa", "mla", "chicago", "harvard", "ris", "bibtex"]), req.query.style ?? "apa") as CiteStyle;
  const a = await getArticle(idParam(req));
  const text = cite(
    {
      title: a.title, authors: a.authors, journal: a.journal_title, volume: a.volume,
      issue: a.issue_number, pages: a.pages, year: new Date(a.published_at).getFullYear(), doi: a.doi, issn: a.issn,
    },
    style
  );
  if (req.query.download === "1" && (style === "ris" || style === "bibtex")) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="citation.${style === "ris" ? "ris" : "bib"}"`);
    res.send(text);
    return;
  }
  res.json(ok({ style, citation: text }));
});

r.get("/articles/:id/pdf", async (req, res) => {
  const a = await getArticle(idParam(req));
  const f = await one(
    `SELECT f.stored_name, f.original_name, f.mime_type FROM jms.manuscript_files f
     JOIN jms.articles x ON x.manuscript_id = f.manuscript_id
     WHERE x.id = $1 AND f.kind IN ('FINAL_PDF','PROOF')
     ORDER BY (f.kind = 'FINAL_PDF') DESC, f.created_at DESC LIMIT 1`,
    [a.id]
  );
  if (!f) throw notFound("PDF");
  const file = path.join(UPLOAD_DIR, f.stored_name);
  if (!fs.existsSync(file)) throw notFound("PDF");
  res.setHeader("Content-Type", f.mime_type || "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(f.original_name)}"`);
  fs.createReadStream(file).pipe(res);
});

r.get("/categories", async (_req, res) => {
  res.json(ok(await query(
    `SELECT id, parent_id, name, slug, description FROM jms.categories
     WHERE status='ACTIVE' AND visible ORDER BY display_order, name`)));
});

r.get("/article-types", async (_req, res) => {
  res.json(ok(await query(`SELECT id, name, description FROM jms.article_types WHERE status='ACTIVE' ORDER BY name`)));
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(3).max(255),
  message: z.string().trim().min(10).max(5000),
});
r.post("/contact", async (req, res) => {
  const b = parse(contactSchema, req.body);
  await query(`INSERT INTO jms.contact_messages (name, email, subject, body) VALUES ($1,$2,$3,$4)`,
    [b.name, b.email, b.subject, b.message]);
  res.status(201).json(ok(null, "Thank you. Your message has been sent."));
});

// ---------------------------------------------------------------- announcements
r.get("/announcements", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json(ok(await query(
    `SELECT a.id, a.title, a.body, a.published_at, j.slug AS journal_slug
     FROM jms.announcements a JOIN jms.journals j ON j.id=a.journal_id
     WHERE a.is_published ORDER BY a.published_at DESC, a.created_at DESC LIMIT $1`, [limit])));
});
r.get("/announcements/:id", async (req, res) => {
  const a = await one(
    `SELECT id, title, body, published_at FROM jms.announcements WHERE id=$1 AND is_published`, [idParam(req)]);
  if (!a) throw notFound("Announcement");
  res.json(ok(a));
});

export default r;
export { HttpError };
