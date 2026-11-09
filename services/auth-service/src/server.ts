import "dotenv/config";

import app from "./app.js";
import { prisma } from "./config/database.js";

const PORT = Number(process.env.PORT || 4000);
const HOST = "0.0.0.0";

async function startServer(): Promise<void> {
    try {
        await prisma.$connect();

        const server = app.listen(PORT, HOST, () => {
            console.log("---------------------------------------");
            console.log("ORA Authentication Service");
            console.log(`Local:   http://127.0.0.1:${PORT}`);
            console.log(`Network: http://0.0.0.0:${PORT}`);
            console.log("---------------------------------------");
        });

        const shutdown = async () => {
            console.log("Shutting down authentication service...");

            server.close(async () => {
                await prisma.$disconnect();
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

    } catch (error) {
        console.error("Failed to start authentication service:", error);

        await prisma.$disconnect();
        process.exit(1);
    }
}

startServer();