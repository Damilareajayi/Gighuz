import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

export async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!to.startsWith('+')) {
    console.warn(`[WhatsApp] Invalid number format: ${to}`);
    return;
  }

  try {
    await client.messages.create({
      from: FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    console.log(`[WhatsApp] Sent to ${to}`);
  } catch (err) {
    console.error(`[WhatsApp] Failed to send to ${to}:`, err);
  }
}
