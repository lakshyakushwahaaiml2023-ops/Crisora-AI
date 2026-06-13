import SensorReading from '../../models/SensorReading.js';

/**
 * Fetch current weather from OpenWeatherMap API, map it to a SensorReading, and save it.
 * @param {string|mongoose.Types.ObjectId} regionId - Target region ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Saved SensorReading document
 */
export async function fetchAndSaveWeather(regionId, lat, lng) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY is not defined in environment variables');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenWeatherMap API error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    // Map response to SensorReading schema structure
    const reading = new SensorReading({
      regionId,
      sourceType: 'weather',
      sourceId: `owm_${data.id || `${lat.toFixed(4)}_${lng.toFixed(4)}`}`,
      value: {
        temp: data.main?.temp,
        feelsLike: data.main?.feels_like,
        tempMin: data.main?.temp_min,
        tempMax: data.main?.temp_max,
        pressure: data.main?.pressure,
        humidity: data.main?.humidity,
        windSpeed: data.wind?.speed,
        windDeg: data.wind?.deg,
        rain1h: data.rain?.['1h'] || 0,
        clouds: data.clouds?.all || 0,
        weatherMain: data.weather?.[0]?.main,
        weatherDesc: data.weather?.[0]?.description,
      },
      unit: 'Celsius',
      timestamp: data.dt ? new Date(data.dt * 1000) : new Date(),
      metadata: {
        stationName: data.name,
        country: data.sys?.country,
        coord: {
          lon: data.coord?.lon ?? lng,
          lat: data.coord?.lat ?? lat,
        },
      },
    });

    await reading.save();
    return reading;
  } catch (error) {
    console.error(`Error in fetchAndSaveWeather for region ${regionId} (lat: ${lat}, lng: ${lng}):`, error);
    throw error;
  }
}
