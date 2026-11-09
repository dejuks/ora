import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" }
    : undefined,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

/** Send an e-mail. Never throws: a mail failure must not break a workflow step. */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "ORA Journals <no-reply@ora.local>",
      to,
      subject,
      text,
    });
    return true;
  } catch (e: any) {
    console.warn(`[mail] could not deliver "${subject}" to ${to}: ${e?.message ?? e}`);
    return false;
  }
}
