import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        await resend.emails.send({
            from: "kitaDocs <noreplay@freepirate.ninja>",
            to: to,
            subject: subject,
            html: html,
        })
    } catch (error) {
        console.error("Error sending email:", error);
        return "Failed to send email"
    }
}