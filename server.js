const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const ip = require("ip");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const port = 3000;

// Simple in-memory storage for shared text
let sharedText = "";

// Support JSON bodies for text sharing
app.use(express.json());

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

// List files endpoint (with directory navigation)
app.get("/files", (req, res) => {
  let currentPath = req.query.path || os.homedir();

  // Resolve path to absolute
  currentPath = path.resolve(currentPath);

  fs.readdir(currentPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error(`Error reading directory ${currentPath}:`, err);
      return res.status(500).json({
        error: `Access Denied or Invalid Path: ${err.message}`,
        path: currentPath,
        parentPath: path.dirname(currentPath),
      });
    }

    const fileInfos = entries
      .map((entry) => {
        // Skip some hidden system files that might cause issues or clutter
        if (
          entry.name === "$RECYCLE.BIN" ||
          entry.name === "System Volume Information"
        )
          return null;
        if (entry.name.startsWith(".") && entry.name !== ".") return null;

        const fullPath = path.join(currentPath, entry.name);
        const isDir = entry.isDirectory();

        // Basic extension check for previews
        const ext = path.extname(entry.name).toLowerCase();
        const isImage = [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".svg",
        ].includes(ext);
        const isVideo = [".mp4", ".webm", ".ogg", ".mov"].includes(ext);

        return {
          name: entry.name,
          type: isDir ? "directory" : "file",
          path: fullPath,
          isPreviewable: !isDir && (isImage || isVideo),
          mediaType: isImage ? "image" : isVideo ? "video" : null,
        };
      })
      .filter((item) => item !== null);

    // Strict Sort: Folders first, then Files, both A-Z (case-insensitive)
    fileInfos.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    res.json({
      path: currentPath,
      entries: fileInfos,
      parentPath: path.dirname(currentPath),
    });
  });
});

// Download arbitrary file endpoint
app.get("/download", (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).send("No path provided.");
  }
  res.download(filePath, (err) => {
    if (err) {
      // Handle error, but don't expose too much specific info if sensitive
      // For local tool, log it.
      console.error("Download error:", err);
      if (!res.headersSent) {
        res.status(500).send("Could not download file.");
      }
    }
  });
});

// Get shared text endpoint
app.get("/text", (req, res) => {
  res.json({ text: sharedText });
});

// Update shared text endpoint
app.post("/text", (req, res) => {
  const { text } = req.body;
  if (typeof text === "string") {
    sharedText = text;
    console.log(
      "Updated shared text:",
      sharedText.substring(0, 50) + (sharedText.length > 50 ? "..." : ""),
    );
    res.json({ success: true, text: sharedText });
  } else {
    res.status(400).json({ error: "Invalid text provided." });
  }
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

  console.log(`Server v1.5.0 running at ${url}`);
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
