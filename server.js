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
// Serve uploaded files for download
app.use("/downloads", express.static(uploadDir));

// File upload endpoint
app.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded.");
  }
  res.send("Files uploaded successfully to " + uploadDir);
});

// List files endpoint
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Unable to scan directory" });
    }

    const fileInfos = files
      .map((file) => {
        const filePath = path.join(uploadDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            return {
              name: file,
              size: stats.size,
              url: `/downloads/${encodeURIComponent(file)}`,
            };
          }
        } catch (e) {
          return null;
        }
      })
      .filter((item) => item !== null);

    res.json(fileInfos);
  });
});

// Start server
app.listen(port, () => {
  // Better IP detection
  const interfaces = os.networkInterfaces();
  let localIp = "localhost";

  // Priority: 192.168.x.x (typical home), 10.x.x.x (private), 172.16-31.x.x (private)
  // Avoid: 127.0.0.1 (loopback), 192.168.56.x (VirtualBox)

  const results = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4
      if (iface.family === "IPv4" && !iface.internal) {
        if (!iface.address.startsWith("192.168.56.")) {
          // Explicitly ignore VirtualBox default
          results.push(iface.address);
        }
      }
    }
  }

  // Prioritize 192.168.1.x and 192.168.0.x as they are common home Wi-Fi subnets
  results.sort((a, b) => {
    const aIsCommon = a.startsWith("192.168.1.") || a.startsWith("192.168.0.");
    const bIsCommon = b.startsWith("192.168.1.") || b.startsWith("192.168.0.");
    if (aIsCommon && !bIsCommon) return -1;
    if (!aIsCommon && bIsCommon) return 1;
    return 0;
  });

  // Pick the first valid result, or fallback to the first non-internal one found by ip package
  if (results.length > 0) {
    localIp = results[0];
  } else {
    localIp = ip.address(); // Fallback
  }

  const url = `http://${localIp}:${port}`;

  console.log(`Server running at ${url}`);
  // Generate QR Code in terminal
  QRCode.toString(
    url,
    { type: "terminal", small: true },
    function (err, qrOutput) {
      if (err) console.log(err);
      console.log(qrOutput);
      console.log("\nPress Ctrl+C to stop the server.");
    },
  );

  if (results.length > 1) {
    console.log("\nOther possible URLs (try these if the above one fails):");
    results.forEach((addr) => {
      if (addr !== localIp) console.log(`http://${addr}:${port}`);
    });
  }
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
