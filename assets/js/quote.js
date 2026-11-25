/* Complete Roofing Solutions - instant roof estimate.
   Every rate below is a starting assumption from public Palm Beach County pricing.
   George sets the real numbers here before launch. Prices are per square foot of roof
   surface, installed, unless the name says otherwise. [low, high] */
const RATES = {
  material: {
    shingle:      { label: "Architectural shingle",     perSqft: [5, 7.5],  tearoff: [1.0, 1.75] },
    concreteTile: { label: "Concrete tile",             perSqft: [10, 15],    tearoff: [2.0, 3.25] },
    clayTile:     { label: "Clay tile",                 perSqft: [12, 19],    tearoff: [2.0, 3.25] },
    metal:        { label: "Standing seam metal",       perSqft: [10, 17],    tearoff: [1.25, 2.0] },
    flat:         { label: "Flat roof (TPO or modified bitumen)", perSqft: [7, 12], tearoff: [1.25, 2.25] },
    // commercial systems
    tpo:          { label: "TPO single ply",            perSqft: [7, 11],     tearoff: [1.25, 2.25] },
    modbit:       { label: "Modified bitumen",          perSqft: [8, 13],     tearoff: [1.25, 2.25] },
    cmetal:       { label: "Commercial metal",          perSqft: [11, 18],    tearoff: [1.25, 2.0] },
    coating:      { label: "Roof coating restoration",  perSqft: [3, 6],      tearoff: [0, 0] }
  },
  pitch: {            // extra roof surface from slope, plus a labor bump on steep roofs
    flat:     { label: "Flat or almost flat", area: 1.0,  labor: 1.0,  rise: 0 },
    low:      { label: "Low slope",            area: 1.06, labor: 1.0,  rise: 34 },
    standard: { label: "Standard slope",       area: 1.15, labor: 1.0,  rise: 58 },
    steep:    { label: "Steep slope",          area: 1.3,  labor: 1.08, rise: 88 }
  },
  complexity: { simple: 1.0, moderate: 1.08, complex: 1.18 },
  stories: { 1: 1.0, 2: 1.04, 3: 1.08 },
  footprintFactor: 1.15,          // living area to roof footprint (overhangs, garage, porch)
  secondLayer: [0.75, 1.25],      // per sq ft, when two layers come off
  permit: [450, 900],             // permit, inspections, engineering allowance
  skylight: [650, 1200],          // each, reflash or replace
  deckSheet: [85, 125],           // each 4x8 sheet replaced
  deckSheets: { none: 0, some: 10, lots: 25 },
  repair: {
    base: { small: [450, 1200], medium: [1200, 3200], large: [3200, 7500] },
    material: { shingle: 1.0, concreteTile: 1.25, clayTile: 1.3, metal: 1.15, flat: 1.0 },
    issue: { leak: 1.0, storm: 1.1, flashing: 0.9, ponding: 1.1 }
  },
  tuneup: { base: [350, 650], perSqft: [0.05, 0.12] },
  roundTo: 100
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const form = $("#quote-form");
if (form) initQuote();

function initQuote() {
  const steps = $$(".calc__step", form);
  const prog = $$(".calc__progress li");
  let current = 0;

  const val = (name) => { const el = form.elements[name]; return el ? (el.value ?? "") : ""; };
  const num = (name) => Number(val(name)) || 0;
  const round = (n) => Math.round(n / RATES.roundTo) * RATES.roundTo;
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  /* show the right fields for the project type */
  function syncProject() {
    const type = val("project");
    $$("[data-for]", form).forEach((el) => {
      const show = el.dataset.for.split(" ").includes(type);
      el.hidden = !show;
      $$("input, select, textarea", el).forEach((i) => { i.disabled = !show; });
    });
    // default material for commercial
    if (type === "commercial" && !["tpo", "modbit", "cmetal", "coating"].includes(val("cmaterial"))) {
      const r = form.querySelector("input[name='cmaterial'][value='tpo']"); if (r) r.checked = true;
    }
    if (type === "commercial") { const f = form.querySelector("input[name='pitch'][value='flat']"); if (f) f.checked = true; }
  }

  function roofArea() {
    const type = val("project");
    const pitch = RATES.pitch[val("pitch")] || RATES.pitch.standard;
    if (type === "commercial") return num("buildingSqft") * 1.02;
    if (val("sizeMode") === "roof") return num("roofSqft");
    const stories = Math.min(3, Math.max(1, num("stories") || 1));
    return (num("livingSqft") / stories) * RATES.footprintFactor * pitch.area;
  }

  function calc() {
    const type = val("project");
    const lines = [];
    let low = 0, high = 0;
    const area = roofArea();
    const squares = area / 100;

    if (type === "replacement" || type === "commercial") {
      const matKey = type === "commercial" ? val("cmaterial") : val("material");
      const m = RATES.material[matKey] || RATES.material.shingle;
      const pitch = RATES.pitch[val("pitch")] || RATES.pitch.standard;
      const cx = RATES.complexity[val("complexity")] || 1;
      const st = RATES.stories[Math.min(3, Math.max(1, num("stories") || 1))] || 1;
      const mult = cx * st * pitch.labor;
      const mLow = area * m.perSqft[0] * mult, mHigh = area * m.perSqft[1] * mult;
      lines.push(["Roof area", Math.round(area).toLocaleString("en-US") + " sq ft (" + squares.toFixed(1) + " squares)"]);
      lines.push([m.label, money(round(mLow)) + " to " + money(round(mHigh))]);
      low += mLow; high += mHigh;

      if (matKey !== "coating") {
        const layers = num("layers") || 1;
        let tLow = area * m.tearoff[0], tHigh = area * m.tearoff[1];
        if (layers > 1) { tLow += area * RATES.secondLayer[0]; tHigh += area * RATES.secondLayer[1]; }
        lines.push(["Tear off and disposal" + (layers > 1 ? " (2 layers)" : ""), money(round(tLow)) + " to " + money(round(tHigh))]);
        low += tLow; high += tHigh;
      }
      const sheets = RATES.deckSheets[val("decking")] || 0;
      if (sheets) {
        const dLow = sheets * RATES.deckSheet[0], dHigh = sheets * RATES.deckSheet[1];
        lines.push(["Decking allowance (" + sheets + " sheets)", money(round(dLow)) + " to " + money(round(dHigh))]);
        low += dLow; high += dHigh;
      }
      const sky = num("skylights");
      if (sky) {
        lines.push(["Skylights (" + sky + ")", money(sky * RATES.skylight[0]) + " to " + money(sky * RATES.skylight[1])]);
        low += sky * RATES.skylight[0]; high += sky * RATES.skylight[1];
      }
      lines.push(["Permit and inspections", money(RATES.permit[0]) + " to " + money(RATES.permit[1])]);
      low += RATES.permit[0]; high += RATES.permit[1];
    }

    if (type === "repair") {
      const b = RATES.repair.base[val("repairSize")] || RATES.repair.base.small;
      const mm = RATES.repair.material[val("material")] || 1;
      const im = RATES.repair.issue[val("issue")] || 1;
      low = b[0] * mm * im; high = b[1] * mm * im;
      const issueLabel = { leak: "Active leak", storm: "Storm damage", flashing: "Flashing or vents", ponding: "Ponding on a flat roof" }[val("issue")] || "Repair";
      lines.push(["Repair type", issueLabel]);
      lines.push(["Roof material", (RATES.material[val("material")] || RATES.material.shingle).label]);
      lines.push(["Area affected", { small: "Small spot", medium: "One section", large: "Several sections" }[val("repairSize")] || "Small spot"]);
    }

    if (type === "tuneup") {
      const a = area || 2000;
      low = RATES.tuneup.base[0] + a * RATES.tuneup.perSqft[0];
      high = RATES.tuneup.base[1] + a * RATES.tuneup.perSqft[1];
      lines.push(["Roof area", Math.round(a).toLocaleString("en-US") + " sq ft"]);
      lines.push(["Includes", "Inspection, sealing, debris and photo report"]);
    }

    return { low: round(low), high: round(high), lines, area };
  }

  /* ---------- live output ---------- */
  const out = {
    price: $("#est-price"), lines: $("#est-lines"), bar: $(".meter__bar"),
    sizeOut: $("#roofSqft-out"), livingOut: $("#livingSqft-out"), bldgOut: $("#buildingSqft-out"), summary: $("#estimate-summary")
  };
  function render() {
    const r = calc();
    const valid = r.high > 0;
    out.price.innerHTML = valid ? money(r.low) + "<small> to </small>" + money(r.high) : "Pick your options";
    out.lines.innerHTML = r.lines.map(([k, v]) => "<li><span>" + k + "</span><b>" + v + "</b></li>").join("");
    const pct = Math.min(100, Math.max(8, (r.high / 60000) * 100));
    if (out.bar) out.bar.style.width = pct + "%";
    if (out.sizeOut) out.sizeOut.textContent = num("roofSqft").toLocaleString("en-US") + " sq ft";
    if (out.livingOut) out.livingOut.textContent = num("livingSqft").toLocaleString("en-US") + " sq ft";
    if (out.bldgOut) out.bldgOut.textContent = num("buildingSqft").toLocaleString("en-US") + " sq ft";
    if (out.summary) out.summary.value = (valid ? money(r.low) + " to " + money(r.high) + " | " : "") + r.lines.map(([k, v]) => k + ": " + v).join(" | ");
    drawRoof();
  }

  /* ---------- roof preview drawing ---------- */
  const roof = $("#rp-roof"), walls = $("#rp-walls"), sky = $("#rp-skylights"), win = $("#rp-windows"), door = $("#rp-door"), parapet = $("#rp-parapet");
  function drawRoof() {
    if (!roof) return;
    const type = val("project");
    const commercial = type === "commercial";
    const pitchKey = commercial ? "flat" : val("pitch");
    const pitch = RATES.pitch[pitchKey] || RATES.pitch.standard;
    const stories = commercial ? 2 : Math.min(3, Math.max(1, num("stories") || 1));
    const ground = 222, storyH = commercial ? 46 : 52;
    const top = ground - storyH * Math.min(stories, 2) - (stories > 2 ? 26 : 0);
    const left = commercial ? 60 : 96, right = commercial ? 340 : 304;
    walls.setAttribute("d", `M${left} ${ground} V${top} H${right} V${ground} Z`);
    const rise = pitch.rise;
    const oh = 16;
    let d;
    if (rise === 0) d = `M${left - 6} ${top} H${right + 6} V${top - 10} H${left - 6} Z`;
    else d = `M${left - oh} ${top + 4} L${(left + right) / 2} ${top - rise} L${right + oh} ${top + 4} Z`;
    roof.setAttribute("d", d);
    parapet.style.opacity = rise === 0 ? 1 : 0;
    parapet.setAttribute("d", `M${left - 6} ${top - 10} H${right + 6}`);

    const matKey = commercial ? val("cmaterial") : val("material");
    const pat = { shingle: "pat-shingle", concreteTile: "pat-ctile", clayTile: "pat-clay", metal: "pat-metal", flat: "pat-flat", tpo: "pat-flat", modbit: "pat-modbit", cmetal: "pat-metal", coating: "pat-flat" }[matKey] || "pat-shingle";
    roof.setAttribute("fill", `url(#${pat})`);

    // windows per story
    let w = "";
    const floors = Math.min(stories, 2);
    for (let f = 0; f < floors; f++) {
      const y = ground - storyH * (f + 1) + 14;
      const xs = commercial ? [86, 136, 236, 286] : (f === 0 ? [118, 252] : [118, 186, 252]);
      xs.forEach((x) => { w += `<rect x="${x}" y="${y}" width="30" height="${commercial ? 20 : 24}" rx="2"/>`; });
    }
    win.innerHTML = w;
    door.setAttribute("x", commercial ? 186 : 184);
    door.setAttribute("y", ground - 40);
    door.setAttribute("width", commercial ? 28 : 32);

    // skylights on the left slope
    const n = commercial || type === "repair" ? 0 : Math.min(4, num("skylights"));
    let s = "";
    for (let i = 0; i < n; i++) {
      const t = 0.3 + i * 0.13;
      const x = (left - oh) + ((left + right) / 2 - (left - oh)) * t + 6;
      const y = (top + 4) - (rise + 4) * t + 8;
      s += rise === 0
        ? `<rect x="${left + 30 + i * 46}" y="${top - 16}" width="22" height="6" rx="1"/>`
        : `<path d="M${x} ${y} l14 ${-rise * 0.12} l0 12 l-14 ${rise * 0.12} Z"/>`;
    }
    sky.innerHTML = s;
  }

  /* ---------- steps ---------- */
  function go(i, focus = true) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, n) => { s.hidden = n !== current; });
    prog.forEach((p, n) => {
      p.classList.toggle("is-current", n === current);
      p.classList.toggle("is-done", n < current);
      if (n === current) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
    });
    const h = steps[current].querySelector("h2");
    if (h && focus) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    const top = form.getBoundingClientRect().top + window.scrollY - 96;
    if (focus && window.scrollY > top) window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }
  form.addEventListener("click", (e) => {
    const next = e.target.closest("[data-next]");
    const back = e.target.closest("[data-back]");
    if (next) {
      const fields = $$("input, select, textarea", steps[current]).filter((f) => !f.disabled);
      for (const f of fields) { if (!f.checkValidity()) { f.reportValidity(); return; } }
      go(current + 1);
    }
    if (back) go(current - 1);
    const step = e.target.closest("[data-step]");
    if (step) {
      const el = form.elements[step.dataset.step];
      const d = Number(step.dataset.delta);
      el.value = Math.max(Number(el.min || 0), Math.min(Number(el.max || 99), Number(el.value || 0) + d));
      render();
    }
  });

  /* size mode toggle */
  function syncSize() {
    const mode = val("sizeMode");
    $$("[data-size]", form).forEach((el) => {
      const show = el.dataset.size === mode;
      el.hidden = !show;
      $$("input", el).forEach((i) => { i.disabled = !show || !!i.closest("[data-for][hidden]"); });
    });
  }

  form.addEventListener("input", () => { syncSize(); render(); });
  form.addEventListener("change", (e) => {
    if (e.target.name === "project") syncProject();
    syncSize(); render();
  });

  /* prefill from URL: quote.html?project=repair */
  const p = new URLSearchParams(location.search).get("project");
  if (p) { const r = form.querySelector(`input[name='project'][value='${p}']`); if (r) r.checked = true; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const status = $("#quote-status");
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    try {
      if (typeof SITE !== "undefined" && SITE.FORM_ENDPOINT) {
        const res = await fetch(SITE.FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("send failed");
      }
      const ref = "CRS-" + Date.now().toString(36).toUpperCase().slice(-6);
      status.innerHTML = "<strong>Request " + ref + " received.</strong> We will call you to set up an inspection and lock in your exact price. Need us sooner? Call (561) 848-7663.";
      status.hidden = false;
      btn.hidden = true;
    } catch (err) {
      status.textContent = "Something went wrong sending this. Please call (561) 848-7663.";
      status.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  syncProject(); syncSize(); go(0, false); render();
}
