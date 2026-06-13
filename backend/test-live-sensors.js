import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import Region from './src/models/Region.js';
import { fetchAndSaveSeismic } from './src/services/ingestion/seismicService.js';
import { fetchAndSaveRiverGauge } from './src/services/ingestion/riverGaugeService.js';

dotenv.config();

console.log('='.repeat(60));
console.log('  TESTING LIVE SEISMIC & RIVER GAUGE INGESTION');
console.log('='.repeat(60));

async function run() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // 1. Fetch Bhopal Metro region
    const region = await Region.findOne({ name: 'Bhopal Metro' });
    if (!region) {
      throw new Error('Could not find the "Bhopal Metro" region. Please ensure your database is seeded.');
    }
    console.log(`\nFound target region: ${region.name} (ID: ${region._id})`);
    const [lng, lat] = region.centroid.coordinates;
    console.log(`Centroid coordinates: Latitude = ${lat}, Longitude = ${lng}`);

    // 2. Call live Seismic service
    console.log('\nExecuting fetchAndSaveSeismic...');
    const seismicReading = await fetchAndSaveSeismic(region._id, lat, lng);
    console.log('✓ Seismic Ingestion SUCCESSFUL!');
    console.log(`- Reading ID: ${seismicReading._id}`);
    console.log(`- Source ID: ${seismicReading.sourceId}`);
    console.log(`- Magnitude: ${seismicReading.value.magnitude} ${seismicReading.unit}`);
    console.log(`- Event ID: ${seismicReading.value.eventId || 'None (No active earthquakes)'}`);
    console.log(`- Place: ${seismicReading.value.place || 'N/A'}`);
    console.log(`- Timestamp: ${seismicReading.timestamp}`);

    // 3. Call live River Gauge service
    console.log('\nExecuting fetchAndSaveRiverGauge...');
    const gaugeReading = await fetchAndSaveRiverGauge(region._id, lat, lng, region.name);
    console.log('✓ River Gauge Ingestion SUCCESSFUL!');
    console.log(`- Reading ID: ${gaugeReading._id}`);
    console.log(`- Source ID: ${gaugeReading.sourceId}`);
    console.log(`- Capacity: ${gaugeReading.value.capacity}%`);
    console.log(`- Discharge Rate: ${gaugeReading.value.discharge} m³/s`);
    console.log(`- Threshold: ${gaugeReading.metadata.thresholdM3s} m³/s`);
    console.log(`- Timestamp: ${gaugeReading.timestamp}`);

    // 4. Trigger Risk Engine Calculation
    console.log('\nExecuting calculateRiskScore...');
    const { calculateRiskScore } = await import('./src/services/riskEngine.js');
    const riskResult = await calculateRiskScore(region._id);
    console.log('✓ Risk Engine Recalculation SUCCESSFUL!');
    console.log(`- Updated Risk Score: ${riskResult.riskScore}`);
    console.log(`- Updated Risk Level: ${riskResult.riskLevel}`);

  } catch (error) {
    console.error('\n❌ Live Sensor Test Failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit();
  }
}

run().catch(console.error);
