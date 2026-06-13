import Region from '../models/Region.js';
import SensorReading from '../models/SensorReading.js';
import DisasterEvent from '../models/DisasterEvent.js';
import SOSAlert from '../models/SOSAlert.js';
import User from '../models/User.js';

/**
 * Compiles a comprehensive context object for the AI helper.
 * If regionId is not provided, it resolves dynamically based on the user's district or highest risk region.
 * @param {string} userId - ID of the requesting user
 * @param {string} regionId - Optional ID of the target region
 * @returns {Promise<object>} Compiled agentContext JSON
 */
export async function buildContext(userId, regionId) {
  try {
    // 1. Get requesting user role and district
    const user = await User.findById(userId);
    const userRole = user ? user.role : 'citizen';

    // 2. Resolve region context dynamically if none provided
    let targetRegionId = regionId;
    if (!targetRegionId) {
      if (user && user.district) {
        // Find local region matching the user's district
        const region = await Region.findOne({ district: { $regex: new RegExp(user.district, 'i') } });
        if (region) targetRegionId = region._id.toString();
      }

      // Fallback: use the region with the highest current risk score
      if (!targetRegionId) {
        const region = await Region.findOne({}).sort({ riskScore: -1 });
        if (region) targetRegionId = region._id.toString();
      }
    }

    if (!targetRegionId) {
      throw new Error('No region context available in the database.');
    }

    // 3. Get region details
    const region = await Region.findById(targetRegionId);
    if (!region) {
      throw new Error(`Region not found for ID: ${targetRegionId}`);
    }

    // 4. Get the latest reading for each of the 6 sensor types in this region
    const sensorTypes = ['weather', 'river_gauge', 'seismic', 'social_media', 'citizen_report', 'air_quality'];
    const sensorReadingsPromises = sensorTypes.map(type => 
      SensorReading.findOne({ regionId: region._id, sourceType: type }).sort({ timestamp: -1 })
    );
    const resolvedReadings = await Promise.all(sensorReadingsPromises);
    const sensorReadings = resolvedReadings.filter(r => r !== null);

    // 5. Get active disaster events (status is warning, watch, or active)
    const activeDisasters = await DisasterEvent.find({
      regionId: region._id,
      status: { $ne: 'resolved' },
    });

    // 6. Get count and types of open SOS alerts in region
    const openSOS = await SOSAlert.find({
      regionId: region._id,
      status: { $in: ['active', 'acknowledged'] },
    });
    const sosCount = openSOS.length;
    const sosTypes = [...new Set(openSOS.map((alert) => alert.type))];

    // 7. Get top 2 most similar historical disasters in the same state
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
 * @param {string} regionId - Optional region context
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

  const systemPrompt = `You are an expert disaster management AI assistant helper for Indian authorities (NDMA, State/District Collectors, local response teams).
You are communicating with a user in the role: "${context.user.role}".

Your task is to analyze real-time telemetry from all sources (weather, river gauge, seismic activity, air quality, citizen reports, and social media sentiment) for the region "${context.region.name} (${context.region.district}, ${context.region.state})".

REAL-TIME REGIONAL CONTEXT:
${JSON.stringify(context, null, 2)}

OPERATIONAL RULES:
1. ROLE-SPECIFIC GUIDANCE: Tailor suggestions specifically to the user's role ("${context.user.role}").
   - Collectors / Local teams: focus on mobilizing local SDRF, setting up camps, executing evacuations.
   - NDMA / State: focus on national resource allocation, high-level deployments, inter-state/regional coordination.
   - Citizens: focus on safety drills, emergency numbers, and evacuation routes.
2. NO THREAT EXCLUSION RULE:
   - If the region's risk score is normal/low (green/low score), and there are no active disasters, no emergency alerts, no high water capacities, and no significant seismic activity, you MUST explicitly output the phrase "no immediate threat" in your response and state that no changes or emergency response actions are required.
3. CONCISE AND ACTIONABLE: Do not write verbose essays. Be extremely structured, utilizing bold lists for key actions.`;

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

/**
 * Queries the Groq Completions API to obtain a non-streaming complete recommendation.
 * @param {string} userId - User requesting advice
 * @param {string} regionId - Optional region context
 * @param {string} userMessage - Message prompt
 * @returns {Promise<string>} Actionable recommendation string
 */
export async function getAIAdviceNonStreaming(userId, regionId, userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not defined in environment variables');
  }

  // Compile context
  const context = await buildContext(userId, regionId);

  const systemPrompt = `You are an expert disaster management AI assistant helper for Indian authorities (NDMA, State/District Collectors, local response teams).
You are communicating with a user in the role: "${context.user.role}".

Your task is to analyze real-time telemetry from all sources (weather, river gauge, seismic activity, air quality, citizen reports, and social media sentiment) for the region "${context.region.name} (${context.region.district}, ${context.region.state})".

REAL-TIME REGIONAL CONTEXT:
${JSON.stringify(context, null, 2)}

OPERATIONAL RULES:
1. ROLE-SPECIFIC GUIDANCE: Tailor suggestions specifically to the user's role ("${context.user.role}").
2. NO THREAT EXCLUSION RULE:
   - If the region's risk score is normal/low (green/low score), and there are no active disasters, no emergency alerts, no high water capacities, and no significant seismic activity, you MUST explicitly output the phrase "no immediate threat" in your response and state that no changes or emergency response actions are required.
3. CONCISE AND ACTIONABLE: Provide a very brief 2-3 sentence summary of the best course of action. Do not write a long essay.`;

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
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No advice available.';
  } catch (error) {
    console.error('Error in getAIAdviceNonStreaming:', error);
    throw error;
  }
}
