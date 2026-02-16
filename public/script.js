const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const uploadBtn = document.getElementById("uploadBtn");
const browseBtn = document.getElementById("browseBtn");
const dropZone = document.getElementById("dropZone");
const refreshBtn = document.getElementById("refreshBtn");
const downloadList = document.getElementById("downloadList");
const currentPathText = document.getElementById("currentPathText");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Text Share Elements
const textInput = document.getElementById("textInput");
const sendTextBtn = document.getElementById("sendTextBtn");
const sharedTextContent = document.getElementById("sharedTextContent");
const copyBtn = document.getElementById("copyBtn");
const refreshTextBtn = document.getElementById("refreshTextBtn");

let selectedFiles = [];

// Tab Switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add("active");

    if (btn.dataset.tab === "receive") {
      fetchFiles();
    } else if (btn.dataset.tab === "text") {
      fetchText();
    }
  });
});

if (refreshTextBtn) {
  refreshTextBtn.addEventListener("click", () => fetchText());
}

// Browse button triggers file input
browseBtn.addEventListener("click", () => {
  fileInput.click();
});

// Handle file selection
fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
});

// Drag and drop events
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  if (!files.length) return;

  for (let i = 0; i < files.length; i++) {
    selectedFiles.push(files[i]);
  }

  updateFileList();
  fileInput.value = "";
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getIconClass(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "fa-image";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "fa-video";
  if (["mp3", "wav", "ogg"].includes(ext)) return "fa-music";
  if (["pdf"].includes(ext)) return "fa-file-pdf";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "fa-file-archive";
  if (["doc", "docx"].includes(ext)) return "fa-file-word";
  if (["xls", "xlsx"].includes(ext)) return "fa-file-excel";
  return "fa-file";
}

function updateFileList() {
  fileList.innerHTML = "";

  if (selectedFiles.length > 0) {
    uploadBtn.disabled = false;
    uploadBtn.style.opacity = "1";
    uploadBtn.innerHTML = "Start Upload &uarr;";
  } else {
    uploadBtn.disabled = true;
    uploadBtn.style.opacity = "0.5";
  }

  fileCount.textContent = `${selectedFiles.length} files`;

  selectedFiles.forEach((file, index) => {
    const li = document.createElement("div");
    li.className = "file-item";

    li.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas ${getIconClass(file.name)}"></i> 
                </div>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatSize(file.size)}</span>
                </div>
            </div>
            <button class="remove-btn" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
    fileList.appendChild(li);
  });
}

window.removeFile = function (index) {
  selectedFiles.splice(index, 1);
  updateFileList();
};

uploadBtn.addEventListener("click", async () => {
  if (selectedFiles.length === 0) return;

  const originalText = uploadBtn.innerHTML;
  uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  uploadBtn.disabled = true;

  const formData = new FormData();
  selectedFiles.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      uploadBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
      uploadBtn.style.backgroundColor = "#34c759";
      selectedFiles = [];
      setTimeout(() => {
        updateFileList();
        uploadBtn.innerHTML = originalText;
        uploadBtn.style.backgroundColor = "";
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = "0.5";

        // Switch to receive tab to see uploaded files
        // document.querySelector('[data-tab="receive"]').click();
      }, 2000);
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error(error);
    uploadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
    uploadBtn.style.backgroundColor = "#ff3b30";
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
      uploadBtn.style.backgroundColor = "";
      uploadBtn.disabled = false;
    }, 2000);
  }
});

// Downloads Logic
refreshBtn.addEventListener("click", () => fetchFiles());

let currentPath = "";

async function fetchFiles(path = "") {
  downloadList.innerHTML =
    '<div style="text-align: center; color: #888; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const url = path ? `/files?path=${encodeURIComponent(path)}` : "/files";
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    const data = await response.json();
    currentPath = data.path;
    if (currentPathText) currentPathText.textContent = currentPath;

    const files = data.entries;
    downloadList.innerHTML = "";

    // Add "Up" button if we have a parent path and it's different from current
    if (data.parentPath && data.parentPath !== currentPath) {
      const upItem = document.createElement("div");
      upItem.className = "file-item up-navigation";
      upItem.style.cursor = "pointer";
      upItem.onclick = () => fetchFiles(data.parentPath);

      upItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon" style="background-color: #333;">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="file-details">
                        <span class="file-name">.. (Go Up)</span>
                        <span class="file-size">${data.parentPath}</span>
                    </div>
                </div>
            `;
      downloadList.appendChild(upItem);
    }

    if (files.length === 0) {
      downloadList.innerHTML +=
        '<div style="text-align: center; color: #888; padding: 20px;">No folders or files found here.</div>';
      return;
    }

    files.forEach((file) => {
      const isDir = file.type === "directory";
      const item = document.createElement(isDir ? "div" : "a");
      item.className = `file-item ${isDir ? "dir-item" : "file-download-item"}`;

      if (isDir) {
        item.style.cursor = "pointer";
        item.onclick = () => fetchFiles(file.path);
      } else {
        item.href = `/download?path=${encodeURIComponent(file.path)}`;
        item.download = file.name;
        item.target = "_blank";
      }

      const iconClass = isDir ? "fa-folder" : getIconClass(file.name);
      const iconColor = isDir ? "#007AFF" : "#aaa";
      const iconBg = isDir ? "rgba(0, 122, 255, 0.1)" : "#222";

      // Preview Logic
      let iconHtml = `<i class="fas ${iconClass}"></i>`;
      if (!isDir && file.isPreviewable) {
        const previewUrl = `/download?path=${encodeURIComponent(file.path)}`;
        if (file.mediaType === "image") {
          iconHtml = `<img src="${previewUrl}" class="file-preview" alt="preview">`;
        } else if (file.mediaType === "video") {
          // Showing a video purely as a thumbnail might be hard without generating thumbs,
          // but we can try small video tag or just stick to icon + special style.
          // For now, let's keep video as icon but maybe a play button overlay?
          iconHtml = `<i class="fas fa-video"></i><div class="video-overlay"><i class="fas fa-play"></i></div>`;
        }
      }

      item.innerHTML = `
                <div class="file-info">
                    <div class="file-icon" style="background-color: ${iconBg}; color: ${iconColor};">
                        ${iconHtml}
                    </div>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${isDir ? "Folder" : "File"}</span>
                    </div>
                </div>
                <div class="download-btn" style="color: ${isDir ? "#666" : "#007AFF"};">
                    <i class="fas ${isDir ? "fa-chevron-right" : "fa-download"}"></i>
                </div>
            `;
      downloadList.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    downloadList.innerHTML = `<div style="text-align: center; color: #ff3b30; padding: 20px;">
        <strong>Failed to load path.</strong><br>
        <small>${error.message}</small><br><br>
        <button class="btn btn-secondary" onclick="fetchFiles()">Back to Home</button>
    </div>`;
  }
}

// Text Share Logic
async function fetchText() {
  sharedTextContent.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Loading...';
  try {
    const response = await fetch("/text");
    const data = await response.json();
    sharedTextContent.textContent = data.text || "No text shared yet.";
  } catch (error) {
    console.error("Fetch text error:", error);
    sharedTextContent.textContent = "Error loading shared text.";
  }
}

sendTextBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) return;

  const originalText = sendTextBtn.innerHTML;
  sendTextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  sendTextBtn.disabled = true;

  try {
    const response = await fetch("/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      sendTextBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
      sendTextBtn.style.backgroundColor = "#34c759";
      textInput.value = "";
      fetchText(); // Refresh displayed text
      setTimeout(() => {
        sendTextBtn.innerHTML = originalText;
        sendTextBtn.style.backgroundColor = "";
        sendTextBtn.disabled = false;
      }, 2000);
    } else {
      throw new Error("Failed to send text");
    }
  } catch (error) {
    console.error("Send text error:", error);
    sendTextBtn.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> Failed';
    sendTextBtn.style.backgroundColor = "#ff3b30";
    setTimeout(() => {
      sendTextBtn.innerHTML = originalText;
      sendTextBtn.style.backgroundColor = "";
      sendTextBtn.disabled = false;
    }, 2000);
  }
});

copyBtn.addEventListener("click", () => {
  const text = sharedTextContent.textContent;
  if (text === "No text shared yet." || text === "Error loading shared text.")
    return;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalIcon = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
      }, 2000);
    })
    .catch((err) => {
      console.error("Copy error:", err);
    });
});

// Initial fetch if starting on text tab (though default is send)
if (document.querySelector(".tab-btn.active").dataset.tab === "text") {
  fetchText();
}
