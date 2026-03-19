import { config } from "dotenv";
import { sendSmtpTestEmail } from "../email.js";

config();

try {
  await sendSmtpTestEmail();
  console.log("Тестовое письмо отправлено.");
} catch (e) {
  console.error(e?.message || e);
  process.exitCode = 1;
}
