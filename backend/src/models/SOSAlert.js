import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false }
);

const sosAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    location: {
      type: pointSchema,
      required: [true, 'SOS location (GeoJSON Point) is required'],
    },
    message: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['medical', 'flood', 'fire', 'trapped', 'other'],
        message: 'Alert type must be medical, flood, fire, trapped, or other',
      },
      required: [true, 'SOS alert type is required'],
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    regionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region',
    },
  },
  {
    timestamps: true,
  }
);

// Geo-spatial index for location-based queries
sosAlertSchema.index({ location: '2dsphere' });

const SOSAlert = mongoose.model('SOSAlert', sosAlertSchema);

export default SOSAlert;
