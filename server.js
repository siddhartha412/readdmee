const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Import SVG routes ---
const cityRoute = require("./temperature/routes/city");     // SVG (detailed)
const scityRoute = require("./temperature/routes/scity");   // SVG (small)

// --- Import API routes ---
const apiCityRoute = require("./api/city");   // JSON (detailed)
const apiScityRoute = require("./api/scity"); // JSON (small)

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Mount Routes ---
// SVG endpoints
app.use("/temperature/city", cityRoute);
app.use("/temperature/scity", scityRoute);

// JSON endpoints
app.use("/api/city", apiCityRoute);
app.use("/api/scity", apiScityRoute);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
