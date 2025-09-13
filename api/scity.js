const express = require("express");
const router = express.Router();

// Map weather codes → fun message
function funMessage(code) {
  if (code === 0) return "Clear skies 🌞 — enjoy your day!";
  if ([1, 2, 3].includes(code)) return "A bit cloudy, but still nice!";
  if ([45, 48].includes(code)) return "Foggy vibes 🌫️ — drive safe!";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "Yay !! it is rainy today 🌧️";
  if ([71, 73, 75, 77].includes(code)) return "Snow time ❄️⛄ — stay cozy!";
  if ([95, 96, 99].includes(code)) return "⚡ Thunder is rolling!";
  return "Weather looks fine!";
}

router.get("/:cityName", async (req, res) => {
  const city = req.params.cityName;

  try {
    // Step 1: Geocode city → lat/lon
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`
    );
    const geoData = await geoResp.json();
    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "City not found" });
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: Fetch weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    const weatherResp = await fetch(url);
    const weatherData = await weatherResp.json();

    if (!weatherData.current_weather) {
      return res.status(500).json({ error: "No weather data" });
    }

    const cw = weatherData.current_weather;
    const temp = cw.temperature;
    const message = funMessage(cw.weathercode);

    // Step 3: Return JSON instead of SVG
    res.json({
      city: name,
      country,
      temperature: `${temp} °C`,
      message,
      weather_code: cw.weathercode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching weather" });
  }
});

module.exports = router;
