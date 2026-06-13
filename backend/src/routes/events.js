import express from 'express';
import Joi from 'joi';
import DisasterEvent from '../models/DisasterEvent.js';
import Region from '../models/Region.js';
import verifyToken from '../middleware/auth.js';
import allowRoles from '../middleware/roleGuard.js';

const router = express.Router();

// ── Joi Schemas ──────────────────────────────────────────────────────────────
const createEventSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('flood', 'earthquake', 'cyclone', 'landslide', 'drought', 'fire', 'other').required(),
  regionId: Joi.string().required(),
  severity: Joi.number().min(1).max(5).required(),
  status: Joi.string().valid('watch', 'warning', 'active').required(),
  description: Joi.string().allow('', null),
  startTime: Joi.date().default(() => new Date()),
});

const resolveEventSchema = Joi.object({
  affectedPopulation: Joi.number().min(0).default(0),
  casualties: Joi.number().min(0).default(0),
});

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/events — List active/pending disaster events scoped by user district/state
router.get('/', verifyToken, async (req, res) => {
  try {
    // When ?all=true (reports page), include resolved events too
    const filter = req.query.all === 'true' ? {} : { status: { $ne: 'resolved' } };

    if (req.user.role === 'citizen' || req.user.role === 'collector' || req.user.role === 'district_authority') {
      const userRegions = await Region.find({ district: { $regex: new RegExp(req.user.district, 'i') } }).select('_id');
      const regionIds = userRegions.map(r => r._id);
      filter.regionId = { $in: regionIds };
    } else if (req.user.role === 'state_authority') {
      const userRegions = await Region.find({ state: { $regex: new RegExp(req.user.state, 'i') } }).select('_id');
      const regionIds = userRegions.map(r => r._id);
      filter.regionId = { $in: regionIds };
    } else if (req.user.role === 'ndma') {
      if (req.query.district) {
        const userRegions = await Region.find({ district: { $regex: new RegExp(req.query.district, 'i') } }).select('_id');
        filter.regionId = { $in: userRegions.map(r => r._id) };
      } else if (req.query.state) {
        const userRegions = await Region.find({ state: { $regex: new RegExp(req.query.state, 'i') } }).select('_id');
        filter.regionId = { $in: userRegions.map(r => r._id) };
      }
    }

    const events = await DisasterEvent.find(filter).populate('regionId').sort({ startTime: -1 });
    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/events — Create a new disaster event (Authorities only)
router.post(
  '/',
  verifyToken,
  allowRoles('ndma', 'state_authority', 'district_authority'),
  async (req, res) => {
    try {
      const { error, value } = createEventSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((d) => d.message);
        return res.status(400).json({ success: false, errors });
      }

      // Check if region exists
      const region = await Region.findById(value.regionId);
      if (!region) {
        return res.status(404).json({ success: false, message: 'Region not found' });
      }

      const event = new DisasterEvent({
        ...value,
        status: value.status || 'active',
      });
      await event.save();

      const populatedEvent = await DisasterEvent.findById(event._id).populate('regionId');

      // Emit socket broadcast to the district room
      const io = req.app.get('io');
      if (io) {
        const roomName = region.district;
        io.to(roomName).emit('new_disaster_event', populatedEvent);
        console.log(`Disaster Event emitted to socket room '${roomName}'`);
      }

      return res.status(201).json({
        success: true,
        message: 'Disaster event reported successfully',
        data: populatedEvent,
      });
    } catch (error) {
      console.error('POST /api/events error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// PUT /api/events/:id/resolve — Resolve a disaster event (Collectors + Authorities)
router.put(
  '/:id/resolve',
  verifyToken,
  allowRoles('ndma', 'state_authority', 'district_authority', 'collector'),
  async (req, res) => {
    try {
      const { error, value } = resolveEventSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      const event = await DisasterEvent.findById(req.params.id).populate('regionId');
      if (!event) {
        return res.status(404).json({ success: false, message: 'Disaster event not found' });
      }

      if (event.status === 'resolved') {
        return res.status(400).json({ success: false, message: 'Event is already resolved' });
      }

      event.status = 'resolved';
      event.endTime = new Date();
      event.affectedPopulation = value.affectedPopulation || 0;
      event.casualties = value.casualties || 0;
      await event.save();

      // Emit socket broadcast to district room
      const io = req.app.get('io');
      if (io && event.regionId) {
        const roomName = event.regionId.district;
        io.to(roomName).emit('resolve_disaster_event', event);
        console.log(`Disaster Event resolution emitted to socket room '${roomName}'`);
      }

      return res.status(200).json({
        success: true,
        message: 'Disaster event resolved successfully',
        data: event,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid Event ID format' });
      }
      console.error('PUT /api/events/:id/resolve error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
