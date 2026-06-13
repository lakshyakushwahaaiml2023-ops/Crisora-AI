import express from 'express';
import Joi from 'joi';
import SOSAlert from '../models/SOSAlert.js';
import Region from '../models/Region.js';
import SensorReading from '../models/SensorReading.js';
import verifyToken from '../middleware/auth.js';
import allowRoles from '../middleware/roleGuard.js';

const router = express.Router();

// ── Joi Schemas ──────────────────────────────────────────────────────────────
const pointJoi = Joi.object({
  type: Joi.string().valid('Point').default('Point'),
  coordinates: Joi.array().items(Joi.number()).length(2).required()
    .messages({ 'array.length': 'Point coordinates must be [longitude, latitude]' }),
});

const createSOSSchema = Joi.object({
  location: pointJoi.required(),
  type:     Joi.string().valid('medical', 'flood', 'fire', 'trapped', 'other').required(),
  message:  Joi.string().allow('', null),
});

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/sos — Create SOS alert (citizen only, triggers cluster of 5 alarms in the same region)
router.post('/', verifyToken, allowRoles('citizen'), async (req, res) => {
  try {
    // Normalize coordinates and structure location for Joi schema validation
    if (req.body.lat !== undefined && req.body.lng !== undefined && !req.body.location) {
      req.body.location = {
        type: 'Point',
        coordinates: [Number(req.body.lng), Number(req.body.lat)]
      };
    }
    
    // Normalize type string from the frontend select options
    if (req.body.type && typeof req.body.type === 'string') {
      let t = req.body.type.toLowerCase().trim();
      if (t === 'medical emergency') t = 'medical';
      req.body.type = t;
    }

    // Remove client-specific fields not in Joi schema to avoid validation errors
    delete req.body.lat;
    delete req.body.lng;
    delete req.body.timestamp;

    const { error, value } = createSOSSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      return res.status(400).json({ success: false, errors });
    }

    const { location, type, message } = value;

    // Find the nearest region based on the citizen's location vs region centroid
    const nearestRegion = await Region.findOne({
      centroid: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates,
          },
        },
      },
    });

    const regionId = nearestRegion ? nearestRegion._id : null;
    if (!regionId) {
      return res.status(400).json({ success: false, message: 'No region found for coordinates' });
    }

    // Define 4 mock offsets to generate a cluster of 5 total alarms
    const offsets = [
      { latOffset: 0.003, lngOffset: -0.002, type: 'flood', msg: 'Simulated alert: water level rising rapidly!' },
      { latOffset: -0.004, lngOffset: 0.005, type: 'trapped', msg: 'Simulated alert: road blocked, citizens trapped.' },
      { latOffset: 0.002, lngOffset: 0.004, type: 'medical', msg: 'Simulated alert: emergency medical dispatch required.' },
      { latOffset: -0.003, lngOffset: -0.003, type: 'other', msg: 'Simulated alert: secondary command backup check.' }
    ];

    const alarmsToCreate = [
      { type, message, loc: location }
    ];

    offsets.forEach(off => {
      alarmsToCreate.push({
        type: off.type,
        message: off.msg,
        loc: {
          type: 'Point',
          coordinates: [location.coordinates[0] + off.lngOffset, location.coordinates[1] + off.latOffset]
        }
      });
    });

    const savedAlerts = [];
    const io = req.app.get('io');

    for (const item of alarmsToCreate) {
      const alert = new SOSAlert({
        userId: req.user.userId,
        location: item.loc,
        type: item.type,
        message: item.message,
        regionId,
        status: 'active',
      });

      await alert.save();

      const populatedAlert = await SOSAlert.findById(alert._id)
        .populate('userId', 'name email district')
        .populate('regionId', 'name district state');

      savedAlerts.push(populatedAlert);

      // Create SensorReading record for risk calculations
      const reading = new SensorReading({
        regionId,
        sourceType: 'citizen_report',
        sourceId: `sos_${alert._id}`,
        value: {
          isEmergency: true,
          type: 'emergency',
          alertType: item.type,
          message: item.message
        },
        unit: 'count',
        timestamp: new Date()
      });
      await reading.save();

      // Emit socket broadcast to the district room
      if (io) {
        const roomName = nearestRegion.district;
        io.to(roomName).emit('sos_alert', populatedAlert);
      }
    }

    // Trigger immediate regional risk score recalculation
    const { calculateRiskScore } = await import('../services/riskEngine.js');
    const updatedRisk = await calculateRiskScore(regionId);

    console.log(`SOS Cluster of ${savedAlerts.length} alerts saved and risk updated for Region ${nearestRegion.name}.`);

    return res.status(201).json({
      success: true,
      message: 'SOS Alert and cluster scenario triggered successfully',
      data: savedAlerts[0], // Return the primary alert
      cluster: savedAlerts,
      risk: updatedRisk
    });
  } catch (error) {
    console.error('POST /sos error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/sos/simulate-cluster — Simulate a cluster of emergency alarms (Authorities only)
router.post(
  '/simulate-cluster',
  verifyToken,
  allowRoles('ndma', 'state_authority', 'district_authority', 'collector'),
  async (req, res) => {
    try {
      const { regionId, type = 'flood' } = req.body;
      if (!regionId) {
        return res.status(400).json({ success: false, message: 'regionId is required' });
      }

      const region = await Region.findById(regionId);
      if (!region) {
        return res.status(404).json({ success: false, message: 'Region not found' });
      }

      const [lng, lat] = region.centroid.coordinates;

      const scenarios = {
        flood: [
          { latOffset: 0.002, lngOffset: -0.003, msg: 'Heavy rising waters near main bridge!' },
          { latOffset: -0.003, lngOffset: 0.004, msg: 'Multiple houses flooded in block B.' },
          { latOffset: 0.004, lngOffset: 0.002, msg: 'Urgent: evacuation path blocked by water.' },
          { latOffset: -0.001, lngOffset: -0.004, msg: 'Boat rescue needed for stranded family.' },
          { latOffset: 0, lngOffset: 0, msg: 'Water overflow from drainage canal!' }
        ],
        fire: [
          { latOffset: 0.002, lngOffset: -0.003, msg: 'Commercial complex caught fire!' },
          { latOffset: -0.003, lngOffset: 0.004, msg: 'Smoke filling adjacent residential lanes.' },
          { latOffset: 0.004, lngOffset: 0.002, msg: 'Multiple gas cylinders exploded.' },
          { latOffset: -0.001, lngOffset: -0.004, msg: 'Stranded residents on 3rd floor.' },
          { latOffset: 0, lngOffset: 0, msg: 'Fire spreading rapidly due to high winds.' }
        ]
      };

      const cluster = scenarios[type] || scenarios.flood;
      const createdAlerts = [];
      const io = req.app.get('io');

      for (const item of cluster) {
        const alertLoc = {
          type: 'Point',
          coordinates: [lng + item.lngOffset, lat + item.latOffset]
        };

        const alert = new SOSAlert({
          userId: req.user.userId,
          location: alertLoc,
          type,
          message: item.msg,
          regionId: region._id,
          status: 'active'
        });
        await alert.save();

        const populatedAlert = await SOSAlert.findById(alert._id)
          .populate('userId', 'name email district')
          .populate('regionId', 'name district state');

        createdAlerts.push(populatedAlert);

        // Save sensor reading
        const reading = new SensorReading({
          regionId: region._id,
          sourceType: 'citizen_report',
          sourceId: `sim_sos_${alert._id}`,
          value: {
            isEmergency: true,
            type: 'emergency',
            alertType: type,
            message: item.msg
          },
          unit: 'count',
          timestamp: new Date()
        });
        await reading.save();

        // Broadcast to district room
        if (io) {
          io.to(region.district).emit('sos_alert', populatedAlert);
        }
      }

      // Trigger immediate risk engine score recalculation
      const { calculateRiskScore } = await import('../services/riskEngine.js');
      const updatedRisk = await calculateRiskScore(region._id);

      return res.status(201).json({
        success: true,
        message: `Simulated a cluster of ${createdAlerts.length} alarms successfully`,
        data: createdAlerts,
        risk: updatedRisk
      });
    } catch (error) {
      console.error('Simulate cluster error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// GET /api/sos — List active alerts (scoped by user district/state)
router.get(
  '/',
  verifyToken,
  allowRoles('citizen', 'collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      let query = { status: 'active' };

      // Determine filters based on user role
      let districtFilter = null;
      let stateFilter = null;

      if (req.user.role === 'citizen' || req.user.role === 'collector' || req.user.role === 'district_authority') {
        districtFilter = req.user.district;
      } else if (req.user.role === 'state_authority') {
        stateFilter = req.user.state;
      } else {
        // NDMA can query any district or state
        if (req.query.district) districtFilter = req.query.district;
        if (req.query.state)    stateFilter = req.query.state;
      }

      if (districtFilter) {
        // Find regions in this district
        const regions = await Region.find({
          district: { $regex: new RegExp(districtFilter, 'i') },
        }).select('_id');

        const regionIds = regions.map((r) => r._id);
        query.regionId = { $in: regionIds };
      } else if (stateFilter) {
        // Find regions in this state
        const regions = await Region.find({
          state: { $regex: new RegExp(stateFilter, 'i') },
        }).select('_id');

        const regionIds = regions.map((r) => r._id);
        query.regionId = { $in: regionIds };
      }

      const alerts = await SOSAlert.find(query)
        .populate('userId', 'name email district')
        .populate('assignedTo', 'name email role')
        .populate('regionId', 'name district state')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts,
      });
    } catch (error) {
      console.error('GET /sos error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// PUT /api/sos/:id/acknowledge — Acknowledge SOS alert (collector+ roles)
router.put(
  '/:id/acknowledge',
  verifyToken,
  allowRoles('collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      const alert = await SOSAlert.findByIdAndUpdate(
        req.params.id,
        {
          status: 'acknowledged',
          assignedTo: req.user.userId,
        },
        { returnDocument: 'after', runValidators: true }
      )
        .populate('userId', 'name email district')
        .populate('assignedTo', 'name email role')
        .populate('regionId', 'name district state');

      if (!alert) {
        return res.status(404).json({ success: false, message: 'SOS Alert not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'SOS Alert acknowledged successfully',
        data: alert,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid Alert ID format' });
      }
      console.error('PUT /sos/:id/acknowledge error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// PUT /api/sos/:id/resolve — Resolve SOS alert (collector+ roles)
router.put(
  '/:id/resolve',
  verifyToken,
  allowRoles('collector', 'district_authority', 'state_authority', 'ndma'),
  async (req, res) => {
    try {
      const alert = await SOSAlert.findByIdAndUpdate(
        req.params.id,
        {
          status: 'resolved',
        },
        { returnDocument: 'after', runValidators: true }
      )
        .populate('userId', 'name email district')
        .populate('assignedTo', 'name email role')
        .populate('regionId', 'name district state');

      if (!alert) {
        return res.status(404).json({ success: false, message: 'SOS Alert not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'SOS Alert resolved successfully',
        data: alert,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid Alert ID format' });
      }
      console.error('PUT /sos/:id/resolve error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
