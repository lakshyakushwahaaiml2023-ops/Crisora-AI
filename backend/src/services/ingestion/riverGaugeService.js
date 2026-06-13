import SensorReading from '../../models/SensorReading.js';
import Region from '../../models/Region.js';

/**
 * Maps a region name to a typical flood capacity threshold in m³/s.
 * @param {string} name - Region name
 * @returns {number} Threshold value in m³/s
 */
function getRegionThreshold(name) {
  const n = name?.toLowerCase() || '';
  if (n.includes('kedarnath')) return 20;
  if (n.includes('chamoli')) return 20;
  if (n.includes('bhopal')) return 50;
  if (n.includes('indore')) return 50;
  if (n.includes('chennai')) return 150;
  if (n.includes('nagapattinam')) return 150;
  if (n.includes('mumbai')) return 200;
  return 50; // Default fallback threshold
}

/**
 * Fetch current daily river discharge forecast from Open-Meteo Flood API,
 * map it to a capacity percentage, and save it as a SensorReading.
 * @param {string|mongoose.Types.ObjectId} regionId - Target region ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} [regionName] - Optional region name to save DB query
 * @returns {Promise<object>} Saved SensorReading document
 */
export async function fetchAndSaveRiverGauge(regionId, lat, lng, regionName) {
  let name = regionName;
  if (!name) {
    const region = await Region.findById(regionId);
    name = region ? region.name : '';
  }

  const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&timezone=auto&forecast_days=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Open-Meteo Flood API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const discharge = data.daily?.river_discharge?.[0] ?? 0;
    
    const threshold = getRegionThreshold(name);
    // Compute capacity percentage (capped at 100)
    const capacityPercentage = Math.min((discharge / threshold) * 100, 100);

    const reading = new SensorReading({
      regionId,
      sourceType: 'river_gauge',
      sourceId: `openmeteo_${lat.toFixed(4)}_${lng.toFixed(4)}`,
      value: {
        capacity: Number(capacityPercentage.toFixed(2)),
        discharge: Number(discharge.toFixed(2)),
      },
      unit: 'percent',
      timestamp: new Date(),
      metadata: {
        thresholdM3s: threshold,
        stationCoord: { lat, lng }
      }
    });

    await reading.save();
    return reading;
  } catch (error) {
    console.error(`Error in fetchAndSaveRiverGauge for region ${regionId} (lat: ${lat}, lng: ${lng}):`, error);
    throw error;
  }
}
