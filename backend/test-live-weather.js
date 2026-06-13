import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import Region from './src/models/Region.js';
import { fetchAndSaveWeather } from './src/services/ingestion/weatherService.js';

dotenv.config();

console.log('='.repeat(60));
console.log('  TESTING LIVE WEATHER INGESTION');
console.log('='.repeat(60));

async function run() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // 1. Fetch the Bhopal region we created earlier
    const region = await Region.findOne({ name: 'Bhopal Sector 1' });
    if (!region) {
      throw new Error('Could not find the "Bhopal Sector 1" region. Did you delete it? Please run seeding first.');
    }
    console.log(`Found region: ${region.name} (ID: ${region._id})`);

    // Bhopal Coordinates
    const lat = 23.2599;
    const lng = 77.4126;

    console.log(`\nCalling fetchAndSaveWeather for Bhopal (lat: ${lat}, lng: ${lng})...`);
    
    // 2. Call the live ingestion service
    const reading = await fetchAndSaveWeather(region._id, lat, lng);

    console.log('\n✓ Weather Ingestion SUCCESSFUL! Live data saved to MongoDB:');
    console.log(`- Ingestion ID: ${reading._id}`);
    console.log(`- Source ID: ${reading.sourceId}`);
    console.log(`- Temperature: ${reading.value.temp} ${reading.unit}`);
    console.log(`- Weather: ${reading.value.weatherMain} (${reading.value.weatherDesc})`);
    console.log(`- Wind Speed: ${reading.value.windSpeed} m/s`);
    console.log(`- Humidity: ${reading.value.humidity}%`);
    console.log(`- Ingested Timestamp: ${reading.timestamp}`);
    console.log(`- Metadata Station Name: ${reading.metadata.stationName}`);

  } catch (error) {
    console.error('\n❌ Ingestion Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit();
  }
}

run().catch(console.error);
