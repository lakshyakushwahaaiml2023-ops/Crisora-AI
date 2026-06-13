import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Region from './src/models/Region.js';
import SensorReading from './src/models/SensorReading.js';

dotenv.config();

async function run() {
  try {
    await connectDB();
    
    const readings = await SensorReading.find({ sourceType: 'weather' })
      .populate('regionId')
      .sort({ timestamp: -1 });

    const artifactDir = 'C:\\Users\\PREDATOR\\.gemini\\antigravity\\brain\\ffa097d5-10c4-47a2-bfa6-6598507f9852';
    const filePath = path.join(artifactDir, 'weather_source_entries.md');

    let markdown = `# Weather Source Entries\n\n`;
    markdown += `This document contains the complete list of all **${readings.length}** weather sensor readings stored in the database. These are a mix of live OpenWeatherMap API updates and pre-populated historical mock data.\n\n`;
    
    markdown += `| # | Region / District | Temp (°C) | Rain (1h) | Wind Speed | Humidity | Weather Description | Station / Source ID | Timestamp |\n`;
    markdown += `|---|---|---|---|---|---|---|---|---|\n`;

    readings.forEach((r, idx) => {
      const region = r.regionId ? `${r.regionId.name} (${r.regionId.district})` : 'Unknown';
      const temp = r.value?.temp !== undefined ? `${r.value.temp}°C` : 'N/A';
      const rain = r.value?.rain1h !== undefined ? `${r.value.rain1h} mm` : 'N/A';
      const wind = r.value?.windSpeed !== undefined ? `${r.value.windSpeed} m/s` : 'N/A';
      const hum = r.value?.humidity !== undefined ? `${r.value.humidity}%` : 'N/A';
      const weather = r.value?.weatherMain ? `${r.value.weatherMain} (${r.value.weatherDesc || ''})` : 'N/A';
      const sourceId = r.sourceId;
      const ts = r.timestamp ? r.timestamp.toISOString() : 'N/A';

      markdown += `| ${idx + 1} | ${region} | ${temp} | ${rain} | ${wind} | ${hum} | ${weather} | ${sourceId} | ${ts} |\n`;
    });

    fs.writeFileSync(filePath, markdown, 'utf8');
    console.log(`Markdown table written successfully to: ${filePath}`);

  } catch (error) {
    console.error('Error generating markdown:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

run().catch(console.error);
