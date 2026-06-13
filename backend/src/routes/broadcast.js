import express from 'express';
import Joi from 'joi';
import verifyToken from '../middleware/auth.js';
import allowRoles from '../middleware/roleGuard.js';

const router = express.Router();

// ── Hardcoded recipient lists ─────────────────────────────────────────────────
// All 4 numbers receive both SMS and voice calls
const ALL_NUMBERS = [
  '+916268347442',
  '+919669666845',
  '+918109927290',
  '+919302139664',
];

// ── XML-escape helper ─────────────────────────────────────────────────────────
function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Build safe English TwiML for a voice call ─────────────────────────────────
function buildTwiml(text) {
  const safe = xmlEscape(text);
  return [
    '<Response>',
    '  <Pause length="1"/>',
    `  <Say voice="alice">${safe}</Say>`,
    '  <Pause length="1"/>',
    `  <Say voice="alice">${safe}</Say>`,
    '</Response>',
  ].join('');
}

// ── Joi Schema ────────────────────────────────────────────────────────────────
const broadcastSchema = Joi.object({
  district:  Joi.string().required(),
  message:   Joi.string().min(5).required(),
  channels:  Joi.array().items(Joi.string().valid('sms', 'voice')).min(1).required(),
  testPhone: Joi.string().allow('', null),
});

// ── POST /api/broadcast ───────────────────────────────────────────────────────
router.post(
  '/',
  verifyToken,
  allowRoles('collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      const { error, value } = broadcastSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({ success: false, errors: error.details.map(d => d.message) });
      }

      const { message, channels } = value;

      // Resolve Twilio credentials
      const accountSid  = process.env.TWILIO_ACCOUNT_SID;
      const authToken   = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      const hasCreds = accountSid && authToken && twilioPhone;
      let isSimulated = !hasCreds;

      let client = null;
      if (hasCreds) {
        try {
          const twilio = (await import('twilio')).default;
          client = twilio(accountSid, authToken);
        } catch (err) {
          console.error('[BROADCAST] Twilio load failed:', err.message);
          isSimulated = true;
        }
      }

      const twiml = buildTwiml(message);

      const results = {
        sms:   { success: 0, failed: 0, details: [] },
        voice: { success: 0, failed: 0, details: [] },
      };

      // ── SMS + Voice → all 4 numbers ────────────────────────────────────────
      for (const phone of ALL_NUMBERS) {
        // SMS
        if (channels.includes('sms')) {
          if (isSimulated) {
            console.log(`[SIMULATION-SMS] → ${phone}: "${message}"`);
            results.sms.success++;
          } else {
            try {
              await client.messages.create({ body: message, to: phone, from: twilioPhone });
              console.log(`[SMS] ✓ Sent to ${phone}`);
              results.sms.success++;
            } catch (err) {
              console.error(`[SMS] ✗ Failed ${phone}: ${err.message}`);
              results.sms.failed++;
              results.sms.details.push({ phone, error: err.message });
            }
          }
        }

        // Voice
        if (channels.includes('voice')) {
          if (isSimulated) {
            console.log(`[SIMULATION-VOICE] → ${phone}: "${message}"`);
            results.voice.success++;
          } else {
            try {
              await client.calls.create({ twiml, to: phone, from: twilioPhone });
              console.log(`[VOICE] ✓ Called ${phone}`);
              results.voice.success++;
            } catch (err) {
              console.error(`[VOICE] ✗ Failed ${phone}: ${err.message}`);
              results.voice.failed++;
              results.voice.details.push({ phone, error: err.message });
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: isSimulated
          ? 'Broadcast completed in SIMULATION mode.'
          : 'Broadcast dispatched via Twilio.',
        isSimulated,
        targets: ALL_NUMBERS,
        stats: { sms: results.sms, voice: results.voice },
      });

    } catch (error) {
      console.error('[BROADCAST] error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ── POST /api/broadcast/test-call ────────────────────────────────────────────
router.post(
  '/test-call',
  verifyToken,
  allowRoles('collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, message: 'message is required.' });
      }

      const accountSid  = process.env.TWILIO_ACCOUNT_SID;
      const authToken   = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !twilioPhone) {
        console.log(`[TEST-CALL] Simulated calls to all ${ALL_NUMBERS.length} numbers: "${message}"`);
        return res.status(200).json({
          success: true, isSimulated: true,
          message: `Simulated calls to ${ALL_NUMBERS.join(', ')} (no Twilio credentials).`,
        });
      }

      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);
      const twiml  = buildTwiml(message);

      const callResults = [];
      for (const phone of ALL_NUMBERS) {
        try {
          await client.calls.create({ twiml, to: phone, from: twilioPhone });
          console.log(`[TEST-CALL] ✓ Called ${phone}`);
          callResults.push({ phone, success: true });
        } catch (err) {
          console.error(`[TEST-CALL] ✗ Failed ${phone}: ${err.message}`);
          callResults.push({ phone, success: false, error: err.message });
        }
      }

      return res.status(200).json({
        success: true, isSimulated: false,
        voiceTargets: ALL_NUMBERS,
        results: callResults,
        message: `Test calls dispatched to ${ALL_NUMBERS.length} numbers.`,
      });
    } catch (error) {
      console.error('[TEST-CALL] Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to place test call.' });
    }
  }
);

export default router;
