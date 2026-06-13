import Region from '../models/Region.js';
import SensorReading from '../models/SensorReading.js';

let io = null;

/**
 * Initialize the Socket.io instance for database triggers and broadcasts
 * @param {object} ioInstance - Socket.io server instance
 */
export function setIO(ioInstance) {
  io = ioInstance;
  console.log('Socket.io instance set in Risk Engine.');
}

/**
 * Pure helper function to compute riskScore and riskLevel from a set of SensorReadings.
 * @param {Array} readings - Array of SensorReading documents
 * @returns {object} { riskScore, riskLevel }
 */
export function evaluateRiskFromReadings(readings) {
  let score = 0;
  let hasRiverGaugeHigh = false;
  let hasHeavyRainfall = false;
  let hasSeismicHigh = false;
  let hasNegativeSentimentSpike = false;
  let hasHighAQI = false;
  let hasCitizenEmergency = false;

  for (const reading of readings) {
    const type = reading.sourceType;
    const val = reading.value;

    // Rule A: river_gauge >= 80% capacity
    if (type === 'river_gauge') {
      const percentage = typeof val === 'number' ? val : (val?.percentage ?? val?.capacity);
      if (percentage >= 80 || (percentage >= 0.8 && percentage < 1.0)) {
        hasRiverGaugeHigh = true;
      }
    }

    // Rule B: heavy rainfall (>50mm)
    if (type === 'weather') {
      const rain = val?.rain1h ?? val?.rain ?? val?.rainfall ?? 0;
      if (rain > 50) {
        hasHeavyRainfall = true;
      }
    }

    // Rule C: seismic activity above magnitude 4
    if (type === 'seismic') {
      const mag = typeof val === 'number' ? val : (val?.magnitude ?? val?.mag);
      if (mag > 4) {
        hasSeismicHigh = true;
      }
    }

    // Rule D: negative social media sentiment spike
    if (type === 'social_media') {
      const sentiment = val?.sentiment ?? '';
      const negativeSpike = val?.negativeSpike ?? val?.negativeSentimentSpike;
      if (sentiment === 'negative_spike' || negativeSpike === true || val?.sentimentScore < -0.5) {
        hasNegativeSentimentSpike = true;
      }
    }

    // Rule E: air quality index above 300
    if (type === 'air_quality') {
      const aqi = typeof val === 'number' ? val : (val?.aqi ?? val?.index);
      if (aqi > 300) {
        hasHighAQI = true;
      }
    }

    // Rule F: citizen reports of emergency
    if (type === 'citizen_report') {
      const isEmergency = val?.isEmergency ?? val?.emergency;
      const priorityStr = val?.type ?? val?.priority ?? '';
      if (isEmergency === true || priorityStr.toLowerCase() === 'emergency') {
        hasCitizenEmergency = true;
      }
    }
  }

  if (hasRiverGaugeHigh) score += 40;
  if (hasHeavyRainfall) score += 25;
  if (hasSeismicHigh) score += 35;
  if (hasNegativeSentimentSpike) score += 15;
  if (hasHighAQI) score += 10;
  if (hasCitizenEmergency) score += 20;

  // Cap total at 100
  score = Math.min(score, 100);

  // Map score to riskLevel: 0–25 green, 26–50 yellow, 51–75 orange, 76–100 red
  let level = 'green';
  if (score >= 76) {
    level = 'red';
  } else if (score >= 51) {
    level = 'orange';
  } else if (score >= 26) {
    level = 'yellow';
  }

  return { riskScore: score, riskLevel: level };
}

/**
 * Dynamically evaluate risk score and level for a region based on sensor readings over the last 3 hours.
 * @param {string|mongoose.Types.ObjectId} regionId - Target region ID
 * @returns {Promise<object>} { riskScore, riskLevel }
 */
export async function calculateRiskScore(regionId) {
  try {
    const region = await Region.findById(regionId);
    if (!region) {
      throw new Error(`Region not found for ID: ${regionId}`);
    }

    // 1. Fetch last 3 hours of SensorReading documents for the region
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const readings = await SensorReading.find({
      regionId,
      timestamp: { $gte: threeHoursAgo },
    });

    // 2. Evaluate risk score from readings using helper
    const { riskScore, riskLevel } = evaluateRiskFromReadings(readings);

    // 4. Update the Region document in the database
    region.riskScore = riskScore;
    region.riskLevel = riskLevel;
    region.lastUpdated = new Date();
    await region.save();

    console.log(`Risk metrics updated for Region "${region.name}": Score = ${riskScore}, Level = ${riskLevel}`);

    // 5. Emit socket.io event to room named after the district
    if (io) {
      const roomName = region.district; // Emit to district room
      io.to(roomName).emit('risk_update', {
        regionId: region._id.toString(),
        riskScore: riskScore,
        riskLevel: riskLevel,
      });
      console.log(`Emitted Socket.io 'risk_update' to room '${roomName}'`);
    } else {
      console.warn('Socket.io instance is not initialized in Risk Engine. Event not emitted.');
    }

    return { riskScore, riskLevel };
  } catch (error) {
    console.error(`Error in calculateRiskScore for region ${regionId}:`, error);
    throw error;
  }
}
