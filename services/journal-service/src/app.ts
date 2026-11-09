import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pool } from "./config/db.js";
import { HttpError } from "./lib/http.js";
import { authenticate } from "./middleware/auth.js";
import publicRoutes from "./routes/public.js";
import authorRoutes from "./routes/author.js";
import editorialRoutes from "./routes/editorial.js";
import reviewerRoutes from "./routes/reviewer.js";
import productionRoutes from "./routes/production.js";
import adminRoutes from "./routes/admin.js";
import fileRoutes from "./routes/files.js";

const app = express();
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  exposedHeaders: ["Content-Disposition", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
}));
app.use(express.json({ limit: "1mb" }));

// SRS 6.4.1 rate limits (per IP): public 100/min, authenticated 1000/min, submissions 10/min, uploads 20/min
const limiter = (limit: number) =>
  rateLimit({ windowMs: 60_000, limit, standardHeaders: "draft-7", legacyHeaders: false,
    handler: (_q, res) => { res.status(429).json({ success: false, message: "Too many requests. Please slow down." }); },
    skip: () => process.env.DISABLE_RATE_LIMIT === "1" });

app.get("/api/v1/jms/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ success: true, application: "ORA Journal Service", status: "running", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ success: false, application: "ORA Journal Service", status: "unavailable", database: "disconnected" });
  }
});

const api = express.Router();
api.use("/public", limiter(100), publicRoutes);

const secured = express.Router();
secured.use(authenticate, limiter(1000));
secured.post(/\/author\/manuscripts\/[^/]+\/submit$/, limiter(10));
secured.post(/\/(files|proofs|revise)$/, limiter(20));
secured.use("/author", authorRoutes);
secured.use("/editorial", editorialRoutes);
secured.use("/reviewer", reviewerRoutes);
secured.use("/production", productionRoutes);
secured.use("/admin", adminRoutes);
secured.use("/files", fileRoutes);
api.use(secured);

app.use("/api/v1/jms", api);
app.use((_req, res) => { res.status(404).json({ success: false, message: "API endpoint not found." }); });

// Central error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message, errors: err.details });
    return;
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ success: false, message: `File is too large (max ${process.env.MAX_UPLOAD_MB || 10} MB).` });
    return;
  }
  if (err?.name === "MulterError") {
    res.status(422).json({ success: false, message: err.message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Malformed JSON body." });
    return;
  }
  if (err?.code === "23505") { res.status(409).json({ success: false, message: "That record already exists." }); return; }
  if (err?.code === "23503") { res.status(409).json({ success: false, message: "That record is still in use." }); return; }
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
});

export default app;
