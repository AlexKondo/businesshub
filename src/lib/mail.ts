import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  await getTransporter().sendMail({
    from: `${process.env.BREVO_SENDER_NAME} <${process.env.BREVO_SENDER_EMAIL}>`,
    ...opts,
  });
}
