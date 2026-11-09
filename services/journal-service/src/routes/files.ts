import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { one } from "../config/db.js";
import { UPLOAD_DIR } from "../lib/files.js";
import { forbidden, idParam, notFound } from "../lib/http.js";
import { EDITORS, hasRole } from "../middleware/auth.js";

const r = Router();

/** Download a stored file. Access depends on who is asking (and keeps double-blind review blind). */
r.get("/:id/download", async (req, res) => {
  const a = req.auth!;
  const f = await one(
    `SELECT f.id, f.kind, f.round, f.stored_name, f.original_name, f.mime_type, f.manuscript_id,
            m.submitted_by
     FROM jms.manuscript_files f JOIN jms.manuscripts m ON m.id = f.manuscript_id WHERE f.id = $1`,
    [idParam(req)]);
  if (!f) throw notFound("File");

  let allowed = hasRole(a, ...EDITORS) || f.submitted_by === a.userId;
  if (!allowed && hasRole(a, "REVIEWER") && ["MANUSCRIPT", "REVISION", "SUPPLEMENTARY"].includes(f.kind)) {
    const ra = await one(
      `SELECT 1 AS x FROM jms.review_assignments WHERE manuscript_id=$1 AND round=$2 AND reviewer_id=$3
       AND status IN ('ACCEPTED','COMPLETED')`, [f.manuscript_id, f.round, a.userId]);
    allowed = !!ra;
  }
  if (!allowed) throw forbidden();

  const file = path.join(UPLOAD_DIR, f.stored_name);
  if (!fs.existsSync(file)) throw notFound("File");
  res.setHeader("Content-Type", f.mime_type || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  fs.createReadStream(file).pipe(res);
});

export default r;
