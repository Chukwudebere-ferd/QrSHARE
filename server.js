const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const ip = require("ip");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const port = 3000;

// Configure upload directory
const uploadDir = path.join(os.homedir(), "Downloads", "PhoneDrop");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use original filename, avoid overwriting by appending timestamp if needed?
    // For MVP, just use original name.
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Serve static files from 'public' directory
app.use(express.static("public"));

// File upload endpoint
app.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded.");
  }
  res.send("Files uploaded successfully to " + uploadDir);
});

// Start server
app.listen(port, () => {
  const localIp = ip.address();
  const url = `http://${localIp}:${port}`;

  console.log(`Server running at ${url}`);
  // Generate QR Code in terminal
  QRCode.toString(url, { type: "terminal" }, function (err, qrOutput) {
    if (err) console.log(err);
    console.log(qrOutput);
    console.log("\nPress Ctrl+C to stop the server.");
  });
});

// Error handling to prevent crash
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Keep process alive
process.stdin.resume();
