import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import Region from './src/models/Region.js';
import SensorReading from './src/models/SensorReading.js';

dotenv.config();

async function run() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.\n');

    console.log('Fetching all weather sensor readings...');
    const readings = await SensorReading.find({ sourceType: 'weather' })
      .populate('regionId')
      .sort({ timestamp: -1 });

    if (readings.length === 0) {
      console.log('No weather sensor readings found in the database.');
    } else {
      console.log(`Found ${readings.length} weather sensor reading(s):\n`);

      const formatted = readings.map((r, i) => {
        return {
          '#': i + 1,
          'Region / District': r.regionId ? `${r.regionId.name} (${r.regionId.district})` : 'Unknown',
          'Temp (°C)': r.value?.temp !== undefined ? r.value.temp : 'N/A',
          'Rain (1h)': r.value?.rain1h !== undefined ? `${r.value.rain1h} mm` : 'N/A',
          'Wind Speed': r.value?.windSpeed !== undefined ? `${r.value.windSpeed} m/s` : 'N/A',
          'Humidity': r.value?.humidity !== undefined ? `${r.value.humidity}%` : 'N/A',
          'Weather': r.value?.weatherMain ? `${r.value.weatherMain} (${r.value.weatherDesc || ''})` : 'N/A',
          'Station': r.metadata?.stationName || 'N/A',
          'Source ID': r.sourceId,
          'Timestamp': r.timestamp ? r.timestamp.toISOString() : 'N/A'
        };
      });

      console.table(formatted);
    }
  } catch (error) {
    console.error('Error querying weather:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit();
  }
}

run().catch(console.error);
