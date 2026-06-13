import express from 'express';
import Joi from 'joi';
import DisasterEvent from '../models/DisasterEvent.js';
import SensorReading from '../models/SensorReading.js';
import { evaluateRiskFromReadings } from '../services/riskEngine.js';

const router = express.Router();

// Joi schema for replay validation
const replaySchema = Joi.object({
  offsetHours: Joi.number().min(0).default(0),
});

// GET /api/simulation/events — List all historical events
router.get('/events', async (req, res) => {
  try {
    const events = await DisasterEvent.find({ status: 'resolved' })
      .populate('regionId', 'name district state population')
      .sort({ startTime: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('GET /simulation/events error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/simulation/replay/:eventId — Replay historical event in dry-run mode
router.post('/replay/:eventId', async (req, res) => {
  try {
    const { error, value } = replaySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { offsetHours } = value;
    const event = await DisasterEvent.findById(req.params.eventId).populate('regionId');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Disaster event not found' });
    }

    // Target calculation time: disaster start time minus offset hours
    const targetTime = new Date(event.startTime.getTime() - offsetHours * 60 * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 3 * 60 * 60 * 1000); // 3-hour window up to targetTime

    // Fetch sensor readings for the region in this time window
    const readings = await SensorReading.find({
      regionId: event.regionId._id,
      timestamp: { $gte: windowStart, $lte: targetTime },
    });

    // Run risk engine scoring logic in dry-run mode (without db save or socket broadcast)
    const { riskScore, riskLevel } = evaluateRiskFromReadings(readings);

    // Determine recommended actions based on dry-run riskLevel
    let recommendedActions = '';
    switch (riskLevel) {
      case 'green':
        recommendedActions = 'Standard monitoring. Maintain routine sensor health checks.';
        break;
      case 'yellow':
        recommendedActions = 'Elevated alert. Notify local district emergency response coordinators and coordinate standby teams.';
        break;
      case 'orange':
        recommendedActions = 'High alert. Pre-position State/National Disaster Response Forces (SDRF/NDRF) and prepare evacuation routes.';
        break;
      case 'red':
        recommendedActions = 'Critical emergency. Order immediate evacuation along designated paths and mobilize medical centers.';
        break;
      default:
        recommendedActions = 'No recommendations available.';
    }

    return res.status(200).json({
      success: true,
      event: event.name,
      region: {
        id: event.regionId._id,
        name: event.regionId.name,
        district: event.regionId.district,
        state: event.regionId.state,
      },
      simulationSettings: {
        eventStartTime: event.startTime,
        offsetHours,
        targetSimulationTime: targetTime,
        readingsCount: readings.length,
      },
      results: {
        riskScore,
        riskLevel,
        recommendedActions,
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid Event ID format' });
    }
    console.error('POST /simulation/replay error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
