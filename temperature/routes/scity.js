const express = require("express");
const router = express.Router();

// Escape XML for SVG safety
function escapeXml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Map Open-Meteo weather codes → simple messages
function funMessage(code) {
  if (code === 0) return "Clear skies 🌞 — enjoy your day!";
  if ([1, 2, 3].includes(code)) return "A bit cloudy, but still nice! 😎";
  if ([45, 48].includes(code)) return "Foggy vibes 🌫️ — drive safe!";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "Yay !! it is rainy today 🌧️";
  if ([71, 73, 75, 77].includes(code)) return "Snow time ❄️⛄ — stay cozy!";
  if ([95, 96, 99].includes(code)) return "⚡ Thunder is rolling!";
  return "Weather looks fine! 😊";
}

router.get("/:cityName", async (req, res) => {
  const city = req.params.cityName;

  try {
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

    // Step 2: Weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    const weatherResp = await fetch(url);
    const weatherData = await weatherResp.json();

    if (!weatherData.current_weather) {
      return res.status(500).send("No weather data");
    }

    const cw = weatherData.current_weather;
    const temp = cw.temperature;
    const message = funMessage(cw.weathercode);

    // Step 3: Build small SVG
    const svg = `
<svg width="380" height="100" xmlns="http://www.w3.org/2000/svg">
  <style>
    .city { font-family: Verdana, sans-serif; font-size: 20px; fill: white; font-weight: bold; }
    .msg { font-family: Verdana, sans-serif; font-size: 14px; fill: orange; }
    .temp { font-family: Verdana, sans-serif; font-size: 14px; fill: skyblue; font-weight: bold; }
  </style>

  <rect width="380" height="100" rx="12" ry="12" fill="#1e1e1e"/>

  <!-- City -->
  <text x="20" y="40" class="city">${escapeXml(name)}, ${escapeXml(country)}</text>

  <!-- Fun message + Temp -->
  <text x="20" y="75" class="msg">
    ${escapeXml(message)} 
    <tspan class="temp">| ${temp}°C</tspan>
  </text>
</svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching weather");
  }
});

module.exports = router;
