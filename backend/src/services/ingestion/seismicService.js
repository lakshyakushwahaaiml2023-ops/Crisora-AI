import SensorReading from '../../models/SensorReading.js';

/**
 * Fetch recent seismic activity (past 3 hours) near region coordinates from USGS Earthquake API,
 * map it to a SensorReading, and save it.
 * @param {string|mongoose.Types.ObjectId} regionId - Target region ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Saved SensorReading document
 */
export async function fetchAndSaveSeismic(regionId, lat, lng) {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=100&starttime=${threeHoursAgo}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`USGS Earthquake API error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    let maxMag = 0;
    let eventId = null;
    let eventPlace = null;
    let eventTime = null;

    if (data.features && data.features.length > 0) {
      for (const feature of data.features) {
        const mag = feature.properties?.mag;
        if (mag !== undefined && mag > maxMag) {
          maxMag = mag;
          eventId = feature.id;
          eventPlace = feature.properties?.place;
          eventTime = feature.properties?.time ? new Date(feature.properties.time) : null;
        }
      }
    }

    const reading = new SensorReading({
      regionId,
      sourceType: 'seismic',
      sourceId: eventId ? `usgs_${eventId}` : `usgs_none_${lat.toFixed(4)}_${lng.toFixed(4)}_${Date.now()}`,
      value: {
        magnitude: maxMag,
        eventId: eventId,
        place: eventPlace,
      },
      unit: 'Richter',
      timestamp: eventTime || new Date(),
      metadata: {
        queryRadiusKm: 100,
        eventCount: data.features ? data.features.length : 0,
        coord: { lat, lng }
      }
    });

    await reading.save();
    return reading;
  } catch (error) {
    console.error(`Error in fetchAndSaveSeismic for region ${regionId} (lat: ${lat}, lng: ${lng}):`, error);
    throw error;
  }
}
