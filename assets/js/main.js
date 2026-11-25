/* Complete Roofing Solutions - shared site script. Config first. */
const SITE = {
  PHONE_DISPLAY: "(561) 848-7663",
  PHONE_TEL: "+15618487663",
  // Form endpoint (Formspree or similar). Empty string = demo mode, nothing is sent.
  FORM_ENDPOINT: ""
};

document.documentElement.classList.add("js");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector(".menu-btn");
const menu = document.getElementById("main-menu");
if (menuBtn && menu) {
  menuBtn.addEventListener("click", () => {
    const open = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!open));
    menu.classList.toggle("is-open", !open);
  });
}

/* ---------- Services dropdown ---------- */
document.querySelectorAll(".nav__item--drop").forEach((item) => {
  const btn = item.querySelector(".nav__toggle");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = item.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });
});
document.addEventListener("click", (e) => {
  document.querySelectorAll(".nav__item--drop.is-open").forEach((item) => {
    if (!item.contains(e.target)) {
      item.classList.remove("is-open");
      item.querySelector(".nav__toggle").setAttribute("aria-expanded", "false");
    }
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".nav__item--drop.is-open").forEach((item) => {
    item.classList.remove("is-open");
    const t = item.querySelector(".nav__toggle");
    t.setAttribute("aria-expanded", "false");
    t.focus();
  });
});

/* ---------- Reveal on scroll ---------- */
const revealTargets = document.querySelectorAll(".reveal, .layers-svg");
if ("IntersectionObserver" in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.2 });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-in"));
}

/* ---------- Hero video: plays on all screens unless the visitor prefers reduced motion ---------- */
const vid = document.querySelector(".hero__video");
if (vid) {
  if (reduceMotion) {
    vid.remove();
  } else {
    const src = vid.dataset.src;
    if (src) { vid.src = src; vid.play().catch(() => {}); }
  }
}

/* ---------- Form prefill from ?service= ---------- */
const params = new URLSearchParams(location.search);
const svc = params.get("service");
if (svc) {
  const sel = document.querySelector("select[name='service']");
  if (sel && [...sel.options].some((o) => o.value === svc)) sel.value = svc;
}

/* ---------- Contact form ---------- */
document.querySelectorAll("form[data-lead-form]").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector(".form__status");
    const btn = form.querySelector("button[type='submit']");
    if (!form.reportValidity()) return;
    btn.disabled = true;
    try {
      if (SITE.FORM_ENDPOINT) {
        const res = await fetch(SITE.FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("send failed");
      }
      status.textContent = "Thanks. We got your request and will call you to set up a time. Need us sooner? Call " + SITE.PHONE_DISPLAY + ".";
      status.hidden = false;
      form.reset();
    } catch (err) {
      status.textContent = "Something went wrong sending this. Please call " + SITE.PHONE_DISPLAY + ".";
      status.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
});

/* ---------- Footer year ---------- */
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
