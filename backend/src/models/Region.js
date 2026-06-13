import mongoose from 'mongoose';

// ── Sub-schema: GeoJSON Point ──────────────────────────────────────────────
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
}, { _id: false });

// ── Sub-schema: GeoJSON Polygon ────────────────────────────────────────────
const polygonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    default: 'Polygon',
  },
  coordinates: {
    type: [[[Number]]], // Array of rings, each ring is an array of [lng, lat] pairs
    required: true,
  },
}, { _id: false });

// ── Sub-schema: GeoJSON LineString ─────────────────────────────────────────
const lineStringSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LineString'],
    default: 'LineString',
  },
  coordinates: {
    type: [[Number]], // Array of [longitude, latitude] pairs
    required: true,
  },
}, { _id: false });

// ── Sub-schema: Resource ───────────────────────────────────────────────────
const resourceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
  },
  count: {
    type: Number,
    required: true,
    min: 0,
  },
  location: pointSchema,
}, { _id: false });

// ── Sub-schema: Evacuation Route ───────────────────────────────────────────
const evacuationRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  path: {
    type: lineStringSchema,
    required: true,
  },
  capacity: {
    type: Number,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active',
  },
}, { _id: true });

// ── Main Region Schema ─────────────────────────────────────────────────────
const regionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Region name is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    boundary: {
      type: polygonSchema,
      required: [true, 'Region boundary (GeoJSON Polygon) is required'],
    },
    centroid: {
      type: pointSchema,
      required: [true, 'Region centroid (GeoJSON Point) is required'],
    },
    population: {
      type: Number,
      min: 0,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: {
        values: ['green', 'yellow', 'orange', 'red'],
        message: 'Risk level must be green, yellow, orange, or red',
      },
      default: 'green',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    resources: {
      type: [resourceSchema],
      default: [],
    },
    evacuationRoutes: {
      type: [evacuationRouteSchema],
      default: [],
    },
    // References to Disaster event IDs (stored as strings for flexibility)
    historicalDisasters: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ── 2dsphere indexes for geospatial queries ────────────────────────────────
regionSchema.index({ boundary: '2dsphere' });
regionSchema.index({ centroid: '2dsphere' });

// ── Compound index for common filter queries ───────────────────────────────
regionSchema.index({ district: 1, state: 1 });
regionSchema.index({ riskLevel: 1 });

const Region = mongoose.model('Region', regionSchema);

export default Region;
