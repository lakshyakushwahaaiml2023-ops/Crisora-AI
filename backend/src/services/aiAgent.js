import Region from '../models/Region.js';
import SensorReading from '../models/SensorReading.js';
import DisasterEvent from '../models/DisasterEvent.js';
import SOSAlert from '../models/SOSAlert.js';
import User from '../models/User.js';

/**
 * Compiles a comprehensive context object for the AI helper.
 * @param {string} userId - ID of the requesting user
 * @param {string} regionId - ID of the target region
 * @returns {Promise<object>} Compiled agentContext JSON
 */
export async function buildContext(userId, regionId) {
  try {
    // 1. Get region details
    const region = await Region.findById(regionId);
    if (!region) {
      throw new Error(`Region not found for ID: ${regionId}`);
    }

    // 2. Get last 5 sensor readings
    const sensorReadings = await SensorReading.find({ regionId })
      .sort({ timestamp: -1 })
      .limit(5);

    // 3. Get active disaster events (status is warning, watch, or active)
    const activeDisasters = await DisasterEvent.find({
      regionId,
      status: { $ne: 'resolved' },
    });

    // 4. Get count and types of open SOS alerts in region
    const openSOS = await SOSAlert.find({
      regionId,
      status: { $in: ['active', 'acknowledged'] },
    });
    const sosCount = openSOS.length;
    const sosTypes = [...new Set(openSOS.map((alert) => alert.type))];

    // 5. Get requesting user role
    const user = await User.findById(userId);
    const userRole = user ? user.role : 'citizen';

    // 6. Get top 2 most similar historical disasters in the same state
    const siblingRegions = await Region.find({ state: region.state }).select('_id');
    const siblingRegionIds = siblingRegions.map((r) => r._id);

    const historicalDisasters = await DisasterEvent.find({
      regionId: { $in: siblingRegionIds },
      status: 'resolved',
    }).limit(2);

    const agentContext = {
      region: {
        id: region._id.toString(),
        name: region.name,
        district: region.district,
        state: region.state,
        riskScore: region.riskScore,
        riskLevel: region.riskLevel,
      },
      user: {
        id: userId,
        role: userRole,
      },
      sensorReadings: sensorReadings.map((r) => ({
        sourceType: r.sourceType,
        value: r.value,
        unit: r.unit,
        timestamp: r.timestamp,
      })),
      activeDisasters: activeDisasters.map((d) => ({
        name: d.name,
        type: d.type,
        severity: d.severity,
        status: d.status,
        description: d.description,
      })),
      openSOS: {
        count: sosCount,
        types: sosTypes,
      },
      historicalDisasters: historicalDisasters.map((h) => ({
        name: h.name,
        type: h.type,
        severity: h.severity,
        description: h.description,
        casualties: h.casualties,
        affectedPopulation: h.affectedPopulation,
      })),
    };

    return agentContext;
  } catch (error) {
    console.error('Error in buildContext:', error);
    throw error;
  }
}

/**
 * Queries the Groq Chat Completions API to obtain streaming advice.
 * @param {string} userId - User requesting advice
 * @param {string} regionId - Region context
 * @param {string} userMessage - Chat message prompt
 * @param {function} onChunk - Callback triggered for every streamed text delta chunk
 */
export async function getAIAdvice(userId, regionId, userMessage, onChunk) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not defined in environment variables');
  }

  // Compile context
  const context = await buildContext(userId, regionId);

  const systemPrompt = `You are a disaster management AI assistant helper for Indian authorities (NDMA, state/district collectors, local teams). 
Provide concise, actionable advice based on standard operating procedures.

Here is the current real-time disaster status context for the target region:
${JSON.stringify(context, null, 2)}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop(); // Hold onto the last incomplete line segment

      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('data:')) {
          const dataStr = cleaned.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const textChunk = parsed.choices?.[0]?.delta?.content;
            if (textChunk) {
              onChunk(textChunk);
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines/comments
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in getAIAdvice:', error);
    throw error;
  }
}
