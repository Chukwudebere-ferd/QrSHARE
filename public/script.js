const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const uploadBtn = document.getElementById("uploadBtn");
const browseBtn = document.getElementById("browseBtn");
const dropZone = document.getElementById("dropZone");
const refreshBtn = document.getElementById("refreshBtn");
const downloadList = document.getElementById("downloadList");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

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
    }
  });
});

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
refreshBtn.addEventListener("click", fetchFiles);

async function fetchFiles() {
  downloadList.innerHTML =
    '<div style="text-align: center; color: #888; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const response = await fetch("/files");
    const files = await response.json();

    downloadList.innerHTML = "";

    if (files.length === 0) {
      downloadList.innerHTML =
        '<div style="text-align: center; color: #888; padding: 20px;">No files found on server.</div>';
      return;
    }

    files.forEach((file) => {
      const item = document.createElement("a");
      item.className = "file-item";
      item.href = file.url;
      item.download = file.name; // Force download
      item.target = "_blank";

      item.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas ${getIconClass(file.name)}"></i>
                    </div>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${formatSize(file.size)}</span>
                    </div>
                </div>
                <div class="download-btn">
                    <i class="fas fa-download"></i>
                </div>
            `;
      downloadList.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    downloadList.innerHTML =
      '<div style="text-align: center; color: #ff3b30; padding: 20px;">Failed to load files.</div>';
  }
}
