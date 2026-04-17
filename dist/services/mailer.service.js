"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const MAIL_ENABLED = process.env.MAIL_ENABLED === "true";
/**
 * Generic mail sender.
 * Safe scaffold – does nothing if MAIL_ENABLED=false.
 */
async function sendMail(input) {
    try {
        if (!MAIL_ENABLED) {
            if (process.env.NODE_ENV !== "production") {
                console.log("[MAIL DISABLED]");
                console.log({
                    to: input.to,
                    subject: input.subject,
                });
            }
            return;
        }
        /**
         * Future integration point.
         * Example providers:
         * - SendGrid
         * - AWS SES
         * - Mailgun
         */
        throw new Error("Mailer enabled but no provider configured");
    }
    catch (err) {
        console.error("MAIL_SEND_ERROR:", err);
    }
}
