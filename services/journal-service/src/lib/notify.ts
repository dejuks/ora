import { one } from "../config/db.js";
import { sendMail } from "../config/mail.js";

const APP = () => process.env.FRONTEND_URL || "http://localhost:3000";

export async function userContact(userId: string) {
  return one<{ id: string; name: string; email: string }>(
    `SELECT id, first_name || ' ' || last_name AS name, email FROM iam.users WHERE id = $1`,
    [userId]
  );
}

export async function notifyUser(userId: string, subject: string, body: string, path = "") {
  const u = await userContact(userId);
  if (!u) return;
  const link = path ? `\n\nOpen: ${APP()}${path}` : "";
  await sendMail(u.email, `[ORA Journals] ${subject}`, `Dear ${u.name},\n\n${body}${link}\n\nOromo Research Association`);
}
