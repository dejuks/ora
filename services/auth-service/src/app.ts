
import "dotenv/config";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { prisma } from "./config/database.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import roleRoutes from "./modules/roles/role.routes.js";
const app = express();

// Set TRUST_PROXY=1 when running behind a reverse proxy / load balancer
// so req.ip (rate limiting, login history) is the real client address.
if (process.env.TRUST_PROXY) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.use(helmet());

app.use(
    cors({
        origin:
            process.env.FRONTEND_URL ||
            "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Accept",
        ],
    })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.get("/api/v1/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        return res.status(200).json({
            success: true,
            application: "ORA Authentication Service",
            status: "running",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch {
        return res.status(503).json({
            success: false,
            application: "ORA Authentication Service",
            status: "unavailable",
            database: "disconnected",
        });
    }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use((_req, res) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found.",
    });
});

// Last-resort error handler: malformed JSON, role-module errors, etc.
app.use(
    (
        error: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        if (error?.type === "entity.parse.failed") {
            return res.status(400).json({
                success: false,
                message: "Malformed JSON request body.",
            });
        }

        if (typeof error?.statusCode === "number" && error.statusCode < 500) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        console.error("Unhandled error:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred.",
        });
    }
);

export default app;
