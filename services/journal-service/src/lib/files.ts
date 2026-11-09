import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { HttpError } from "./http.js";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const ALLOWED: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".zip": ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".csv": ["text/csv", "application/vnd.ms-excel", "text/plain"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
};

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED[ext]) return cb(new HttpError(415, `File type "${ext || "unknown"}" is not allowed. Use PDF or DOCX.`));
    cb(null, true);
  },
});

/** Check the file content really matches its extension (not just the name the browser sent). */
export function verifyMagic(filePath: string, originalName: string): void {
  const ext = path.extname(originalName).toLowerCase();
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  const head = buf.toString("latin1");
  const isZip = head.startsWith("PK");
  const bad =
    (ext === ".pdf" && !head.startsWith("%PDF")) ||
    ([".docx", ".xlsx", ".zip"].includes(ext) && !isZip) ||
    (ext === ".doc" && !(buf[0] === 0xd0 && buf[1] === 0xcf)) ||
    (ext === ".png" && buf[0] !== 0x89) ||
    ([".jpg", ".jpeg"].includes(ext) && !(buf[0] === 0xff && buf[1] === 0xd8));
  if (bad) {
    fs.rmSync(filePath, { force: true });
    throw new HttpError(415, `"${originalName}" does not look like a valid ${ext} file.`);
  }
}

export function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function removeQuietly(filePath?: string) {
  if (filePath) fs.rmSync(filePath, { force: true });
}
