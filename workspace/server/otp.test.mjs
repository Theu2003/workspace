import assert from 'node:assert/strict';
import test from 'node:test';
import { generateCode, hashCode, sendVerificationCode, verifyCode } from './src/otp.js';

test('verification codes are six digits and hashes are bound to purpose and record', () => {
  const code = generateCode();
  const secret = 'local-test-secret';
  const digest = hashCode(code, 'password_reset', 42, secret);

  assert.match(code, /^\d{6}$/);
  assert.equal(verifyCode(code, digest, 'password_reset', 42, secret), true);
  assert.equal(verifyCode(code, digest, 'password_change', 42, secret), false);
  assert.equal(verifyCode(code, digest, 'password_reset', 43, secret), false);
});

test('email and SMS delivery use injected local mocks', async () => {
  const deliveries = [];
  const adapters = {
    email: async (recipient, code) => deliveries.push({ channel: 'email', recipient, code }),
    phone: async (recipient, code) => deliveries.push({ channel: 'phone', recipient, code })
  };

  await sendVerificationCode('email', 'test@example.invalid', '123456', adapters);
  await sendVerificationCode('phone', '+14155552671', '654321', adapters);

  assert.deepEqual(deliveries, [
    { channel: 'email', recipient: 'test@example.invalid', code: '123456' },
    { channel: 'phone', recipient: '+14155552671', code: '654321' }
  ]);
});

test('unconfigured selected delivery fails clearly without making a network request', async () => {
  const names = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  const oldValues = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    await assert.rejects(
      sendVerificationCode('email', 'test@example.invalid', '123456'),
      /SMTP is not configured; set/
    );
  } finally {
    for (const name of names) {
      if (oldValues[name] === undefined) delete process.env[name];
      else process.env[name] = oldValues[name];
    }
  }
});
