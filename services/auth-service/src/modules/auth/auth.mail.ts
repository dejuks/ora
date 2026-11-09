import { sendMail } from "../../config/mail.js";

const FRONTEND_URL = (
    process.env.FRONTEND_URL || "http://localhost:3000"
).replace(/\/$/, "");

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function layout(
    title: string,
    paragraphs: string[],
    action?: { label: string; url: string }
): string {
    const body = paragraphs
        .map((p) => `<p style="margin:0 0 14px">${p}</p>`)
        .join("");

    const button = action
        ? `<p style="margin:24px 0"><a href="${action.url}" style="background:#7A1849;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#666">If the button does not work, copy this link into your browser:<br>${action.url}</p>`
        : "";

    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:560px;margin:auto;padding:24px">
<h2 style="color:#7A1849;margin-top:0">${escapeHtml(title)}</h2>${body}${button}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#888">Oromo Research Association (ORA) Digital Platform</p></div>`;
}

export const verifyEmailUrl = (token: string) =>
    `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

export const resetPasswordUrl = (token: string) =>
    `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

export function sendVerificationEmail(
    to: string,
    firstName: string,
    token: string,
    hours: number
) {
    const url = verifyEmailUrl(token);
    return sendMail({
        to,
        subject: "Verify your ORA account",
        text: `Hello ${firstName},\n\nPlease verify your email address to activate your ORA account:\n${url}\n\nThis link expires in ${hours} hours.\nIf you did not create an account you can ignore this message.`,
        html: layout(
            "Verify your email address",
            [
                `Hello ${escapeHtml(firstName)},`,
                "Thank you for registering with the ORA Digital Platform. Please verify your email address to activate your account.",
                `This link expires in ${hours} hours. If you did not create an account you can ignore this message.`,
            ],
            { label: "Verify email address", url }
        ),
    });
}

export function sendWelcomeEmail(
    to: string,
    firstName: string,
    username: string
) {
    const url = `${FRONTEND_URL}/login`;
    return sendMail({
        to,
        subject: "Your ORA account has been created",
        text: `Hello ${firstName},\n\nAn administrator created an ORA account for you.\nUsername: ${username}\nSign in here: ${url}\n\nYou will be asked to choose a new password at your first sign-in. Your temporary password is provided by the administrator.`,
        html: layout(
            "Your ORA account is ready",
            [
                `Hello ${escapeHtml(firstName)},`,
                `An administrator created an ORA account for you. Your username is <strong>${escapeHtml(username)}</strong>.`,
                "You will be asked to choose a new password at your first sign-in. Your temporary password is provided to you by the administrator.",
            ],
            { label: "Sign in", url }
        ),
    });
}

export function sendPasswordResetEmail(
    to: string,
    firstName: string,
    token: string,
    minutes: number
) {
    const url = resetPasswordUrl(token);
    return sendMail({
        to,
        subject: "Reset your ORA password",
        text: `Hello ${firstName},\n\nWe received a request to reset your ORA password:\n${url}\n\nThis link expires in ${minutes} minutes and can be used once.\nIf you did not request this, you can ignore this message.`,
        html: layout(
            "Reset your password",
            [
                `Hello ${escapeHtml(firstName)},`,
                "We received a request to reset your ORA password.",
                `This link expires in ${minutes} minutes and can be used once. If you did not request this, you can ignore this message.`,
            ],
            { label: "Reset password", url }
        ),
    });
}

export function sendPasswordChangedEmail(
    to: string,
    firstName: string
) {
    return sendMail({
        to,
        subject: "Your ORA password was changed",
        text: `Hello ${firstName},\n\nThe password of your ORA account was just changed. If this was not you, reset your password immediately and contact an administrator.`,
        html: layout("Your password was changed", [
            `Hello ${escapeHtml(firstName)},`,
            "The password of your ORA account was just changed.",
            "If this was not you, reset your password immediately and contact an administrator.",
        ]),
    });
}
