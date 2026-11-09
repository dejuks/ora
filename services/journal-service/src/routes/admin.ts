import { Router } from "express";
import { z } from "zod";
import { one, query } from "../config/db.js";
import { conflict, idParam, notFound, ok, parse, uuid } from "../lib/http.js";
import { MANAGERS, requireRole } from "../middleware/auth.js";

const r = Router();
r.use(requireRole(...MANAGERS));

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const issn = z.string().trim().regex(/^[0-9]{4}-[0-9]{3}[0-9Xx]$/, "ISSN must be 8 digits like 1234-5678").optional().nullable().or(z.literal("").transform(() => null));

// ---------------------------------------------------------------- journals (FR-JM-006)
const journalSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,20}$/, "Use 2-20 letters or digits."),
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  aims_scope: z.string().trim().max(10000).optional().nullable(),
  issn, e_issn: issn,
  publisher: z.string().trim().max(255).optional().default("Oromo Research Association"),
  language: z.string().trim().max(50).optional().default("English"),
  review_model: z.enum(["DOUBLE_BLIND", "SINGLE_BLIND", "OPEN"]).optional().default("DOUBLE_BLIND"),
  apc_amount: z.coerce.number().min(0).max(100000).optional().default(0),
  apc_currency: z.string().trim().toUpperCase().length(3).optional().default("USD"),
  is_active: z.boolean().optional().default(true),
});

r.get("/journals", async (_req, res) => res.json(ok(await query(`SELECT * FROM jms.journals ORDER BY title`))));

r.post("/journals", async (req, res) => {
  const b = parse(journalSchema, req.body);
  const slug = slugify(b.title);
  if (await one(`SELECT 1 AS x FROM jms.journals WHERE code=$1 OR slug=$2`, [b.code, slug])) throw conflict("A journal with this code or title already exists.");
  const row = await one(
    `INSERT INTO jms.journals (code, title, slug, description, aims_scope, issn, e_issn, publisher, language, review_model, apc_amount, apc_currency, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [b.code, b.title, slug, b.description ?? null, b.aims_scope ?? null, b.issn ?? null, b.e_issn ?? null, b.publisher, b.language, b.review_model, b.apc_amount, b.apc_currency, b.is_active]);
  res.status(201).json(ok(row, "Journal created."));
});

r.put("/journals/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(journalSchema.omit({ code: true }), req.body);
  if (!(await one(`SELECT 1 AS x FROM jms.journals WHERE id=$1`, [id]))) throw notFound("Journal");
  await query(
    `UPDATE jms.journals SET title=$2, description=$3, aims_scope=$4, issn=$5, e_issn=$6, publisher=$7, language=$8,
            review_model=$9, apc_amount=$10, apc_currency=$11, is_active=$12 WHERE id=$1`,
    [id, b.title, b.description ?? null, b.aims_scope ?? null, b.issn ?? null, b.e_issn ?? null, b.publisher, b.language, b.review_model, b.apc_amount, b.apc_currency, b.is_active]);
  res.json(ok(null, "Journal updated."));
});

// Editorial board
const staffSchema = z.object({
  user_id: uuid.optional().nullable(),
  full_name: z.string().trim().min(2).max(200),
  position: z.string().trim().min(2).max(60),
  affiliation: z.string().trim().max(255).optional().nullable(),
  photo_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("").transform(() => null)),
  display_order: z.coerce.number().int().min(0).max(999).optional().default(0),
  is_public: z.boolean().optional().default(true),
});
r.get("/journals/:id/staff", async (req, res) =>
  res.json(ok(await query(`SELECT * FROM jms.journal_staff WHERE journal_id=$1 ORDER BY display_order, full_name`, [idParam(req)]))));
r.post("/journals/:id/staff", async (req, res) => {
  const b = parse(staffSchema, req.body);
  const row = await one(
    `INSERT INTO jms.journal_staff (journal_id, user_id, full_name, position, affiliation, photo_url, display_order, is_public)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [idParam(req), b.user_id ?? null, b.full_name, b.position, b.affiliation ?? null, b.photo_url ?? null, b.display_order, b.is_public]);
  res.status(201).json(ok(row, "Added to the editorial board."));
});
r.put("/staff/:id", async (req, res) => {
  const b = parse(staffSchema, req.body);
  const n = await query(
    `UPDATE jms.journal_staff SET user_id=$2, full_name=$3, position=$4, affiliation=$5, photo_url=$6, display_order=$7, is_public=$8 WHERE id=$1 RETURNING id`,
    [idParam(req), b.user_id ?? null, b.full_name, b.position, b.affiliation ?? null, b.photo_url ?? null, b.display_order, b.is_public]);
  if (!n.length) throw notFound("Board member");
  res.json(ok(null, "Updated."));
});
r.delete("/staff/:id", async (req, res) => {
  await query(`DELETE FROM jms.journal_staff WHERE id=$1`, [idParam(req)]);
  res.json(ok(null, "Removed."));
});

// ---------------------------------------------------------------- categories
const categorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().max(150).optional(),
  parent_id: uuid.optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "HIDDEN"]).optional().default("ACTIVE"),
  display_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
  visible: z.boolean().optional().default(true),
});

r.get("/categories", async (_req, res) => res.json(ok(await query(
  `SELECT c.*, p.name AS parent_name, (SELECT count(*)::int FROM jms.manuscripts m WHERE m.category_id = c.id) AS manuscript_count
   FROM jms.categories c LEFT JOIN jms.categories p ON p.id = c.parent_id ORDER BY c.display_order, c.name`))));

r.post("/categories", async (req, res) => {
  const b = parse(categorySchema, req.body);
  const slug = slugify(b.slug || b.name);
  if (await one(`SELECT 1 AS x FROM jms.categories WHERE slug=$1`, [slug])) throw conflict("This URL slug is already used.");
  const row = await one(
    `INSERT INTO jms.categories (name, slug, parent_id, description, status, display_order, visible) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [b.name, slug, b.parent_id ?? null, b.description ?? null, b.status, b.display_order, b.visible]);
  res.status(201).json(ok(row, "Category created."));
});

r.put("/categories/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(categorySchema, req.body);
  const slug = slugify(b.slug || b.name);
  if (b.parent_id === id) throw conflict("A category cannot be its own parent.");
  if (await one(`SELECT 1 AS x FROM jms.categories WHERE slug=$1 AND id<>$2`, [slug, id])) throw conflict("This URL slug is already used.");
  const n = await query(
    `UPDATE jms.categories SET name=$2, slug=$3, parent_id=$4, description=$5, status=$6, display_order=$7, visible=$8 WHERE id=$1 RETURNING id`,
    [id, b.name, slug, b.parent_id ?? null, b.description ?? null, b.status, b.display_order, b.visible]);
  if (!n.length) throw notFound("Category");
  res.json(ok(null, "Category updated."));
});

r.delete("/categories/:id", async (req, res) => {
  const id = idParam(req);
  const used = (await one(`SELECT count(*)::int AS n FROM jms.manuscripts WHERE category_id=$1`, [id]))!.n;
  if (used) throw conflict(`${used} manuscript(s) use this category. Hide it instead of deleting.`);
  await query(`DELETE FROM jms.categories WHERE id=$1`, [id]);
  res.json(ok(null, "Category deleted."));
});

// ---------------------------------------------------------------- article types
const typeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

r.get("/article-types", async (_req, res) => res.json(ok(await query(
  `SELECT t.*, (SELECT count(*)::int FROM jms.manuscripts m WHERE m.article_type_id = t.id) AS manuscript_count
   FROM jms.article_types t ORDER BY t.name`))));

r.post("/article-types", async (req, res) => {
  const b = parse(typeSchema, req.body);
  if (await one(`SELECT 1 AS x FROM jms.article_types WHERE lower(name)=lower($1)`, [b.name])) throw conflict("This article type already exists.");
  const row = await one(`INSERT INTO jms.article_types (name, description, status) VALUES ($1,$2,$3) RETURNING id`, [b.name, b.description ?? null, b.status]);
  res.status(201).json(ok(row, "Article type created."));
});

r.put("/article-types/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(typeSchema, req.body);
  if (await one(`SELECT 1 AS x FROM jms.article_types WHERE lower(name)=lower($1) AND id<>$2`, [b.name, id])) throw conflict("This article type already exists.");
  const n = await query(`UPDATE jms.article_types SET name=$2, description=$3, status=$4 WHERE id=$1 RETURNING id`, [id, b.name, b.description ?? null, b.status]);
  if (!n.length) throw notFound("Article type");
  res.json(ok(null, "Article type updated."));
});

r.delete("/article-types/:id", async (req, res) => {
  const id = idParam(req);
  const used = (await one(`SELECT count(*)::int AS n FROM jms.manuscripts WHERE article_type_id=$1`, [id]))!.n;
  if (used) throw conflict(`${used} manuscript(s) use this type. Set it to inactive instead.`);
  await query(`DELETE FROM jms.article_types WHERE id=$1`, [id]);
  res.json(ok(null, "Article type deleted."));
});

// ---------------------------------------------------------------- contact messages
r.get("/messages", async (req, res) => {
  const status = typeof req.query.status === "string" && req.query.status !== "ALL" ? req.query.status.toUpperCase() : null;
  res.json(ok(await query(
    `SELECT id, name, email, subject, status, created_at, left(body, 160) AS preview FROM jms.contact_messages
     WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC LIMIT 200`, [status])));
});
r.get("/messages/:id", async (req, res) => {
  const m = await one(`UPDATE jms.contact_messages SET status = CASE WHEN status='UNREAD' THEN 'READ' ELSE status END WHERE id=$1 RETURNING *`, [idParam(req)]);
  if (!m) throw notFound("Message");
  res.json(ok(m));
});
r.patch("/messages/:id", async (req, res) => {
  const b = parse(z.object({ status: z.enum(["UNREAD", "READ", "ARCHIVED"]) }), req.body);
  const n = await query(`UPDATE jms.contact_messages SET status=$2 WHERE id=$1 RETURNING id`, [idParam(req), b.status]);
  if (!n.length) throw notFound("Message");
  res.json(ok(null, "Message updated."));
});
r.delete("/messages/:id", async (req, res) => {
  await query(`DELETE FROM jms.contact_messages WHERE id=$1`, [idParam(req)]);
  res.json(ok(null, "Message deleted."));
});

// ---------------------------------------------------------------- announcements
const annSchema = z.object({
  title: z.string().trim().min(3).max(255),
  body: z.string().trim().min(3).max(20000),
  is_published: z.boolean().optional().default(true),
  published_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
r.get("/announcements", async (_req, res) => {
  res.json(ok(await query(`SELECT * FROM jms.announcements ORDER BY published_at DESC, created_at DESC`)));
});
r.post("/announcements", async (req, res) => {
  const b = parse(annSchema, req.body);
  const j = await one<{ id: string }>(`SELECT id FROM jms.journals WHERE is_active ORDER BY created_at LIMIT 1`);
  if (!j) throw notFound("Journal");
  const row = await one(
    `INSERT INTO jms.announcements (journal_id, title, body, is_published, published_at, created_by)
     VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6) RETURNING *`,
    [j.id, b.title, b.body, b.is_published, b.published_at ?? null, req.auth?.userId ?? null]);
  res.status(201).json(ok(row, "Announcement created."));
});
r.put("/announcements/:id", async (req, res) => {
  const b = parse(annSchema, req.body);
  const row = await one(
    `UPDATE jms.announcements SET title=$2, body=$3, is_published=$4,
            published_at=COALESCE($5::date, published_at), updated_at=now() WHERE id=$1 RETURNING *`,
    [idParam(req), b.title, b.body, b.is_published, b.published_at ?? null]);
  if (!row) throw notFound("Announcement");
  res.json(ok(row, "Announcement updated."));
});
r.delete("/announcements/:id", async (req, res) => {
  await query(`DELETE FROM jms.announcements WHERE id=$1`, [idParam(req)]);
  res.json(ok(null, "Announcement deleted."));
});

r.get("/dashboard", async (_req, res) => {
  const s = await one(
    `SELECT (SELECT count(*)::int FROM jms.manuscripts WHERE status<>'DRAFT') AS manuscripts,
            (SELECT count(*)::int FROM jms.articles) AS published,
            (SELECT count(*)::int FROM jms.categories) AS categories,
            (SELECT count(*)::int FROM jms.article_types) AS article_types,
            (SELECT count(*)::int FROM jms.contact_messages WHERE status='UNREAD') AS unread_messages,
            (SELECT count(*)::int FROM jms.journals WHERE is_active) AS journals`);
  res.json(ok(s));
});

export default r;
