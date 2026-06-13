import mongoose from 'mongoose';

const disasterEventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Disaster event name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['flood', 'earthquake', 'cyclone', 'landslide', 'drought', 'fire', 'other'],
        message: 'Invalid disaster type: {VALUE}',
      },
      required: [true, 'Disaster type is required'],
    },
    regionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region',
      required: [true, 'Region ID is required'],
    },
    severity: {
      type: Number,
      required: [true, 'Severity (1-5) is required'],
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: {
        values: ['watch', 'warning', 'active', 'resolved'],
        message: 'Invalid disaster status: {VALUE}',
      },
      required: [true, 'Disaster status is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
    },
    affectedPopulation: {
      type: Number,
      min: 0,
    },
    casualties: {
      type: Number,
      min: 0,
    },
    sourceData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const DisasterEvent = mongoose.model('DisasterEvent', disasterEventSchema);

export default DisasterEvent;
