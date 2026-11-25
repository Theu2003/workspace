import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

export function generateCode() {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export function hashCode(code, purpose, recordId, secret = process.env.JWT_SECRET) {
  if (!secret) throw new Error('JWT_SECRET é obrigatório para proteger os códigos de verificação');
  return createHmac('sha256', secret).update(`${purpose}:${recordId}:${code}`).digest('hex');
}

export function verifyCode(code, expectedHash, purpose, recordId, secret = process.env.JWT_SECRET) {
  const actual = Buffer.from(hashCode(code, purpose, recordId, secret), 'hex');
  const expected = Buffer.from(expectedHash || '', 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function sendVerificationCode(channel, recipient, code, adapters = {}) {
  if (channel === 'email') {
    if (adapters.email) return adapters.email(recipient, code);
    const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length) throw new Error(`SMTP não configurado; defina ${missing.join(', ')}`);
    const port = Number(process.env.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT deve ser uma porta válida');

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: recipient,
        subject: 'Seu código de verificação Pardela',
        text: `Seu código de verificação é ${code}. Ele expira em 10 minutos.`
      });
    } catch {
      throw new Error('Falha no envio do e-mail; verifique a configuração SMTP e a disponibilidade do provedor');
    }
    return;
  }

  if (channel === 'phone') {
    if (adapters.phone) return adapters.phone(recipient, code);
    const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_PHONE'];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Twilio não configurado; defina ${missing.join(', ')}`);

    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Seu código de verificação Pardela é ${code}. Ele expira em 10 minutos.`,
        from: process.env.TWILIO_FROM_PHONE,
        to: recipient
      });
    } catch {
      throw new Error('Falha no envio do SMS; verifique a configuração do Twilio e a disponibilidade do provedor');
    }
    return;
  }

  throw new Error('Canal de verificação não suportado');
}
