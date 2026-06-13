import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema(
  {
    regionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region',
      required: [true, 'Region ID is required'],
    },
    sourceType: {
      type: String,
      enum: {
        values: [
          'weather',
          'river_gauge',
          'seismic',
          'social_media',
          'drone',
          'citizen_report',
          'air_quality',
        ],
        message: 'Invalid sourceType: {VALUE}',
      },
      required: [true, 'Source type is required'],
    },
    sourceId: {
      type: String,
      required: [true, 'Source ID is required'],
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Sensor value is required'],
    },
    unit: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on regionId + sourceType + timestamp
sensorReadingSchema.index({ regionId: 1, sourceType: 1, timestamp: -1 });

const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);

export default SensorReading;
