type SendMailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

const MAIL_ENABLED = process.env.MAIL_ENABLED === "true";

/**
 * Generic mail sender.
 * Safe scaffold – does nothing if MAIL_ENABLED=false.
 */
export async function sendMail(input: SendMailInput) {
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
    } catch (err) {
        console.error("MAIL_SEND_ERROR:", err);
    }
}