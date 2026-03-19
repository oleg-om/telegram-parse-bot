import nodemailer from "nodemailer";
import { config } from "dotenv";

config();

const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const port = Number(SMTP_PORT) || 587;
  const secure = SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

/**
 * Отправляет текст на EMAIL_TO, если заданы SMTP_* и EMAIL_TO.
 * Ошибки только логируются — не ломают основной поток бота.
 */
export const sendNewTicketsEmail = async (text) => {
  if (process.env.EMAIL_NOTIFY === "false") {
    return;
  }

  const toRaw = process.env.EMAIL_TO?.trim();
  const transporter = createTransporter();

  if (!transporter || !toRaw) {
    return;
  }

  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!to.length) {
    return;
  }

  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER;
  const subject =
    process.env.EMAIL_SUBJECT?.trim() || "Новые талоны (telegram-parse-bot)";

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
};

/**
 * Тестовое письмо (для scripts/test-email.js). Не смотрит на EMAIL_NOTIFY.
 */
export const sendSmtpTestEmail = async () => {
  const toRaw = process.env.EMAIL_TO?.trim();
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error(
      "SMTP не настроен: задайте SMTP_HOST, SMTP_USER, SMTP_PASS в .env",
    );
  }
  if (!toRaw) {
    throw new Error("Задайте EMAIL_TO в .env");
  }

  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!to.length) {
    throw new Error("EMAIL_TO пустой");
  }

  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "[test] telegram-parse-bot",
    text: `Проверка отправки SMTP.\nВремя: ${new Date().toISOString()}\nХост: ${process.env.SMTP_HOST}`,
  });
};
