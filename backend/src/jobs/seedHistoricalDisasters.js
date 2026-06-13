import mongoose from 'mongoose';
import Region from '../models/Region.js';
import DisasterEvent from '../models/DisasterEvent.js';
import SensorReading from '../models/SensorReading.js';

// Setup region structures
const regionsData = [
  {
    name: 'Kedarnath Valley',
    district: 'Rudraprayag',
    state: 'Uttarakhand',
    boundary: {
      type: 'Polygon',
      coordinates: [[[79.0, 30.7], [79.1, 30.7], [79.1, 30.8], [79.0, 30.8], [79.0, 30.7]]]
    },
    centroid: { type: 'Point', coordinates: [79.06, 30.73] },
    population: 12000,
  },
  {
    name: 'Nagapattinam Coastline',
    district: 'Nagapattinam',
    state: 'Tamil Nadu',
    boundary: {
      type: 'Polygon',
      coordinates: [[[79.8, 10.7], [79.9, 10.7], [79.9, 10.8], [79.8, 10.8], [79.8, 10.7]]]
    },
    centroid: { type: 'Point', coordinates: [79.84, 10.76] },
    population: 85000,
  },
  {
    name: 'Mumbai Metro Area',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    boundary: {
      type: 'Polygon',
      coordinates: [[[72.8, 19.0], [72.9, 19.0], [72.9, 19.1], [72.8, 19.1], [72.8, 19.0]]]
    },
    centroid: { type: 'Point', coordinates: [72.87, 19.07] },
    population: 12000000,
  },
  {
    name: 'Chamoli Valley',
    district: 'Chamoli',
    state: 'Uttarakhand',
    boundary: {
      type: 'Polygon',
      coordinates: [[[79.5, 30.3], [79.6, 30.3], [79.6, 30.5], [79.5, 30.5], [79.5, 30.3]]]
    },
    centroid: { type: 'Point', coordinates: [79.56, 30.40] },
    population: 25000,
  },
  {
    name: 'Chennai Zone 2',
    district: 'Chennai',
    state: 'Tamil Nadu',
    boundary: {
      type: 'Polygon',
      coordinates: [[[80.2, 13.0], [80.3, 13.0], [80.3, 13.1], [80.2, 13.1], [80.2, 13.0]]]
    },
    centroid: { type: 'Point', coordinates: [80.27, 13.08] },
    population: 4500000,
  },
  {
    name: 'Bhopal Metro',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    boundary: {
      type: 'Polygon',
      coordinates: [[[77.3, 23.2], [77.5, 23.2], [77.5, 23.3], [77.3, 23.3], [77.3, 23.2]]]
    },
    centroid: { type: 'Point', coordinates: [77.4126, 23.2599] },
    population: 2500000,
  },
  {
    name: 'Indore Zone 1',
    district: 'Indore',
    state: 'Madhya Pradesh',
    boundary: {
      type: 'Polygon',
      coordinates: [[[75.8, 22.7], [76.0, 22.7], [76.0, 22.8], [75.8, 22.8], [75.8, 22.7]]]
    },
    centroid: { type: 'Point', coordinates: [75.8577, 22.7196] },
    population: 3200000,
  }
];

export async function seedHistoricalDisasters() {
  console.log('[SEED] Seeding historical disasters and sensor readings...');
  
  // 1. Create Regions
  const createdRegions = {};
  for (const rData of regionsData) {
    let reg = await Region.findOne({ name: rData.name, district: rData.district });
    if (!reg) {
      reg = new Region(rData);
      await reg.save();
      console.log(`[SEED] Created Region: ${reg.name}`);
    } else {
      console.log(`[SEED] Region already exists: ${reg.name}`);
    }
    createdRegions[reg.name] = reg;
  }

  // 2. Clear old historical disaster events and sensor readings for these regions
  const regionIds = Object.values(createdRegions).map(r => r._id);
  await DisasterEvent.deleteMany({ regionId: { $in: regionIds } });
  
  // Wait, let's keep other sensor readings, but delete our seeded historical sensor readings
  await SensorReading.deleteMany({
    regionId: { $in: regionIds },
    sourceId: { $regex: /^seed_hist_/ }
  });

  // 3. Define Historical Disasters and their backdated sensor readings
  const eventsToSeed = [
    {
      name: '2013 Kedarnath Floods',
      type: 'flood',
      regionName: 'Kedarnath Valley',
      severity: 5,
      status: 'resolved',
      description: 'Extensive flash floods and landslide following heavy rainfall in Uttarakhand.',
      startTime: new Date('2013-06-16T07:00:00Z'),
      endTime: new Date('2013-06-17T20:00:00Z'),
      affectedPopulation: 50000,
      casualties: 5700,
      sourceData: { eventCode: 'KDR_2013' },
      readings: [
        { type: 'weather', source: 'seed_hist_kdr_w1', val: { rain1h: 90 }, unit: 'mm', offsetMin: -90 }, // 1.5h before
        { type: 'weather', source: 'seed_hist_kdr_w2', val: { rain1h: 120 }, unit: 'mm', offsetMin: -30 }, // 30m before
        { type: 'river_gauge', source: 'seed_hist_kdr_r1', val: { capacity: 95 }, unit: 'percent', offsetMin: -15 }, // 15m before
        { type: 'citizen_report', source: 'seed_hist_kdr_c1', val: { type: 'emergency', priority: 'emergency' }, unit: 'text', offsetMin: -10 },
        { type: 'air_quality', source: 'seed_hist_kdr_a1', val: { aqi: 45 }, unit: 'index', offsetMin: -120 }
      ]
    },
    {
      name: '2004 Indian Ocean Tsunami',
      type: 'other',
      regionName: 'Nagapattinam Coastline',
      severity: 5,
      status: 'resolved',
      description: 'Devastating tsunami wave following the Sumatra earthquake, impacting Tamil Nadu coastline.',
      startTime: new Date('2004-12-26T06:00:00Z'),
      endTime: new Date('2004-12-26T18:00:00Z'),
      affectedPopulation: 120000,
      casualties: 8000,
      sourceData: { eventCode: 'TSN_2004' },
      readings: [
        { type: 'seismic', source: 'seed_hist_tsn_s1', val: 8.9, unit: 'richter', offsetMin: -60 }, // 1h before
        { type: 'river_gauge', source: 'seed_hist_tsn_r1', val: { capacity: 99 }, unit: 'percent', offsetMin: -10 }, // 10m before (tide anomaly)
        { type: 'citizen_report', source: 'seed_hist_tsn_c1', val: { type: 'emergency', priority: 'emergency' }, unit: 'text', offsetMin: -5 },
        { type: 'weather', source: 'seed_hist_tsn_w1', val: { windSpeed: 25 }, unit: 'm/s', offsetMin: -45 },
        { type: 'social_media', source: 'seed_hist_tsn_sm1', val: { sentiment: 'negative_spike' }, unit: 'text', offsetMin: -30 }
      ]
    },
    {
      name: '2005 Mumbai Floods',
      type: 'flood',
      regionName: 'Mumbai Metro Area',
      severity: 4,
      status: 'resolved',
      description: 'Extreme cloudburst producing 944mm of rain in 24 hours causing severe flooding across Mumbai.',
      startTime: new Date('2005-07-26T14:00:00Z'),
      endTime: new Date('2005-07-27T08:00:00Z'),
      affectedPopulation: 2000000,
      casualties: 1095,
      sourceData: { eventCode: 'BOM_2005' },
      readings: [
        { type: 'weather', source: 'seed_hist_bom_w1', val: { rain1h: 65 }, unit: 'mm', offsetMin: -150 },
        { type: 'weather', source: 'seed_hist_bom_w2', val: { rain1h: 88 }, unit: 'mm', offsetMin: -90 },
        { type: 'river_gauge', source: 'seed_hist_bom_r1', val: { capacity: 85 }, unit: 'percent', offsetMin: -30 },
        { type: 'citizen_report', source: 'seed_hist_bom_c1', val: { type: 'emergency', priority: 'emergency' }, unit: 'text', offsetMin: -15 },
        { type: 'social_media', source: 'seed_hist_bom_sm1', val: { sentiment: 'negative_spike' }, unit: 'text', offsetMin: -45 }
      ]
    },
    {
      name: '2021 Chamoli Glacier Burst',
      type: 'other',
      regionName: 'Chamoli Valley',
      severity: 5,
      status: 'resolved',
      description: 'Glacial outburst in Chamoli district causing flash floods along Alaknanda and Dhauliganga rivers.',
      startTime: new Date('2021-02-07T10:00:00Z'),
      endTime: new Date('2021-02-07T22:00:00Z'),
      affectedPopulation: 8000,
      casualties: 200,
      sourceData: { eventCode: 'CHM_2021' },
      readings: [
        { type: 'seismic', source: 'seed_hist_chm_s1', val: 3.5, unit: 'richter', offsetMin: -40 },
        { type: 'river_gauge', source: 'seed_hist_chm_r1', val: { capacity: 99 }, unit: 'percent', offsetMin: -10 },
        { type: 'citizen_report', source: 'seed_hist_chm_c1', val: { type: 'emergency', priority: 'emergency' }, unit: 'text', offsetMin: -5 },
        { type: 'weather', source: 'seed_hist_chm_w1', val: { rain1h: 5 }, unit: 'mm', offsetMin: -120 }
      ]
    },
    {
      name: '2015 Chennai Floods',
      type: 'flood',
      regionName: 'Chennai Zone 2',
      severity: 4,
      status: 'resolved',
      description: 'Northeast monsoon cloudburst causing severe flooding and lake breaches across Chennai.',
      startTime: new Date('2015-12-01T12:00:00Z'),
      endTime: new Date('2015-12-02T16:00:00Z'),
      affectedPopulation: 800000,
      casualties: 500,
      sourceData: { eventCode: 'MAA_2015' },
      readings: [
        { type: 'weather', source: 'seed_hist_maa_w1', val: { rain1h: 52 }, unit: 'mm', offsetMin: -180 },
        { type: 'weather', source: 'seed_hist_maa_w2', val: { rain1h: 75 }, unit: 'mm', offsetMin: -60 },
        { type: 'river_gauge', source: 'seed_hist_maa_r1', val: { capacity: 88 }, unit: 'percent', offsetMin: -30 },
        { type: 'citizen_report', source: 'seed_hist_maa_c1', val: { type: 'emergency', priority: 'emergency' }, unit: 'text', offsetMin: -15 },
        { type: 'social_media', source: 'seed_hist_maa_sm1', val: { sentiment: 'negative_spike' }, unit: 'text', offsetMin: -45 }
      ]
    }
  ];

  for (const eInfo of eventsToSeed) {
    const region = createdRegions[eInfo.regionName];
    if (!region) continue;

    // Create DisasterEvent
    const dev = new DisasterEvent({
      name: eInfo.name,
      type: eInfo.type,
      regionId: region._id,
      severity: eInfo.severity,
      status: eInfo.status,
      description: eInfo.description,
      startTime: eInfo.startTime,
      endTime: eInfo.endTime,
      affectedPopulation: eInfo.affectedPopulation,
      casualties: eInfo.casualties,
      sourceData: eInfo.sourceData
    });
    await dev.save();
    console.log(`[SEED] Created DisasterEvent: ${dev.name}`);

    // Create backdated SensorReadings
    for (const r of eInfo.readings) {
      const readingTimestamp = new Date(eInfo.startTime.getTime() + r.offsetMin * 60 * 1000);
      const sr = new SensorReading({
        regionId: region._id,
        sourceType: r.type,
        sourceId: r.source,
        value: r.val,
        unit: r.unit,
        timestamp: readingTimestamp
      });
      await sr.save();
    }
    console.log(`[SEED] Seeded ${eInfo.readings.length} sensor readings for ${dev.name}`);
  }

  console.log('[SEED] Historical disasters seeding completed successfully.');
}
