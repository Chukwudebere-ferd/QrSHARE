const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const uploadBtn = document.getElementById("uploadBtn");
const browseBtn = document.getElementById("browseBtn");
const dropZone = document.getElementById("dropZone");

let selectedFiles = [];

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

  // Add new files to the implementation array
  for (let i = 0; i < files.length; i++) {
    selectedFiles.push(files[i]);
  }

  updateFileList();
  // Reset input so same file can be selected again if needed (though we just accumulated them in selectedFiles)
  fileInput.value = "";
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

    let iconClass = "fa-file";
    if (file.type.startsWith("image/")) iconClass = "fa-image";
    else if (file.type.startsWith("video/")) iconClass = "fa-video";
    else if (file.type.startsWith("audio/")) iconClass = "fa-music";
    else if (file.type.includes("pdf")) iconClass = "fa-file-pdf";
    else if (file.type.includes("zip") || file.type.includes("compressed"))
      iconClass = "fa-file-archive";

    li.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas ${iconClass}"></i> 
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
