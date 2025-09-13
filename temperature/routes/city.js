const express = require("express");
const router = express.Router();

let cache = {}; // { cityName: { data, timestamp } }
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in ms

// Weather icons mapping (expanded)
const weatherIcons = {
  clear: { icon: "☀️", color: "gold" },
  sunny: { icon: "☀️", color: "gold" },
  fair: { icon: "☀️", color: "gold" },
  fine: { icon: "☀️", color: "gold" },

  partly_cloudy: { icon: "🌤️", color: "orange" },
  sunny_intervals: { icon: "🌤️", color: "orange" },
  sunny_periods: { icon: "🌤️", color: "orange" },

  cloudy: { icon: "☁️", color: "lightgray" },
  mostly_cloudy: { icon: "☁️", color: "lightgray" },
  overcast: { icon: "☁️", color: "gray" },

  rain: { icon: "🌧️", color: "skyblue" },
  light_rain: { icon: "🌦️", color: "skyblue" },
  drizzle: { icon: "🌦️", color: "skyblue" },
  showers: { icon: "🌦️", color: "skyblue" },
  heavy_showers: { icon: "🌧️", color: "skyblue" },
  freezing_rain: { icon: "🌧️❄️", color: "lightblue" },

  thunderstorms: { icon: "⛈️", color: "red" },
  thundershowers: { icon: "⛈️", color: "red" },
  lightning: { icon: "⚡", color: "yellow" },
  storm: { icon: "🌪️", color: "darkgray" },
  hail: { icon: "🌨️", color: "lightblue" },

  snow: { icon: "❄️", color: "white" },
  light_snow: { icon: "🌨️", color: "white" },
  snow_showers: { icon: "🌨️", color: "white" },
  heavy_snow: { icon: "❄️❄️", color: "white" },
  blizzard: { icon: "🌬️❄️", color: "lightgray" },
  snowdrift: { icon: "❄️", color: "lightgray" },
  sleet: { icon: "🌨️💧", color: "lightblue" },

  fog: { icon: "🌫️", color: "silver" },
  mist: { icon: "🌫️", color: "silver" },
  haze: { icon: "🌁", color: "silver" },
  smoke: { icon: "💨", color: "gray" },

  sandstorm: { icon: "🌪️", color: "sandybrown" },
  duststorm: { icon: "🌪️", color: "tan" },
  sand: { icon: "🌫️", color: "sandybrown" },
  dust: { icon: "🌫️", color: "tan" },

  windy: { icon: "💨", color: "white" },
  gale: { icon: "💨", color: "lightgray" },
  squall: { icon: "💨", color: "gray" },

  hot: { icon: "🔥", color: "red" },
  cold: { icon: "❄️", color: "lightblue" },
  chilly: { icon: "🧥", color: "lightblue" },
  warm: { icon: "🌞", color: "orange" },
  cool: { icon: "🧊", color: "lightblue" },
  freezing: { icon: "🥶", color: "cyan" },
  frost: { icon: "❄️", color: "white" },

  humid: { icon: "💧", color: "skyblue" },
  dry: { icon: "🏜️", color: "sandybrown" },

  volcanic_ash: { icon: "🌋", color: "darkred" }
};

// Map descriptive condition → key
function mapCondition(desc = "") {
  desc = desc.toLowerCase();

  if (desc.includes("sandstorm")) return "sandstorm";
  if (desc.includes("duststorm")) return "duststorm";
  if (desc.includes("dust")) return "dust";
  if (desc.includes("sand")) return "sand";

  if (desc.includes("blizzard")) return "blizzard";
  if (desc.includes("snowdrift")) return "snowdrift";
  if (desc.includes("snowstorm")) return "blizzard";
  if (desc.includes("snow showers") || desc.includes("flurries")) return "snow_showers";
  if (desc.includes("heavy snow")) return "heavy_snow";
  if (desc.includes("light snow")) return "light_snow";
  if (desc.includes("snow")) return "snow";
  if (desc.includes("sleet")) return "sleet";

  if (desc.includes("hail")) return "hail";
  if (desc.includes("thundershower")) return "thundershowers";
  if (desc.includes("thunderstorm")) return "thunderstorms";
  if (desc.includes("lightning")) return "lightning";
  if (desc.includes("storm")) return "storm";

  if (desc.includes("drizzle") || desc.includes("light rain")) return "light_rain";
  if (desc.includes("showers")) return "showers";
  if (desc.includes("rain")) return "rain";
  if (desc.includes("freezing rain")) return "freezing_rain";

  if (desc.includes("fog")) return "fog";
  if (desc.includes("mist")) return "mist";
  if (desc.includes("haze")) return "haze";
  if (desc.includes("smoke")) return "smoke";

  if (desc.includes("overcast")) return "overcast";
  if (desc.includes("mostly cloudy") || desc.includes("cloudy")) return "cloudy";
  if (desc.includes("partly")) return "partly_cloudy";
  if (desc.includes("sunny interval")) return "sunny_intervals";
  if (desc.includes("sunny period")) return "sunny_periods";
  if (desc.includes("sunny") || desc.includes("clear") || desc.includes("fair") || desc.includes("fine"))
    return "clear";

  if (desc.includes("windy") || desc.includes("squall") || desc.includes("gale")) return "windy";

  if (desc.includes("hot")) return "hot";
  if (desc.includes("cold")) return "cold";
  if (desc.includes("chilly")) return "chilly";
  if (desc.includes("warm")) return "warm";
  if (desc.includes("cool")) return "cool";
  if (desc.includes("freezing")) return "freezing";
  if (desc.includes("frost")) return "frost";

  if (desc.includes("humid")) return "humid";
  if (desc.includes("dry")) return "dry";

  if (desc.includes("volcanic ash")) return "volcanic_ash";

  return "clear"; // default
}


function mapWeatherCode(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "partly_cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "clear";
}

function escapeXml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/:cityName", async (req, res) => {
  const city = req.params.cityName.toLowerCase();

  // 🔹 Step 1: Serve from cache if still valid
  if (cache[city] && Date.now() - cache[city].timestamp < CACHE_DURATION) {
    console.log(`Serving ${city} from cache`);
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(cache[city].data);
  }

  try {
    // Step 2: Geocode city
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`
    );
    const geoData = await geoResp.json();
    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).send("City not found");
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 3: Fetch weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const weatherResp = await fetch(url);
    const weatherData = await weatherResp.json();

    const cw = weatherData.current_weather;
    const temp = cw.temperature;
    const windSpeed = cw.windspeed;
    const conditionKey = mapWeatherCode(cw.weathercode);
    const iconData = weatherIcons[conditionKey] || { icon: "☀️", color: "gold" };

    const minTemp = weatherData.daily.temperature_2m_min[0];
    const maxTemp = weatherData.daily.temperature_2m_max[0];
    const precipitation = weatherData.daily.precipitation_sum[0];

    // Step 4: Build SVG
    const svg = `
<svg width="420" height="180" xmlns="http://www.w3.org/2000/svg">
  <style>
    .city { font-family: Verdana, sans-serif; font-size: 18px; fill: white; font-weight: bold; }
    .temp { font-family: Verdana, sans-serif; font-size: 18px; font-weight: bold; fill: ${iconData.color}; }
    .info { font-family: Verdana, sans-serif; font-size: 14px; fill: white; }
  </style>

  <rect width="420" height="180" rx="15" ry="15" fill="#1e1e1e"/>

  <text x="20" y="35" class="city">${escapeXml(name)}, ${escapeXml(country)}</text>
  <text x="400" y="35" class="temp" text-anchor="end">${temp}°C ${iconData.icon}</text>

  <text x="20" y="70" class="info">${minTemp}°C | ${maxTemp}°C</text>
  <text x="20" y="100" class="info">Precipitation: ${precipitation} mm</text>
  <text x="20" y="130" class="info">Wind: ${windSpeed} km/h</text>
</svg>
`;

    // Step 5: Save to cache
    cache[city] = { data: svg, timestamp: Date.now() };

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching weather");
  }
});

module.exports = router;
