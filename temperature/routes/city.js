const express = require("express");
const router = express.Router();

// Weather icons
const weatherIcons = {
  "☀️": "gold",
  "🌤️": "orange",
  "☁️": "lightgray",
  "🌧️": "skyblue",
  "❄️": "lightblue",
};

router.get("/:cityName", async (req, res) => {
  const city = req.params.cityName;

  try {
    const response = await fetch(`https://wttr.in/${city}?format=%t`);
    let temp = (await response.text()).trim();
    temp = temp.replace("+", "");

    let icon = "☀️";
    if (temp.includes("°C")) {
      const t = parseInt(temp.replace("°C", "").trim());
      if (t <= 5) icon = "❄️";
      else if (t <= 20) icon = "🌤️";
      else if (t <= 30) icon = "☀️";
      else icon = "🌧️";
    }

    const svg = `
<svg width="300" height="120" xmlns="http://www.w3.org/2000/svg">
  <style>
    text { font-family: "Verdana", "DejaVu Sans", sans-serif; }
  </style>
  <rect width="300" height="120" rx="15" ry="15" fill="#1e1e1e"/>
  <text x="150" y="40" font-size="18" font-weight="bold" text-anchor="middle" fill="white">
    Current Weather in ${city}
  </text>
  <text x="150" y="85" font-size="32" text-anchor="middle" fill="${weatherIcons[icon]}">
    ${temp} ${icon}
  </text>
</svg>
`;

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (error) {
    console.error("❌ Error fetching weather:", error);
    res.status(500).send("Error fetching weather data.");
  }
});

module.exports = router;
