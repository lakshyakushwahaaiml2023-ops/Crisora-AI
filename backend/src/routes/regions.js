import express from 'express';
import Joi from 'joi';
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

const polygonJoi = Joi.object({
  type: Joi.string().valid('Polygon').default('Polygon'),
  coordinates: Joi.array()
    .items(Joi.array().items(Joi.array().items(Joi.number()).length(2)))
    .min(1)
    .required()
    .messages({ 'array.min': 'Polygon must have at least one ring of coordinates' }),
});

const lineStringJoi = Joi.object({
  type: Joi.string().valid('LineString').default('LineString'),
  coordinates: Joi.array().items(Joi.array().items(Joi.number()).length(2)).min(2).required(),
});

const createRegionSchema = Joi.object({
  name:       Joi.string().required(),
  district:   Joi.string().required(),
  state:      Joi.string().required(),
  boundary:   polygonJoi.required(),
  centroid:   pointJoi.required(),
  population: Joi.number().min(0),
  riskScore:  Joi.number().min(0).max(100).default(0),
  riskLevel:  Joi.string().valid('green', 'yellow', 'orange', 'red').default('green'),
  resources: Joi.array().items(
    Joi.object({
      type:     Joi.string().required(),
      count:    Joi.number().min(0).required(),
      location: pointJoi,
    })
  ),
  evacuationRoutes: Joi.array().items(
    Joi.object({
      name:     Joi.string().required(),
      path:     lineStringJoi.required(),
      capacity: Joi.number().min(0),
      status:   Joi.string().valid('active', 'blocked').default('active'),
    })
  ),
  historicalDisasters: Joi.array().items(Joi.string()),
});

const updateRiskSchema = Joi.object({
  riskScore: Joi.number().min(0).max(100).required()
    .messages({ 'any.required': 'riskScore (0–100) is required' }),
  riskLevel: Joi.string().valid('green', 'yellow', 'orange', 'red').required()
    .messages({ 'any.required': 'riskLevel is required' }),
});

const featureJoi = Joi.object({
  type: Joi.string().valid('Feature').required(),
  geometry: lineStringJoi.required(),
  properties: Joi.object({
    name: Joi.string().allow('', null),
    capacity: Joi.number().min(0).allow(null),
    status: Joi.string().valid('active', 'blocked').default('active'),
  }).default({}),
});

const featureCollectionJoi = Joi.object({
  type: Joi.string().valid('FeatureCollection').required(),
  features: Joi.array().items(featureJoi).min(1).required(),
});

const postEvacuationRouteSchema = Joi.alternatives().try(
  // 1. Array of standard route objects
  Joi.array().items(
    Joi.object({
      name:     Joi.string().required(),
      path:     lineStringJoi.required(),
      capacity: Joi.number().min(0),
      status:   Joi.string().valid('active', 'blocked').default('active'),
    })
  ),
  // 2. Single standard route object
  Joi.object({
    name:     Joi.string().required(),
    path:     lineStringJoi.required(),
    capacity: Joi.number().min(0),
    status:   Joi.string().valid('active', 'blocked').default('active'),
  }),
  // 3. GeoJSON Feature
  featureJoi,
  // 4. GeoJSON FeatureCollection
  featureCollectionJoi
);

// ── Normalization Helper ─────────────────────────────────────────────────────
function normalizeEvacuationRoutes(body) {
  // 1. FeatureCollection
  if (body.type === 'FeatureCollection') {
    return body.features.map((f, index) => ({
      name: f.properties?.name || `Evacuation Route ${index + 1}`,
      path: f.geometry,
      capacity: f.properties?.capacity,
      status: f.properties?.status || 'active',
    }));
  }

  // 2. Feature
  if (body.type === 'Feature') {
    return [{
      name: body.properties?.name || 'Evacuation Route',
      path: body.geometry,
      capacity: body.properties?.capacity,
      status: body.properties?.status || 'active',
    }];
  }

  // 3. Array of standard objects
  if (Array.isArray(body)) {
    return body.map((r) => ({
      name:     r.name,
      path:     r.path,
      capacity: r.capacity,
      status:   r.status || 'active',
    }));
  }

  // 4. Single standard object
  return [{
    name:     body.name,
    path:     body.path,
    capacity: body.capacity,
    status:   body.status || 'active',
  }];
}


// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/regions — List all regions, scoped by user district/state
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, riskLevel } = req.query;

    const filter = {};
    if (riskLevel) filter.riskLevel = riskLevel;

    // Scope filtering based on user role
    if (req.user.role === 'citizen' || req.user.role === 'collector' || req.user.role === 'district_authority') {
      filter.district = { $regex: new RegExp(req.user.district, 'i') };
    } else if (req.user.role === 'state_authority') {
      filter.state = { $regex: new RegExp(req.user.state, 'i') };
    } else {
      // NDMA can specify via query parameters
      if (req.query.district) filter.district = { $regex: new RegExp(req.query.district, 'i') };
      if (req.query.state)    filter.state    = { $regex: new RegExp(req.query.state, 'i') };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [regions, total] = await Promise.all([
      Region.find(filter)
        .select('-evacuationRoutes -resources -historicalDisasters') // lean list view
        .sort({ riskScore: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Region.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: regions,
    });
  } catch (error) {
    console.error('GET /regions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/regions/:id — Single region with full detail
router.get('/:id', async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);
    if (!region) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }
    return res.status(200).json({ success: true, data: region });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid region ID format' });
    }
    console.error('GET /regions/:id error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/regions — Create region (ndma / state_authority only)
router.post(
  '/',
  verifyToken,
  allowRoles('ndma', 'state_authority'),
  async (req, res) => {
    try {
      const { error, value } = createRegionSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((d) => d.message);
        return res.status(400).json({ success: false, errors });
      }

      const region = new Region({ ...value, lastUpdated: new Date() });
      await region.save();

      return res.status(201).json({ success: true, data: region });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Region with this name already exists in the district' });
      }
      console.error('POST /regions error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// PUT /api/regions/:id/risk — Update riskScore and riskLevel (protected — any authenticated role)
router.put(
  '/:id/risk',
  verifyToken,
  allowRoles('ndma', 'state_authority', 'district_authority', 'collector'),
  async (req, res) => {
    try {
      const { error, value } = updateRiskSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((d) => d.message);
        return res.status(400).json({ success: false, errors });
      }

      const region = await Region.findByIdAndUpdate(
        req.params.id,
        {
          riskScore:   value.riskScore,
          riskLevel:   value.riskLevel,
          lastUpdated: new Date(),
        },
        { returnDocument: 'after', runValidators: true }
      );

      if (!region) {
        return res.status(404).json({ success: false, message: 'Region not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Risk level updated successfully',
        data: {
          _id:         region._id,
          name:        region.name,
          district:    region.district,
          riskScore:   region.riskScore,
          riskLevel:   region.riskLevel,
          lastUpdated: region.lastUpdated,
        },
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid region ID format' });
      }
      console.error('PUT /regions/:id/risk error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// GET /api/regions/:id/evacuation-routes — Public, return evacuation routes for a region
router.get('/:id/evacuation-routes', async (req, res) => {
  try {
    const region = await Region.findById(req.params.id).select('name district evacuationRoutes');
    if (!region) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }
    return res.status(200).json({
      success: true,
      region: region.name,
      district: region.district,
      total: region.evacuationRoutes.length,
      evacuationRoutes: region.evacuationRoutes,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid region ID format' });
    }
    console.error('GET /regions/:id/evacuation-routes error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/regions/:id/evacuation-routes — Add evacuation routes (protected)
router.post(
  '/:id/evacuation-routes',
  verifyToken,
  allowRoles('ndma', 'state_authority', 'district_authority', 'collector'),
  async (req, res) => {
    try {
      const { error, value } = postEvacuationRouteSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((d) => d.message);
        return res.status(400).json({ success: false, errors });
      }

      const region = await Region.findById(req.params.id);
      if (!region) {
        return res.status(404).json({ success: false, message: 'Region not found' });
      }

      const newRoutes = normalizeEvacuationRoutes(value);
      const countBefore = region.evacuationRoutes.length;

      region.evacuationRoutes.push(...newRoutes);
      region.lastUpdated = new Date();
      await region.save();

      const addedRoutes = region.evacuationRoutes.slice(countBefore);

      return res.status(201).json({
        success: true,
        message: 'Evacuation routes added successfully',
        addedRoutes,
        data: region.evacuationRoutes,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid region ID format' });
      }
      console.error('POST /regions/:id/evacuation-routes error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
