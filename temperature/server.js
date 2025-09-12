const express = require("express");
const path = require("path");
const cityRoute = require("./temperature/routes/city");

const app = express();
const PORT = 5000;

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Mount city route
app.use("/temperature/city", cityRoute);

app.listen(PORT, () => {
  console.log(`✅ Local server running at http://localhost:${PORT}`);
});
