const express = require("express");
const router = express.Router();

let cache = {}; // { cityName: { data, timestamp } }
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Weather icons mapping (expanded but trimmed for API use)
const weatherIcons = {
  clear: { icon: "☀️", color: "gold" },
  partly_cloudy: { icon: "🌤️", color: "orange" },
  cloudy: { icon: "☁️", color: "lightgray" },
  overcast: { icon: "☁️", color: "gray" },
  rain: { icon: "🌧️", color: "skyblue" },
  snow: { icon: "❄️", color: "white" },
  thunderstorms: { icon: "⛈️", color: "red" },
  fog: { icon: "🌫️", color: "silver" },
  haze: { icon: "🌁", color: "silver" },
  windy: { icon: "💨", color: "white" },
  hot: { icon: "🔥", color: "red" },
  cold: { icon: "❄️", color: "lightblue" },
  humid: { icon: "💧", color: "skyblue" },
  dry: { icon: "🏜️", color: "sandybrown" },
  volcanic_ash: { icon: "🌋", color: "darkred" }
};

// Map Open-Meteo weather codes → simplified keys
function mapWeatherCode(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "partly_cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "clear";
}

router.get("/:cityName", async (req, res) => {
  const city = req.params.cityName.toLowerCase();

  // 🔹 Step 1: Check cache
  if (cache[city] && Date.now() - cache[city].timestamp < CACHE_DURATION) {
    console.log(`Serving ${city} from cache (API)`);
    return res.json(cache[city].data);
  }

  try {
    // Step 2: Geocode
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`
    );
    const geoData = await geoResp.json();
    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "City not found" });
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 3: Weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const weatherResp = await fetch(url);
    const weatherData = await weatherResp.json();

    if (!weatherData.current_weather) {
      return res.status(500).json({ error: "No weather data" });
    }

    const cw = weatherData.current_weather;
    const conditionKey = mapWeatherCode(cw.weathercode);
    const iconData = weatherIcons[conditionKey] || { icon: "❓", color: "white" };

    const data = {
      city: name,
      country: country,
      latitude,
      longitude,
      temperature: cw.temperature,
      windspeed: cw.windspeed,
      weathercode: cw.weathercode,
      condition: conditionKey,
      icon: iconData.icon,
      color: iconData.color,
      minTemp: weatherData.daily.temperature_2m_min[0],
      maxTemp: weatherData.daily.temperature_2m_max[0],
      precipitation: weatherData.daily.precipitation_sum[0],
      timestamp: new Date().toISOString()
    };

    // Step 4: Cache
    cache[city] = { data, timestamp: Date.now() };

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching weather" });
  }
});

module.exports = router;
