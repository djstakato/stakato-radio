const els = {
  list: document.getElementById("list"),
  stats: document.getElementById("stats"),
  search: document.getElementById("search"),
  station: document.getElementById("station"),
  sort: document.getElementById("sort"),
  genre: document.getElementById("genre"),
  recent: document.getElementById("recent"),

  shuffleAll: document.getElementById("shuffleAll"),
  glitch: document.getElementById("glitch"),

  audio: document.getElementById("audio"),
  nowTitle: document.getElementById("nowTitle"),
  nowMeta: document.getElementById("nowMeta"),
  playPause: document.getElementById("playPause"),
  next: document.getElementById("next"),
  prev: document.getElementById("prev"),
  seek: document.getElementById("seek"),
  cur: document.getElementById("cur"),
  dur: document.getElementById("dur"),
};

let tracks = [];
let filtered = [];
let currentIndex = -1;
let recent = [];
const RECENT_MAX = 8;

let glitchMode = false;

function fmtTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function metaLine(t) {
  const bits = [];
  if (t.artist) bits.push(t.artist);
  if (t.year) bits.push(String(t.year));
  if (t.genre) bits.push(t.genre);
  return bits.join(" · ");
}

function setNow(t) {
  els.nowTitle.textContent = t ? (t.title || t.id) : "Nothing playing";
  els.nowMeta.textContent = t ? metaLine(t) : "";
}

function uniqGenres(list) {
  const s = new Set();
  list.forEach(t => { if (t.genre) s.add(t.genre); });
  return [...s].sort((a, b) => a.localeCompare(b));
}

function renderGenreDropdown() {
  const cur = els.genre.value;
  els.genre.innerHTML = `<option value="">All</option>`;
  uniqGenres(tracks).forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    els.genre.appendChild(opt);
  });
  if ([...els.genre.options].some(o => o.value === cur)) els.genre.value = cur;
}

function applyFilters() {
  const q = (els.search.value || "").toLowerCase().trim();
  const g = els.genre.value;

  filtered = tracks.filter(t => {
    const hay = `${t.title || ""} ${t.artist || ""} ${t.genre || ""} ${t.year || ""}`.toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchG = !g || (t.genre === g);
    return matchQ && matchG;
  });

  const sortKey = els.sort.value;
  filtered.sort((a, b) => {
    if (sortKey === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortKey === "artist") return (a.artist || "").localeCompare(b.artist || "");
    if (sortKey === "genre") return (a.genre || "").localeCompare(b.genre || "");
    if (sortKey === "year") return (a.year || 0) - (b.year || 0);
    return 0;
  });

  els.stats.textContent = `${filtered.length} tracks on ${els.station.value.toUpperCase()}`;
  renderList();
}

function renderList() {
  els.list.innerHTML = "";
  filtered.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.title || t.id;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = metaLine(t);

    const badges = document.createElement("div");
    badges.className = "badges";
    if (t.genre) {
      const b = document.createElement("span");
      b.className = "badge cold";
      b.textContent = t.genre.toUpperCase();
      badges.appendChild(b);
    }
    if (t.year) {
      const b2 = document.createElement("span");
      b2.className = "badge";
      b2.textContent = String(t.year);
      badges.appendChild(b2);
    }

    left.appendChild(title);
    left.appendChild(meta);
    left.appendChild(badges);

    const btn = document.createElement("button");
    btn.className = "playBtn";
    btn.textContent = "PLAY";
    btn.addEventListener("click", () => playFromFiltered(i));

    row.appendChild(left);
    row.appendChild(btn);

    // occasional micro-glitch styling
    if (glitchMode && Math.random() < 0.08) {
      row.style.transform = `translate(${Math.floor(Math.random()*3)-1}px, ${Math.floor(Math.random()*3)-1}px)`;
      row.style.filter = `hue-rotate(${Math.floor(Math.random()*40)-20}deg)`;
    }

    els.list.appendChild(row);
  });
}

function pushRecent(t) {
  recent = [t, ...recent.filter(x => x.id !== t.id)].slice(0, RECENT_MAX);
  els.recent.innerHTML = "";
  recent.forEach(x => {
    const d = document.createElement("div");
    d.className = "recent-item";
    d.innerHTML = `<div class="t">${x.title || x.id}</div><div class="m">${metaLine(x)}</div>`;
    d.addEventListener("click", () => playExact(x));
    els.recent.appendChild(d);
  });
}

function playExact(t) {
  const abs = tracks.findIndex(x => x.id === t.id);
  if (abs >= 0) currentIndex = abs;

  els.audio.src = t.src;
  els.audio.play().catch(() => {});
  setNow(t);
  els.playPause.textContent = "⏸";
  pushRecent(t);
}

function playFromFiltered(i) {
  const t = filtered[i];
  if (!t) return;
  playExact(t);
}

function nextTrack() {
  if (!tracks.length) return;
  if (currentIndex < 0) currentIndex = 0;
  currentIndex = (currentIndex + 1) % tracks.length;
  playExact(tracks[currentIndex]);
}

function prevTrack() {
  if (!tracks.length) return;
  if (currentIndex < 0) currentIndex = 0;
  currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
  playExact(tracks[currentIndex]);
}

function togglePlayPause() {
  if (!els.audio.src) {
    if (filtered.length) playFromFiltered(0);
    return;
  }
  if (els.audio.paused) {
    els.audio.play().catch(() => {});
    els.playPause.textContent = "⏸";
  } else {
    els.audio.pause();
    els.playPause.textContent = "▶";
  }
}

function shuffleAll() {
  if (!tracks.length) return;
  currentIndex = Math.floor(Math.random() * tracks.length);
  playExact(tracks[currentIndex]);
}

function setGlitchMode(on) {
  glitchMode = on;
  document.body.classList.toggle("glitch-pulse", glitchMode);
  els.glitch.textContent = glitchMode ? "GLITCH ON" : "GLITCH";
}

async function loadStation(name) {
  const file = name === "peak" ? "tracks-peak.json" : "tracks-leftfield.json";
  const res = await fetch(file, { cache: "no-store" });
  tracks = await res.json();

  // reset player state
  filtered = [];
  currentIndex = -1;
  recent = [];
  els.recent.innerHTML = "";

  els.audio.pause();
  els.audio.removeAttribute("src");
  els.audio.load();
  setNow(null);
  els.playPause.textContent = "▶";

  renderGenreDropdown();
  applyFilters();
}

function wirePlayer() {
  els.playPause.addEventListener("click", togglePlayPause);
  els.next.addEventListener("click", nextTrack);
  els.prev.addEventListener("click", prevTrack);
  els.shuffleAll.addEventListener("click", shuffleAll);

  els.glitch.addEventListener("click", () => setGlitchMode(!glitchMode));

  els.search.addEventListener("input", applyFilters);
  els.sort.addEventListener("change", applyFilters);
  els.genre.addEventListener("change", applyFilters);

  els.station.addEventListener("change", () => loadStation(els.station.value));

  els.audio.addEventListener("ended", () => {
    // if glitch mode, occasionally jump to a random track
    if (glitchMode && Math.random() < 0.18) shuffleAll();
    else nextTrack();
  });

  els.audio.addEventListener("loadedmetadata", () => {
    els.dur.textContent = fmtTime(els.audio.duration);
  });

  els.audio.addEventListener("timeupdate", () => {
    const cur = els.audio.currentTime || 0;
    const dur = els.audio.duration || 0;
    els.cur.textContent = fmtTime(cur);
    els.dur.textContent = fmtTime(dur);
    if (dur > 0) els.seek.value = Math.floor((cur / dur) * 1000);
  });

  els.seek.addEventListener("input", () => {
    const dur = els.audio.duration || 0;
    if (dur <= 0) return;
    const pct = Number(els.seek.value) / 1000;
    els.audio.currentTime = pct * dur;
  });

  // optional: hide scrubbing if you want it more “radio”
  // els.seek.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
  wirePlayer();
  setGlitchMode(false);
  await loadStation(els.station.value);
});