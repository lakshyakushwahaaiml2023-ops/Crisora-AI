import express from 'express';
import Joi from 'joi';
import User from '../models/User.js';
import verifyToken from '../middleware/auth.js';
import allowRoles from '../middleware/roleGuard.js';

const router = express.Router();

// ── XML-escape helper (prevents TwiML injection from user-supplied text) ───────
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
  // 1-second pause gives Twilio time after the trial-account prompt
  // Message is spoken twice so the listener doesn't miss it
  return [
    '<Response>',
    '  <Pause length="1"/>',
    `  <Say voice="alice">${safe}</Say>`,
    '  <Pause length="1"/>',
    `  <Say voice="alice">${safe}</Say>`,
    '</Response>',
  ].join('');
}

// ── Joi Schema ──────────────────────────────────────────────────────────────
const broadcastSchema = Joi.object({
  district:  Joi.string().required(),
  message:   Joi.string().min(5).required(),
  channels:  Joi.array().items(Joi.string().valid('sms', 'voice')).min(1).required(),
  testPhone: Joi.string().allow('', null),
});

// ── POST /api/broadcast — Dispatch SMS and/or Voice Calls ────────────────────
router.post(
  '/',
  verifyToken,
  allowRoles('collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      const { error, value } = broadcastSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((d) => d.message);
        return res.status(400).json({ success: false, errors });
      }

      const { district, message, channels, testPhone } = value;

      // 1. Resolve Recipient Citizens
      let recipients = [];
      if (testPhone && testPhone.trim().length > 0) {
        recipients = [{ name: 'Test Auditor', phone: testPhone.trim() }];
        console.log(`[BROADCAST] Target overridden. Sending only to test phone: ${testPhone}`);
      } else {
        const query = { role: 'citizen' };
        if (district && district !== 'All Districts') {
          query.district = { $regex: new RegExp(district, 'i') };
        }
        recipients = await User.find(query).select('name phone district isEvacuated');
        console.log(`[BROADCAST] Resolved ${recipients.length} citizen(s) in district: ${district}`);
      }

      if (recipients.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No registered citizens found in target district(s).',
          count: 0,
          channels,
          isSimulated: true,
        });
      }

      // 2. Resolve Twilio Credentials
      const accountSid  = process.env.TWILIO_ACCOUNT_SID;
      const authToken   = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      const hasTwilioCreds = accountSid && authToken && twilioPhone;
      let isSimulated = !hasTwilioCreds;

      let twilioClient = null;
      if (hasTwilioCreds) {
        try {
          const twilio = (await import('twilio')).default;
          twilioClient = twilio(accountSid, authToken);
        } catch (err) {
          console.error('[BROADCAST] Failed to load Twilio client module:', err);
          isSimulated = true;
        }
      } else {
        console.log('[BROADCAST] Twilio credentials missing in env. Running in SIMULATION mode.');
      }

      const twiml = buildTwiml(message);

      const results = {
        sms:   { success: 0, failed: 0, details: [] },
        voice: { success: 0, failed: 0, details: [] },
      };

      // 3. Send Messages to Recipients
      for (const rec of recipients) {
        if (!rec.phone || rec.phone.trim().length === 0) {
          console.warn(`[BROADCAST] Recipient ${rec.name} has no valid phone number. Skipping.`);
          continue;
        }

        // SMS Dispatch
        if (channels.includes('sms')) {
          if (isSimulated) {
            console.log(`[SIMULATION-SMS] Sent to ${rec.name} (${rec.phone}): "${message}"`);
            results.sms.success++;
          } else {
            try {
              await twilioClient.messages.create({
                body: message,
                to:   rec.phone,
                from: twilioPhone,
              });
              results.sms.success++;
            } catch (err) {
              console.error(`[BROADCAST-SMS] Failed to send to ${rec.phone}:`, err.message);
              results.sms.failed++;
              results.sms.details.push({ phone: rec.phone, error: err.message });
            }
          }
        }

        // Voice Call Dispatch — only for non-evacuated citizens
        if (channels.includes('voice')) {
          if (rec.isEvacuated === true) {
            console.log(`[BROADCAST-VOICE] Skipping ${rec.name} (${rec.phone}) — already evacuated.`);
            results.voice.details.push({ phone: rec.phone, skipped: true, reason: 'already evacuated' });
          } else if (isSimulated) {
            console.log(`[SIMULATION-VOICE] Called ${rec.name} (${rec.phone}): "${message}"`);
            results.voice.success++;
          } else {
            try {
              await twilioClient.calls.create({
                twiml,
                to:   rec.phone,
                from: twilioPhone,
              });
              results.voice.success++;
            } catch (err) {
              console.error(`[BROADCAST-VOICE] Failed to call ${rec.phone}:`, err.message);
              results.voice.failed++;
              results.voice.details.push({ phone: rec.phone, error: err.message });
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: isSimulated
          ? 'Alert broadcast completed in SIMULATION mode.'
          : 'Alert broadcast dispatched successfully via Twilio.',
        isSimulated,
        stats: {
          targeted: recipients.length,
          sms:   results.sms,
          voice: results.voice,
        },
      });

    } catch (error) {
      console.error('[BROADCAST] POST /api/broadcast error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error during broadcast.' });
    }
  }
);

// ── POST /api/broadcast/test-call — Place an immediate test voice call ────────
router.post(
  '/test-call',
  verifyToken,
  allowRoles('collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, message: 'phone and message are required.' });
      }

      const accountSid  = process.env.TWILIO_ACCOUNT_SID;
      const authToken   = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !twilioPhone) {
        console.log(`[TEST-CALL] Simulated call to ${phone}: "${message}"`);
        return res.status(200).json({
          success: true,
          isSimulated: true,
          message: 'Simulated call logged (no Twilio credentials).',
        });
      }

      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);
      await client.calls.create({
        twiml: buildTwiml(message),
        to:    phone,
        from:  twilioPhone,
      });

      return res.status(200).json({
        success: true,
        isSimulated: false,
        message: `Test call placed to ${phone} successfully.`,
      });
    } catch (error) {
      console.error('[TEST-CALL] Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to place test call.' });
    }
  }
);

export default router;
