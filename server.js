const express = require("express");
const path = require("path");
const cityRoute = require("./temperature/routes/city");

const app = express();
const PORT = 5000;

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Mount weather route
app.use("/temperature/city", cityRoute);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
