/* =========================================================
   JLAAB Dev Studio — script.js
   ========================================================= */

/* ---------- Light / dark theme toggle ---------- */
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

function currentTheme() {
  const set = root.getAttribute("data-theme");
  if (set) return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateThemeLabel() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("jlaab-theme", next); } catch (e) {}
  updateThemeLabel();
});

updateThemeLabel();

/* ---------- Mobile menu ---------- */
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

// Close the menu after tapping a link
mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  });
});

/* ---------- Hero demo: sample systems per business ---------- */
const demoData = {
  resort: {
    title: "Cottage reservations",
    stats: [
      { value: "14", label: "Bookings this week" },
      { value: "₱21,500", label: "GCash deposits" },
      { value: "0", label: "Double bookings" },
    ],
    rows: [
      { main: "Cottage 3", sub: "Sat, Oct 10, 8 guests", status: "Paid", type: "ok" },
      { main: "Family Room A", sub: "Sun, Oct 11, 5 guests", status: "Deposit due", type: "wait" },
      { main: "Kubo 2", sub: "Sat, Oct 17, 12 guests", status: "Paid", type: "ok" },
    ],
  },
  store: {
    title: "Sales and inventory",
    stats: [
      { value: "₱38,240", label: "Sales today" },
      { value: "312", label: "Items sold" },
      { value: "3", label: "Low on stock" },
    ],
    rows: [
      { main: "Portland cement 40kg", sub: "4 bags left", status: "Restock", type: "alert" },
      { main: "Paracetamol 500mg", sub: "Expires in 30 days", status: "Check", type: "wait" },
      { main: "Coffee 3-in-1 pack", sub: "86 in stock", status: "OK", type: "ok" },
    ],
  },
  school: {
    title: "Enrollment",
    stats: [
      { value: "248", label: "Enrolled" },
      { value: "17", label: "Pending papers" },
      { value: "92%", label: "Fees collected" },
    ],
    rows: [
      { main: "Grade 7, Section Rizal", sub: "38 of 40 slots filled", status: "Open", type: "ok" },
      { main: "Dela Cruz, Maria", sub: "Missing Form 138", status: "Pending", type: "wait" },
      { main: "Grade 10, Section Mabini", sub: "40 of 40 slots filled", status: "Full", type: "alert" },
    ],
  },
  clinic: {
    title: "Appointments today",
    stats: [
      { value: "22", label: "Appointments" },
      { value: "6", label: "Walk-ins" },
      { value: "4 min", label: "Average wait" },
    ],
    rows: [
      { main: "9:00 AM, Check-up", sub: "Dr. Santos, Room 1", status: "Done", type: "ok" },
      { main: "9:30 AM, Dental cleaning", sub: "Dr. Reyes, Room 2", status: "In progress", type: "wait" },
      { main: "10:00 AM, Follow-up", sub: "Dr. Santos, Room 1", status: "Confirmed", type: "ok" },
    ],
  },
};

const demoWindow = document.getElementById("demoWindow");
const demoTitle = document.getElementById("demoTitle");
const demoStats = document.getElementById("demoStats");
const demoList = document.getElementById("demoList");
const demoTabs = document.querySelectorAll(".demo-tab");

function renderDemo(key) {
  const data = demoData[key];
  demoTitle.textContent = data.title;

  demoStats.innerHTML = data.stats
    .map((s) => `<div class="demo-stat"><strong>${s.value}</strong><span>${s.label}</span></div>`)
    .join("");

  demoList.innerHTML = data.rows
    .map(
      (r) => `
      <li class="demo-row">
        <span class="demo-row-main">${r.main}<span class="demo-row-sub">${r.sub}</span></span>
        <span class="status status-${r.type}">${r.status}</span>
      </li>`
    )
    .join("");
}

demoTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    demoTabs.forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");

    // Short fade when switching
    demoWindow.classList.add("is-switching");
    setTimeout(() => {
      renderDemo(tab.dataset.biz);
      demoWindow.classList.remove("is-switching");
    }, 180);
  });
});

renderDemo("resort");

/* ---------- Contact form ---------- */
const form = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

function setStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = `form-status is-${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Clear old errors
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));

  const name = form.elements.name.value.trim();
  const phone = form.elements.phone.value.trim();
  const email = form.elements.email.value.trim();
  const message = form.elements.message.value.trim();

  if (!name) {
    form.elements.name.closest(".field").classList.add("has-error");
    setStatus("Enter your name so we know who to reply to.", "error");
    form.elements.name.focus();
    return;
  }

  if (!phone && !email) {
    form.elements.phone.closest(".field").classList.add("has-error");
    form.elements.email.closest(".field").classList.add("has-error");
    setStatus("Add a mobile number or email so we can reply.", "error");
    form.elements.phone.focus();
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    form.elements.email.closest(".field").classList.add("has-error");
    setStatus("Check your email address. It should look like name@example.com.", "error");
    form.elements.email.focus();
    return;
  }

  if (!message) {
    form.elements.message.closest(".field").classList.add("has-error");
    setStatus("Tell us a little about what you need.", "error");
    form.elements.message.focus();
    return;
  }

  /* ===== BACKEND: connect the form here =====
     Uncomment this block once the backend endpoint is ready.

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      body: new FormData(form),
    });
    if (!response.ok) throw new Error("Request failed");
  } catch (error) {
    setStatus("Inquiry not sent. Check your connection and try again, or message us on Facebook.", "error");
    return;
  }
  */

  setStatus("Inquiry sent. We'll reply within 2–3 days.", "success");
  form.reset();
});

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();