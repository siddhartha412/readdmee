// Enable fetch in CommonJS for Vercel/Node
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

let cache = {}; // { cityName: { data, timestamp } }
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Weather icons mapping
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
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "rain";
  if ([71, 73, 75, 77].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "clear";
}

// Escape XML safely for SVG text
function escapeXml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = async (req, res) => {
  try {
    // Extract city from URL
    const parts = req.url.split("/");
    const city = decodeURIComponent(parts.pop() || "").toLowerCase();

    if (!city) {
      return res.status(400).send("City name required");
    }

    // 🔹 Check cache
    if (cache[city] && Date.now() - cache[city].timestamp < CACHE_DURATION) {
      console.log(`Serving ${city} from cache (city)`);
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(cache[city].data);
    }

    // Step 1: Geocode
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}`
    );
    const geoData = await geoResp.json();
    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).send("City not found");
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // ✅ Avoid "India, India"
    let locationLabel = name;
    if (country && country.toLowerCase() !== name.toLowerCase()) {
      locationLabel += `, ${country}`;
    }

    // Step 2: Weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const weatherResp = await fetch(url);
    const weatherData = await weatherResp.json();

    if (!weatherData.current_weather) {
      return res.status(500).send("No weather data");
    }

    const cw = weatherData.current_weather;
    const conditionKey = mapWeatherCode(cw.weathercode);
    const iconData = weatherIcons[conditionKey] || { icon: "❓", color: "white" };

    const minTemp = weatherData.daily.temperature_2m_min[0];
    const maxTemp = weatherData.daily.temperature_2m_max[0];
    const precipitation = weatherData.daily.precipitation_sum[0];

    // Step 3: Build SVG
    const svg = `
<svg width="420" height="180" xmlns="http://www.w3.org/2000/svg">
  <style>
    .city { font-family: Verdana, sans-serif; font-size: 18px; fill: white; font-weight: bold; }
    .temp { font-family: Verdana, sans-serif; font-size: 18px; font-weight: bold; fill: ${iconData.color}; }
    .info { font-family: Verdana, sans-serif; font-size: 14px; fill: white; }
  </style>

  <rect width="420" height="180" rx="15" ry="15" fill="#1e1e1e"/>

  <text x="20" y="35" class="city">${escapeXml(locationLabel)}</text>
  <text x="400" y="35" class="temp" text-anchor="end">${cw.temperature}°C ${iconData.icon}</text>

  <text x="20" y="70" class="info">Min: ${minTemp}°C | Max: ${maxTemp}°C</text>
  <text x="20" y="100" class="info">Precipitation: ${precipitation} mm</text>
  <text x="20" y="130" class="info">Wind: ${cw.windspeed} km/h</text>
</svg>
    `;

    // Save to cache
    cache[city] = { data: svg, timestamp: Date.now() };

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching weather");
  }
};
