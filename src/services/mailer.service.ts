type SendMailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

const MAIL_ENABLED = process.env.MAIL_ENABLED === "true";

export async function sendMail(input: SendMailInput) {
    if (!MAIL_ENABLED) {
        if (process.env.NODE_ENV !== "production") {
            console.log("[MAIL DISABLED]", { to: input.to, subject: input.subject });
        }
        return;
    }

    // Plug-in point (SendGrid/Mailgun/SES etc.)
    // Keep as a clean contract so controllers/services don't change later.
    throw new Error("Mailer enabled but no provider configured");
}