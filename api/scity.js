// api/scity.js

let cache = {}; // { cityName: { data, timestamp } }
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Escape XML safely
function escapeXml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Fun message
function funMessage(code) {
  if (code === 0) return "Clear skies 🌞";
  if ([1, 2, 3].includes(code)) return "A bit cloudy ☁️";
  if ([45, 48].includes(code)) return "Foggy 🌫️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "Rainy 🌧️";
  if ([71, 73, 75, 77].includes(code)) return "Snow ❄️";
  if ([95, 96, 99].includes(code)) return "Thunder ⚡";
  return "Weather looks fine!";
}

export default async function handler(req, res) {
  const { cityName } = req.query;

  if (!cityName) {
    return res.status(400).send("cityName is required");
  }

  const city = cityName.toLowerCase();

  // Check cache
  if (cache[city] && Date.now() - cache[city].timestamp < CACHE_DURATION) {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.status(200).send(cache[city].data);
  }

  try {
    // Geocode
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`
    );
    const geoData = await geoResp.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).send("City not found");
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    const weatherResp = await fetch(url);
    const weatherData = await weatherResp.json();

    if (!weatherData.current_weather) {
      return res.status(500).send("No weather data");
    }

    const cw = weatherData.current_weather;
    const temp = cw.temperature;
    const message = funMessage(cw.weathercode);

    // Build SVG
    const svg = `
<svg width="420" height="120" xmlns="http://www.w3.org/2000/svg">
  <style>
    .city { font-family: Verdana, sans-serif; font-size: 18px; fill: white; font-weight: bold; }
    .temp { font-family: Verdana, sans-serif; font-size: 18px; font-weight: bold; fill: skyblue; }
    .info { font-family: Verdana, sans-serif; font-size: 14px; fill: orange; }
  </style>

  <rect width="420" height="120" rx="15" ry="15" fill="#1e1e1e"/>

  <text x="20" y="35" class="city">${escapeXml(name)}, ${escapeXml(country)}</text>
  <text x="400" y="35" class="temp" text-anchor="end">${temp}°C</text>

  <text x="20" y="75" class="info">${escapeXml(message)}</text>
</svg>`;

    // Cache
    cache[city] = { data: svg, timestamp: Date.now() };

    res.setHeader("Content-Type", "image/svg+xml");
    res.status(200).send(svg);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching weather");
  }
}
