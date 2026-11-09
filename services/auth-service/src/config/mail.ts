import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";

/**
 * SMTP transport.
 * Development default: Mailpit (docker compose) on localhost:1025,
 * inbox at http://localhost:8025.
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "127.0.0.1",
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
        ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD || "",
          }
        : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
});

export interface MailMessage {
    to: string;
    subject: string;
    text: string;
    html: string;
}

/**
 * Send an e-mail. Never throws: a mail failure must not break
 * registration or password reset. In development the plain-text body
 * (which contains the action link) is printed when delivery fails.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
    try {
        await transporter.sendMail({
            from:
                process.env.MAIL_FROM ||
                "ORA Platform <no-reply@ora.local>",
            ...message,
        });
        return true;
    } catch (error) {
        console.error(
            `Mail delivery to ${message.to} failed:`,
            error instanceof Error ? error.message : error
        );

        if (!isProduction) {
            console.warn(
                `[dev] Undelivered e-mail "${message.subject}":\n${message.text}`
            );
        }

        return false;
    }
}
