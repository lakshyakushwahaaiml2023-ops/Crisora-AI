import cron from 'node-cron';
import Region from '../models/Region.js';
import SensorReading from '../models/SensorReading.js';
import { fetchAndSaveWeather } from '../services/ingestion/weatherService.js';
import { fetchAndSaveSeismic } from '../services/ingestion/seismicService.js';
import { fetchAndSaveRiverGauge } from '../services/ingestion/riverGaugeService.js';
import { calculateRiskScore } from '../services/riskEngine.js';

// In-memory jobs last-run timestamps and status tracker
export const jobStatus = {
  weatherJob: {
    running: false,
    lastRun: null,
    status: 'idle',
  },
  seismicJob: {
    running: false,
    lastRun: null,
    status: 'idle',
  },
  riverGaugeJob: {
    running: false,
    lastRun: null,
    status: 'idle',
  },
  citizenReportJob: {
    running: false,
    lastRun: null,
    status: 'idle',
  },
};

// 1. Weather Ingestion & Risk Recalculation (Every 15 minutes)
// Cron: */15 * * * *
export const weatherCron = cron.schedule('*/15 * * * *', async () => {
  console.log('[CRON] Starting weather ingestion and risk scoring job...');
  jobStatus.weatherJob.running = true;
  jobStatus.weatherJob.status = 'running';
  jobStatus.weatherJob.lastRun = new Date();

  try {
    const regions = await Region.find({});
    console.log(`[CRON] Found ${regions.length} regions for weather update.`);

    for (const region of regions) {
      try {
        const [lng, lat] = region.centroid.coordinates;
        console.log(`[CRON] Processing weather for region: ${region.name} (${region._id})`);
        
        // Fetch and ingest weather data
        await fetchAndSaveWeather(region._id, lat, lng);
        
        // Recalculate risk score
        await calculateRiskScore(region._id);
      } catch (err) {
        console.error(`[CRON] Error processing weather for region ${region._id}:`, err.message);
      }
    }
    jobStatus.weatherJob.status = 'success';
  } catch (error) {
    console.error('[CRON] Weather Job execution failed:', error);
    jobStatus.weatherJob.status = 'failed';
  } finally {
    jobStatus.weatherJob.running = false;
  }
}, { scheduled: false });

// 2. River Gauge Telemetry Ingestion (Every 30 minutes)
// Cron: */30 * * * *
export const riverGaugeCron = cron.schedule('*/30 * * * *', async () => {
  console.log('[CRON] Starting river gauge telemetry ingestion job...');
  jobStatus.riverGaugeJob.running = true;
  jobStatus.riverGaugeJob.status = 'running';
  jobStatus.riverGaugeJob.lastRun = new Date();

  try {
    const regions = await Region.find({});
    console.log(`[CRON] Found ${regions.length} regions for river gauge update.`);

    for (const region of regions) {
      try {
        const [lng, lat] = region.centroid.coordinates;
        console.log(`[CRON] Processing river gauge for region: ${region.name} (${region._id})`);
        
        // Fetch and ingest river gauge data
        await fetchAndSaveRiverGauge(region._id, lat, lng, region.name);
        
        // Recalculate risk score
        await calculateRiskScore(region._id);
      } catch (err) {
        console.error(`[CRON] Error processing river gauge for region ${region._id}:`, err.message);
      }
    }
    jobStatus.riverGaugeJob.status = 'success';
  } catch (error) {
    console.error('[CRON] River Gauge Job execution failed:', error);
    jobStatus.riverGaugeJob.status = 'failed';
  } finally {
    jobStatus.riverGaugeJob.running = false;
  }
}, { scheduled: false });

// 3. Seismic Telemetry Ingestion (Every 15 minutes)
// Cron: */15 * * * *
export const seismicCron = cron.schedule('*/15 * * * *', async () => {
  console.log('[CRON] Starting seismic activity ingestion job...');
  jobStatus.seismicJob.running = true;
  jobStatus.seismicJob.status = 'running';
  jobStatus.seismicJob.lastRun = new Date();

  try {
    const regions = await Region.find({});
    console.log(`[CRON] Found ${regions.length} regions for seismic update.`);

    for (const region of regions) {
      try {
        const [lng, lat] = region.centroid.coordinates;
        console.log(`[CRON] Processing seismic for region: ${region.name} (${region._id})`);
        
        // Fetch and ingest seismic data
        await fetchAndSaveSeismic(region._id, lat, lng);
        
        // Recalculate risk score
        await calculateRiskScore(region._id);
      } catch (err) {
        console.error(`[CRON] Error processing seismic for region ${region._id}:`, err.message);
      }
    }
    jobStatus.seismicJob.status = 'success';
  } catch (error) {
    console.error('[CRON] Seismic Job execution failed:', error);
    jobStatus.seismicJob.status = 'failed';
  } finally {
    jobStatus.seismicJob.running = false;
  }
}, { scheduled: false });

// 4. Citizen Report Processing & Risk Update (Every 5 minutes)
// Cron: */5 * * * *
export const citizenReportCron = cron.schedule('*/5 * * * *', async () => {
  console.log('[CRON] Starting citizen reports risk update job...');
  jobStatus.citizenReportJob.running = true;
  jobStatus.citizenReportJob.status = 'running';
  jobStatus.citizenReportJob.lastRun = new Date();

  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Fetch citizen reports that arrived in the last 5 minutes
    const recentReports = await SensorReading.find({
      sourceType: 'citizen_report',
      timestamp: { $gte: fiveMinsAgo },
    });

    const uniqueRegionIds = [...new Set(recentReports.map(r => r.regionId.toString()))];
    console.log(`[CRON] Found emergency reports in ${uniqueRegionIds.length} unique regions.`);

    for (const regionId of uniqueRegionIds) {
      try {
        console.log(`[CRON] Recalculating risk for region ID: ${regionId}`);
        await calculateRiskScore(regionId);
      } catch (err) {
        console.error(`[CRON] Error recalculating risk for region ${regionId}:`, err.message);
      }
    }
    jobStatus.citizenReportJob.status = 'success';
  } catch (error) {
    console.error('[CRON] Citizen Report Job execution failed:', error);
    jobStatus.citizenReportJob.status = 'failed';
  } finally {
    jobStatus.citizenReportJob.running = false;
  }
}, { scheduled: false });

/**
 * Start all periodic scheduled cron tasks
 */
export function startAllJobs() {
  weatherCron.start();
  seismicCron.start();
  riverGaugeCron.start();
  citizenReportCron.start();
  console.log('All scheduler cron jobs started.');
}
