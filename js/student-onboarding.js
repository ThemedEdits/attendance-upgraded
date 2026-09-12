import { auth } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getBootstrap, getEnrollment, submitEnrollment, ApiError } from "./api.js";
import { showToast } from "./ui-feedback.js";

const form = document.getElementById("enrollment-form");
const nameInput = document.getElementById("student-name");
const seatInput = document.getElementById("seat-number");
const classList = document.getElementById("class-list");
const requestBtn = document.getElementById("request-btn");
const pageError = document.getElementById("page-error");
const setupView = document.getElementById("setup-view");
const pendingView = document.getElementById("pending-view");
const pendingTitle = document.getElementById("pending-title");
const pendingCopy = document.getElementById("pending-copy");
const requestSummary = document.getElementById("request-summary");
const changeRequestBtn = document.getElementById("change-request-btn");
const refreshStatusBtn = document.getElementById("refresh-status-btn");

let classes = [];
let selectedClassId = "";
let currentUser = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setError(message) {
  pageError.innerHTML = message ? `<span>${escapeHtml(message)}</span>` : "";
  pageError.hidden = !message;
}

function classNameById(id) {
  return classes.find((item) => String(item.ClassID) === String(id))?.ClassName || id || "Unknown class";
}

function renderClasses() {
  if (!classes.length) {
    classList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">No</div><h3>No classes available</h3><p>Your institution has not published any classes yet.</p></div>`;
    requestBtn.disabled = true;
    return;
  }

  classList.innerHTML = classes.map((item) => `
    <button type="button" class="class-choice ${String(item.ClassID) === String(selectedClassId) ? "is-selected" : ""}" data-class-id="${escapeHtml(item.ClassID)}">
      <span class="class-choice__radio"></span>
      <span class="class-choice__body"><strong>${escapeHtml(item.ClassName)}</strong><small>${escapeHtml(item.ClassID)}${item.AcademicYear ? ` · ${escapeHtml(item.AcademicYear)}` : ""}</small></span>
      <svg class="class-choice__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12l4 4L19 6"/></svg>
    </button>
  `).join("");

  classList.querySelectorAll(".class-choice").forEach((button) => {
    button.addEventListener("click", () => {
      selectedClassId = button.dataset.classId || "";
      classList.querySelectorAll(".class-choice").forEach((el) => el.classList.toggle("is-selected", el === button));
      requestBtn.disabled = false;
      setError("");
    });
  });
}

function showSetup(enrollment = null) {
  setupView.hidden = false;
  pendingView.hidden = true;
  requestBtn.disabled = !selectedClassId;
  if (enrollment?.Status === "Rejected") {
    showToast("Your previous request was rejected. You can request a class again.", "warning");
  }
}

function showPending(request) {
  setupView.hidden = true;
  pendingView.hidden = false;
  const status = String(request?.Status || "Pending").toLowerCase();
  const className = classNameById(request?.ClassID);
  requestSummary.innerHTML = `
    <div><span>Student</span><strong>${escapeHtml(request?.Name || nameInput.value)}</strong></div>
    <div><span>Seat number</span><strong>${escapeHtml(request?.SeatNumber || seatInput.value)}</strong></div>
    <div><span>Class</span><strong>${escapeHtml(className)}</strong></div>
    <div><span>Status</span><strong class="status-text ${status}">${escapeHtml(request?.Status || "Pending")}</strong></div>
  `;

  if (status === "rejected") {
    pendingTitle.textContent = "Request needs another try";
    pendingCopy.textContent = request?.DecisionNote || "Your previous class request was not approved. You can choose another class and submit a new request.";
    refreshStatusBtn.textContent = "Check again";
    changeRequestBtn.hidden = false;
  } else {
    pendingTitle.textContent = "Waiting for approval";
    pendingCopy.textContent = "Your request has been sent to the CR or teacher responsible for this class. You can check the status at any time.";
    refreshStatusBtn.textContent = "Check status";
    changeRequestBtn.hidden = true;
  }
}

async function load() {
  setError("");
  const boot = await getBootstrap();
  const me = boot.me;
  if (me.role === "student") {
    window.location.href = "student.html";
    return;
  }
  if (me.role === "staff") {
    window.location.href = "teacher.html";
    return;
  }

  currentUser = auth.currentUser;
  document.getElementById("user-email").textContent = me.email || currentUser?.email || "";
  classes = boot.classes || [];
  const enrollment = boot.enrollment || me.lastRequest || null;

  if (enrollment?.Status === "Pending") {
    selectedClassId = String(enrollment.ClassID || "");
    showPending(enrollment);
    return;
  }

  nameInput.value = enrollment?.Name || me.name || "";
  seatInput.value = enrollment?.SeatNumber || "";
  selectedClassId = "";
  renderClasses();
  showSetup(enrollment);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  const name = nameInput.value.trim();
  const seatNumber = seatInput.value.trim();
  if (name.length < 2) return setError("Please enter your full name.");
  if (!seatNumber) return setError("Please enter your seat number.");
  if (!selectedClassId) return setError("Choose the class you want to join.");

  requestBtn.disabled = true;
  requestBtn.innerHTML = `<span class="modern-spinner" style="width:15px;height:15px;border-width:2px;border-top-color:#fff;"></span> Sending request...`;
  try {
    const result = await submitEnrollment({ name, seatNumber, classId: selectedClassId });
    showToast("Class access request sent.", "success");
    showPending({ ...result, ClassID: result.classId, Status: "Pending" });
  } catch (error) {
    setError(error instanceof ApiError ? error.message : "We could not send your request. Please try again.");
  } finally {
    requestBtn.disabled = false;
    requestBtn.textContent = "Request class access";
  }
});

refreshStatusBtn.addEventListener("click", async () => {
  refreshStatusBtn.disabled = true;
  try {
    const data = await getEnrollment();
    if (data.status === "Approved") {
      window.location.href = "student.html";
      return;
    }
    if (data.request) showPending(data.request);
    else showSetup();
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : "Could not check the request status.", "error");
  } finally {
    refreshStatusBtn.disabled = false;
  }
});

changeRequestBtn.addEventListener("click", () => {
  selectedClassId = "";
  renderClasses();
  showSetup();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("signout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  try {
    await load();
  } catch (error) {
    if (error instanceof ApiError && (error.code === "AUTH_INVALID" || error.code === "AUTH_REQUIRED")) {
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
    setError(error instanceof ApiError ? error.message : "Could not load enrollment details.");
  }
});
