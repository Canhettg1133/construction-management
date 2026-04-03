import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      return null;
    }
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const mailService = {
  async send(options: SendEmailOptions): Promise<void> {
    const transport = getTransporter();

    if (!transport) {
      // Dev fallback: log the email link
      const resetUrl = options.html.match(/href="([^"]+)"/)?.[1] ?? "(no link found)";
      logger.warn(
        { to: options.to, subject: options.subject, resetUrl },
        "Email not sent (SMTP not configured). Check the link above."
      );
      return;
    }

    try {
      await transport.sendMail({
        from: `"Xây Dựng Console" <${env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      logger.info({ to: options.to, subject: options.subject }, "Email sent successfully");
    } catch (err) {
      logger.error({ err, to: options.to, subject: options.subject }, "Failed to send email");
      // Don't throw — email failure shouldn't block password reset flow
    }
  },

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.send({
      to: email,
      subject: "Đặt lại mật khẩu — Xây Dựng Console",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
          <h2 style="color: #1e293b;">Xin chào,</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong>.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Nhấn vào nút bên dưới để đặt lại mật khẩu. Link có hiệu lực trong <strong>1 giờ</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.<br/>
            Link: <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
          <p style="color: #94a3b8; font-size: 12px;">© Xây Dựng Console — Hệ thống quản lý công trình</p>
        </div>
      `,
      text: `Xin chào,\n\nYêu cầu đặt lại mật khẩu cho ${email}.\n\nNhấn vào link sau để đặt lại mật khẩu (hiệu lực 1 giờ):\n${resetUrl}\n\nNếu bạn không yêu cầu, bỏ qua email này.`,
    });
  },
};
