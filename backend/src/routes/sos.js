import express from 'express';
import Joi from 'joi';
import SOSAlert from '../models/SOSAlert.js';
import Region from '../models/Region.js';
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

// POST /api/sos — Create SOS alert (citizen only)
router.post('/', verifyToken, allowRoles('citizen'), async (req, res) => {
  try {
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

    const alert = new SOSAlert({
      userId: req.user.userId,
      location,
      type,
      message,
      regionId,
      status: 'active',
    });

    await alert.save();

    // Populate alert data to send full details in socket broadcast
    const populatedAlert = await SOSAlert.findById(alert._id)
      .populate('userId', 'name email district')
      .populate('regionId', 'name district state');

    // Emit socket.io event to room named after the district
    const io = req.app.get('io');
    if (io && nearestRegion) {
      const roomName = nearestRegion.district;
      io.to(roomName).emit('sos_alert', populatedAlert);
      console.log(`SOS Alert emitted to Socket.io room '${roomName}'`);
    }

    return res.status(201).json({
      success: true,
      message: 'SOS Alert created successfully',
      data: populatedAlert,
    });
  } catch (error) {
    console.error('POST /sos error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

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
