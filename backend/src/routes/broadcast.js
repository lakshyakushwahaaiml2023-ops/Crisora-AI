import express from 'express';
import Joi from 'joi';
import verifyToken from '../middleware/auth.js';
import allowRoles from '../middleware/roleGuard.js';

const router = express.Router();

// ── Hardcoded recipient lists ─────────────────────────────────────────────────
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

// ── Translate English message to Hindi via Groq ───────────────────────────────
async function translateToHindi(englishMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('[TRANSLATION] GROQ_API_KEY missing — using fallback Hindi.');
    return `सावधान! आपातकालीन संदेश: ${englishMessage}`;
  }
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency response translator. Translate the given English emergency alert into clear, simple Hindi suitable for automated voice calls. Output ONLY the Hindi text with no extra explanation, no quotes, no symbols like *, #, &, <, >. Plain Hindi sentences only.',
          },
          { role: 'user', content: englishMessage },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);

    const data = await response.json();
    const hindi = data.choices?.[0]?.message?.content?.trim();
    if (hindi) {
      console.log(`[TRANSLATION] "${englishMessage}" → "${hindi}"`);
      return hindi;
    }
  } catch (err) {
    console.error('[TRANSLATION] Groq failed:', err.message);
  }
  return `सावधान! आपदा चेतावनी: ${englishMessage}`;
}

// ── Build safe Hindi TwiML ────────────────────────────────────────────────────
function buildTwiml(hindiText) {
  const safe = xmlEscape(hindiText);
  // 1s pause lets Twilio trial prompt finish before speaking
  // Message spoken twice so listener doesn't miss it
  return [
    '<Response>',
    '  <Pause length="1"/>',
    `  <Say language="hi-IN" voice="Polly.Aditi">${safe}</Say>`,
    '  <Pause length="1"/>',
    `  <Say language="hi-IN" voice="Polly.Aditi">${safe}</Say>`,
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

      // Translate to Hindi upfront if voice is requested
      let hindiText = null;
      if (channels.includes('voice')) {
        console.log('[BROADCAST] Translating to Hindi...');
        hindiText = await translateToHindi(message);
      }

      const twiml = hindiText ? buildTwiml(hindiText) : null;

      const results = {
        sms:   { success: 0, failed: 0, details: [] },
        voice: { success: 0, failed: 0, details: [] },
      };

      // ── SMS + Voice → all 4 numbers ──────────────────────────────────────────
      for (const phone of ALL_NUMBERS) {

        // SMS — send original English message
        if (channels.includes('sms')) {
          if (isSimulated) {
            console.log(`[SIMULATION-SMS] → ${phone}: "${message}"`);
            results.sms.success++;
          } else {
            try {
              await client.messages.create({ body: message, to: phone, from: twilioPhone });
              console.log(`[SMS] ✓ ${phone}`);
              results.sms.success++;
            } catch (err) {
              console.error(`[SMS] ✗ ${phone}: ${err.message}`);
              results.sms.failed++;
              results.sms.details.push({ phone, error: err.message });
            }
          }
        }

        // Voice — speak Hindi translation
        if (channels.includes('voice')) {
          if (isSimulated) {
            console.log(`[SIMULATION-VOICE] → ${phone}: "${hindiText}"`);
            results.voice.success++;
          } else {
            try {
              await client.calls.create({ twiml, to: phone, from: twilioPhone });
              console.log(`[VOICE] ✓ ${phone}`);
              results.voice.success++;
            } catch (err) {
              console.error(`[VOICE] ✗ ${phone}: ${err.message}`);
              results.voice.failed++;
              results.voice.details.push({ phone, error: err.message });
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: isSimulated ? 'Broadcast completed in SIMULATION mode.' : 'Broadcast dispatched via Twilio.',
        isSimulated,
        targets: ALL_NUMBERS,
        translatedHindi: hindiText || null,
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

      // Translate first regardless of simulation
      console.log('[TEST-CALL] Translating to Hindi...');
      const hindiText = await translateToHindi(message);
      const twiml = buildTwiml(hindiText);

      if (!accountSid || !authToken || !twilioPhone) {
        console.log(`[TEST-CALL] Simulated calls to all ${ALL_NUMBERS.length} numbers.`);
        return res.status(200).json({
          success: true, isSimulated: true,
          translatedHindi: hindiText,
          message: `Simulated Hindi calls to ${ALL_NUMBERS.join(', ')}.`,
        });
      }

      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);

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
        translatedHindi: hindiText,
        results: callResults,
        message: `Hindi calls dispatched to ${ALL_NUMBERS.length} numbers.`,
      });

    } catch (error) {
      console.error('[TEST-CALL] Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to place test call.' });
    }
  }
);

export default router;
