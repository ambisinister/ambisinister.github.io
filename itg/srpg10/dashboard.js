const DATA_FILE = "pb_state_549.json";
const DIFFICULTY_FILE = "difficulty.csv";
const CORE_MEASURES = [8, 16, 32, 64, 128, 256, 512];

const state = {
  view: "unbroken",
  bpmStep: 5,
  measureSet: "difficulty",
  trickle: true,
  hideFails: true,
  selected: null,
  attempts: [],
  measures: [],
  difficulty: new Map(),
  difficultyBpms: [],
  data: null,
};

const el = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => line.split(","));
  state.measures = rows[0].slice(1).map(Number);
  rows.slice(2).forEach((row) => {
    const bpm = Number(row[0]);
    const values = new Map();
    state.measures.forEach((measure, index) => values.set(measure, Number(row[index + 1])));
    state.difficulty.set(bpm, values);
  });
  state.difficultyBpms = [...state.difficulty.keys()].sort((a, b) => a - b);
}

function parseDate(timestamp) {
  if (!timestamp) return null;
  const normalized = timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectAttempts(data) {
  return Object.entries(data.pb_grid).flatMap(([bucket, entry]) => entry.sources.map((source) => ({
    ...source,
    originalBucket: Number(bucket),
    date: parseDate(source.timestamp),
  }))).filter((attempt) => attempt.date && Number.isFinite(attempt.originalBucket));
}

function currentAttempts() {
  return state.attempts.filter((attempt) => !state.hideFails || !attempt.is_fail);
}

function bucketBpm(bpm) {
  return Math.round(bpm / state.bpmStep) * state.bpmStep;
}

function valueFor(attempt) {
  return Number(attempt[state.view]) || 0;
}

function directBestAt(bpm) {
  return currentAttempts().reduce((best, attempt) => bucketBpm(attempt.originalBucket) === bpm ? Math.max(best, valueFor(attempt)) : best, 0);
}

function surfaceBestAt(bpm) {
  const direct = directBestAt(bpm);
  if (!state.trickle) return { value: direct, direct, sourceBpm: direct ? bpm : null };
  let value = direct;
  let sourceBpm = direct ? bpm : null;
  currentAttempts().forEach((attempt) => {
    const attemptBpm = bucketBpm(attempt.originalBucket);
    const attemptValue = valueFor(attempt);
    if (attemptBpm >= bpm && attemptValue > value) {
      value = attemptValue;
      sourceBpm = attemptBpm;
    }
  });
  return { value, direct, sourceBpm };
}

function difficultyAt(bpm, measure) {
  const bpms = state.difficultyBpms;
  const low = [...bpms].reverse().find((candidate) => candidate <= bpm) ?? bpms[0];
  const high = bpms.find((candidate) => candidate >= bpm) ?? bpms.at(-1);
  const lowValue = state.difficulty.get(low)?.get(measure) ?? 0;
  const highValue = state.difficulty.get(high)?.get(measure) ?? lowValue;
  if (low === high) return lowValue;
  return lowValue + ((bpm - low) / (high - low)) * (highValue - lowValue);
}

function blockLabel(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function colorHue(block) {
  return Math.max(18, 174 - (block - 8) * 11);
}

function displayDate(date, options = {}) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...options }).format(date);
}

function maxBpmFor(measure, mode) {
  const qualifying = currentAttempts().filter((attempt) => (Number(attempt[mode]) || 0) >= measure);
  if (!qualifying.length) return null;
  return qualifying.reduce((best, attempt) => attempt.originalBucket > best.originalBucket ? attempt : best);
}

function renderTargets() {
  [[32, "unbroken"], [64, "unbroken"], [400, "total"]].forEach(([measure, mode]) => {
    const best = maxBpmFor(measure, mode);
    const value = el(`target-${measure}`);
    const note = el(`target-${measure}-note`);
    if (!best) {
      value.textContent = "OPEN";
      note.textContent = `No ${measure}-measure pass yet`;
      return;
    }
    value.textContent = `${best.originalBucket} BPM`;
    note.textContent = `${best.song} · ${displayDate(best.date)}`;
  });
}

function gridRange() {
  const maxAttempt = Math.max(...currentAttempts().map((attempt) => attempt.originalBucket), 190);
  const max = Math.min(450, Math.max(200, Math.ceil(maxAttempt / 10) * 10));
  const min = 100;
  const rows = [];
  for (let bpm = max; bpm >= min; bpm -= state.bpmStep) rows.push(bpm);
  return rows;
}

function renderSurface() {
  const measures = state.measureSet === "core" ? CORE_MEASURES : state.measures;
  const rows = gridRange();
  const fragment = document.createDocumentFragment();
  const grid = document.createElement("div");
  grid.className = "surface-grid";
  grid.style.setProperty("--cols", measures.length);

  const corner = document.createElement("div");
  corner.className = "axis-corner";
  corner.textContent = "BPM ↓ / MEAS →";
  grid.append(corner);
  measures.forEach((measure) => {
    const head = document.createElement("div");
    head.className = "measure-head";
    head.textContent = measure;
    grid.append(head);
  });

  rows.forEach((bpm) => {
    const bpmHead = document.createElement("div");
    bpmHead.className = "bpm-head";
    bpmHead.innerHTML = `${bpm}<span>BPM</span>`;
    grid.append(bpmHead);
    const best = surfaceBestAt(bpm);
    measures.forEach((measure) => {
      const block = difficultyAt(bpm, measure);
      const passed = best.value >= measure;
      const direct = best.direct >= measure;
      const button = document.createElement("button");
      button.className = `surface-cell${passed ? " passed" : ""}${passed && !direct ? " inferred" : ""}`;
      button.style.setProperty("--hue", colorHue(block));
      button.dataset.bpm = bpm;
      button.dataset.measure = measure;
      button.dataset.block = blockLabel(block);
      button.dataset.best = best.value;
      button.dataset.direct = best.direct;
      button.dataset.sourceBpm = best.sourceBpm ?? "";
      button.setAttribute("aria-label", `${bpm} BPM, ${measure} measures, block ${blockLabel(block)}: ${passed ? direct ? "direct pass" : "inferred pass" : "open"}`);
      button.innerHTML = `<span>${blockLabel(block)}</span>`;
      if (state.selected?.bpm === bpm && state.selected?.measure === measure && state.selected?.mode === state.view) button.classList.add("selected");
      button.addEventListener("click", () => selectBenchmark(bpm, measure));
      button.addEventListener("mouseenter", showTooltip);
      button.addEventListener("mousemove", positionTooltip);
      button.addEventListener("mouseleave", hideTooltip);
      grid.append(button);
    });
  });
  fragment.append(grid);
  el("grid-wrap").replaceChildren(fragment);

  const values = rows.map((bpm) => surfaceBestAt(bpm).value);
  const frontier = Math.max(...values, 0);
  const kind = state.view === "unbroken" ? "unbroken" : "total";
  el("surface-summary").textContent = `${frontier} measures is the widest ${kind} mark on this view. Bright cells are passed; striped cells are inferred.`;
}

function showTooltip(event) {
  const cell = event.currentTarget;
  const bpm = Number(cell.dataset.bpm);
  const measure = Number(cell.dataset.measure);
  const direct = Number(cell.dataset.direct);
  const best = Number(cell.dataset.best);
  let status = "Open benchmark";
  if (direct >= measure) status = `Direct pass · best ${direct} measures`;
  else if (best >= measure) status = `Inferred from ${cell.dataset.sourceBpm} BPM · best ${best}`;
  el("tooltip").innerHTML = `<strong>${bpm} BPM × ${measure} measures</strong>Block ${cell.dataset.block}<br><span>${status}</span>`;
  el("tooltip").hidden = false;
  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltip = el("tooltip");
  const left = Math.min(event.clientX + 14, window.innerWidth - tooltip.offsetWidth - 12);
  const top = Math.min(event.clientY + 14, window.innerHeight - tooltip.offsetHeight - 12);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() { el("tooltip").hidden = true; }

function prHistory(measure, mode) {
  const sorted = currentAttempts()
    .filter((attempt) => (Number(attempt[mode]) || 0) >= measure)
    .sort((a, b) => a.date - b.date || a.originalBucket - b.originalBucket);
  let best = -Infinity;
  return sorted.filter((attempt) => {
    if (attempt.originalBucket > best) { best = attempt.originalBucket; return true; }
    return false;
  });
}

function exactBpmHistory(bpm, mode) {
  const sorted = currentAttempts()
    .filter((attempt) => bucketBpm(attempt.originalBucket) === bpm)
    .sort((a, b) => a.date - b.date);
  let best = -Infinity;
  return sorted.filter((attempt) => {
    const value = Number(attempt[mode]) || 0;
    if (value > best) { best = value; return true; }
    return false;
  });
}

function selectBenchmark(bpm, measure, mode = state.view) {
  if (mode !== state.view) {
    state.view = mode;
    syncViewToggle();
    renderTargets();
    renderSurface();
  }
  state.selected = { bpm, measure, mode };
  document.querySelectorAll(".surface-cell.selected").forEach((cell) => cell.classList.remove("selected"));
  document.querySelector(`.surface-cell[data-bpm="${bpm}"][data-measure="${measure}"]`)?.classList.add("selected");
  renderDetail();
}

function renderDetail() {
  if (!state.selected) return;
  const { bpm, measure, mode } = state.selected;
  const noun = mode === "unbroken" ? "unbroken measures" : "total measures";
  const history = prHistory(measure, mode);
  const exactHistory = exactBpmHistory(bpm, mode);
  const surface = surfaceBestAt(bpm);
  const block = state.measures.includes(measure) ? blockLabel(difficultyAt(bpm, measure)) : "custom";
  const passed = surface.value >= measure;
  const direct = surface.direct >= measure;

  el("detail-title").textContent = `${measure} ${mode} @ ${bpm} BPM`;
  el("detail-subtitle").textContent = `Block ${block} benchmark · charting the fastest ${measure}-measure pass over time.`;
  el("selected-status").hidden = false;
  el("selected-status").innerHTML = `
    <div class="status-line"><span>Cell status</span><strong>${passed ? direct ? "DIRECT PASS" : "TRICKLE-DOWN PASS" : "OPEN"}</strong></div>
    <div class="status-line"><span>Best at ${bpm} BPM</span><strong>${surface.direct || "—"} ${noun}</strong></div>
    <div class="status-line"><span>PR changes at this speed</span><strong>${exactHistory.length}</strong></div>`;
  el("chart-label").textContent = `Fastest BPM at ${measure} ${mode}`;
  el("chart-note").textContent = history.length ? `${history.length} personal-best change${history.length === 1 ? "" : "s"}` : "No qualifying pass yet";
  renderChart(history);
}

function renderChart(history) {
  const chart = el("history-chart");
  const events = el("history-events");
  events.replaceChildren();
  if (!history.length) {
    chart.innerHTML = `<div class="chart-empty">No qualifying pass for this benchmark yet.</div>`;
    el("chart-latest").textContent = "OPEN";
    return;
  }

  const W = 720, H = 180, left = 40, right = 10, top = 13, bottom = 27;
  const times = history.map((item) => item.date.getTime());
  const values = history.map((item) => item.originalBucket);
  const minT = Math.min(...times), maxT = Math.max(...times);
  const rawMinY = Math.min(...values), rawMaxY = Math.max(...values);
  const minY = Math.floor((rawMinY - 5) / 5) * 5;
  const maxY = Math.ceil((rawMaxY + 5) / 5) * 5;
  const x = (time) => left + (maxT === minT ? (W - left - right) / 2 : ((time - minT) / (maxT - minT)) * (W - left - right));
  const y = (value) => top + ((maxY - value) / Math.max(1, maxY - minY)) * (H - top - bottom);
  const points = history.map((item) => [x(item.date.getTime()), y(item.originalBucket)]);
  let line = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) line += ` H ${points[i][0]} V ${points[i][1]}`;
  const area = `${line} L ${points.at(-1)[0]} ${H - bottom} L ${points[0][0]} ${H - bottom} Z`;
  const midY = Math.round((minY + maxY) / 2);
  chart.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Personal best history chart">
      <defs><linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9f27c" stop-opacity=".22"/><stop offset="1" stop-color="#b9f27c" stop-opacity="0"/></linearGradient></defs>
      ${[maxY, midY, minY].map((tick) => `<line class="chart-grid" x1="${left}" x2="${W-right}" y1="${y(tick)}" y2="${y(tick)}"/><text class="chart-text" x="0" y="${y(tick)+3}">${tick}</text>`).join("")}
      <path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>
      ${points.map(([cx, cy]) => `<circle class="chart-dot" cx="${cx}" cy="${cy}" r="3.5"/>`).join("")}
      <text class="chart-text" x="${left}" y="${H-5}">${displayDate(history[0].date)}</text>
      <text class="chart-text" x="${W-right}" y="${H-5}" text-anchor="end">${displayDate(history.at(-1).date)}</text>
    </svg>`;
  el("chart-latest").textContent = `${values.at(-1)} BPM`;

  history.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.originalBucket} BPM</strong> <span>· ${displayDate(item.date)}</span><br>${escapeHtml(item.song)}`;
    events.append(li);
  });
}

function syncViewToggle() {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
}

function refreshAll() {
  renderTargets();
  renderSurface();
  if (state.selected) {
    state.selected.mode = state.view;
    renderDetail();
  }
}

function bindControls() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    syncViewToggle();
    refreshAll();
  }));
  el("bpm-step").addEventListener("change", (event) => {
    state.bpmStep = Number(event.target.value);
    if (state.selected) state.selected.bpm = bucketBpm(state.selected.bpm);
    refreshAll();
  });
  el("measure-set").addEventListener("change", (event) => { state.measureSet = event.target.value; renderSurface(); });
  el("trickle").addEventListener("change", (event) => { state.trickle = event.target.checked; renderSurface(); if (state.selected) renderDetail(); });
  el("hide-fails").addEventListener("change", (event) => { state.hideFails = event.target.checked; refreshAll(); });
  document.querySelectorAll(".target-card").forEach((card) => card.addEventListener("click", () => {
    const mode = card.dataset.mode;
    const measure = Number(card.dataset.target);
    const best = maxBpmFor(measure, mode);
    selectBenchmark(best ? bucketBpm(best.originalBucket) : 100, measure, mode);
    el("detail-panel").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

async function init() {
  try {
    const [dataResponse, difficultyResponse] = await Promise.all([fetch(DATA_FILE), fetch(DIFFICULTY_FILE)]);
    if (!dataResponse.ok || !difficultyResponse.ok) throw new Error("Dashboard data files could not be loaded.");
    state.data = await dataResponse.json();
    parseCSV(await difficultyResponse.text());
    state.attempts = collectAttempts(state.data);
    const fetched = parseDate(state.data.fetched_at);
    el("snapshot-date").textContent = fetched ? `Snapshot · ${displayDate(fetched, { year: "numeric" })}` : "Current snapshot";
    el("snapshot-meta").textContent = `${state.attempts.length} recorded runs · player ${state.data.player_id}`;
    const failCount = state.attempts.filter((attempt) => attempt.is_fail).length;
    el("fail-count").textContent = `Exclude ${failCount} failed run${failCount === 1 ? "" : "s"}`;
    bindControls();
    refreshAll();
  } catch (error) {
    el("fatal-error").hidden = false;
    el("fatal-error").textContent = `${error.message} Serve this directory over HTTP (for example: python3 -m http.server) rather than opening the HTML file directly.`;
    el("grid-wrap").innerHTML = `<div class="loading-state">Could not load PB data.</div>`;
  }
}

init();
