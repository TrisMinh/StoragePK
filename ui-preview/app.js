const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = themeToggle?.querySelector("i");
const themeLabel = themeToggle?.querySelector("span");
const metaTheme = document.querySelector('meta[name="theme-color"]');

const setTheme = (theme) => {
  const isDark = theme === "dark";
  root.dataset.theme = theme;

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }

  if (themeIcon) {
    themeIcon.className = isDark ? "ph ph-moon" : "ph ph-sun";
  }

  if (themeLabel) {
    themeLabel.textContent = isDark ? "Dark" : "Light";
  }

  if (metaTheme) {
    metaTheme.setAttribute("content", isDark ? "#10151f" : "#f5f7fb");
  }

  localStorage.setItem("storagepk-theme", theme);
};

const savedTheme = localStorage.getItem("storagepk-theme");
setTheme(savedTheme === "dark" ? "dark" : "light");

themeToggle?.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

const fileInput = document.querySelector("#file-input");
const browseFiles = document.querySelector("#browse-files");
const openUpload = document.querySelector("#open-upload");
const dropZone = document.querySelector("#drop-zone");
const feedback = document.querySelector("#upload-feedback");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
let toastTimer;

const showToast = (message) => {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
};

const handleFiles = (fileList) => {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const label = files.length === 1 ? files[0].name : `${files.length} files`;
  if (feedback) {
    feedback.textContent = `${label} added. Smart routing is ready to choose a pool.`;
    feedback.style.color = "var(--success)";
  }
  showToast(`${label} added to your upload queue.`);
};

browseFiles?.addEventListener("click", (event) => {
  event.stopPropagation();
  fileInput?.click();
});

openUpload?.addEventListener("click", () => {
  dropZone?.scrollIntoView({ behavior: "smooth", block: "center" });
  fileInput?.click();
});

fileInput?.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  event.target.value = "";
});

dropZone?.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
  if (feedback) feedback.textContent = "Drop to add files to your queue.";
});

dropZone?.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone?.addEventListener("dragleave", (event) => {
  if (event.relatedTarget && dropZone.contains(event.relatedTarget)) return;
  dropZone.classList.remove("is-dragging");
  if (feedback) feedback.textContent = "PDF, images, video and more. Up to 2 GB per file.";
});

dropZone?.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  handleFiles(event.dataTransfer.files);
});

const searchInput = document.querySelector("#activity-search");
const activityRows = Array.from(document.querySelectorAll(".activity-row[data-file]"));
const activityEmpty = document.querySelector("#activity-empty");

searchInput?.addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  let visibleRows = 0;

  activityRows.forEach((row) => {
    const matches = row.dataset.file.includes(query);
    row.hidden = !matches;
    if (matches) visibleRows += 1;
  });

  if (activityEmpty) activityEmpty.hidden = visibleRows > 0;
});

document.querySelectorAll(".nav-item, .pool-nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((navItem) => navItem.classList.remove("is-active"));
    if (item.classList.contains("nav-item")) item.classList.add("is-active");
  });
});
