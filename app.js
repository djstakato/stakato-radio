// 1) PUT YOUR REAL PUBLIC IMAGE URLS HERE
// These should be the SAME base as your MP3s, just pointing to the png files in each bucket.
// Example: https://pub-xxxxx.r2.dev/peak.png
const PEAK_COVER_URL = "https://pub-9db46a6d9e60462d9ab03a9f5f4a7b8e.r2.dev/peak.png";
const LEFT_COVER_URL = "https://pub-e25dc8d0523941dfa8e011579a4d2751.r2.dev/leftfield.png";

const els = {
  landing: document.getElementById("landing"),
  app: document.getElementById("app"),
  player: document.getElementById("player"),

  pickPeak: document.getElementById("pickPeak"),
  pickLeft: document.getElementById("pickLeft"),
  imgPeak: document.getElementById("imgPeak"),
  imgLeft: document.getElementById("imgLeft"),

  heroImg: document.getElementById("heroImg"),
  heroVol: document.getElementById("heroVol"),
  heroName: document.getElementById("heroName"),
  volumeSwitch: document.getElementById("volumeSwitch"),

  genre: document.getElementById("genre"),
  shuffle: document.getElementById("shuffle"),
  stats: document.getElementById("stats"),
  list: document.getElementById("list"),

  audio: document.getElementById("audio"),
  nowTitle: document.getElementById("nowTitle"),
  nowMeta: document.getElementById("nowMeta"),
  playPause: document.getElementById("playPause"),
  next: document.getElementById("next"),
  prev: document.getElementById("prev"),

  seek: document.getElementById("seek"),
  tCur: document.getElementById("tCur"),
  tDur: document.getElementById("tDur"),
};

let state = {
  volume: null,
  tracks: [],
  filtered: [],
  currentIndex: -1,
  isLoading: false,
  isSeeking: false,
};

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
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

function resetProgress() {
  els.seek.value = 0;
  els.seek.disabled = true;
  els.tCur.textContent = "0:00";
  els.tDur.textContent = "0:00";
}

function enableProgressIfPossible() {
  const dur = els.audio.duration || 0;
  if (dur > 0) {
    els.seek.disabled = false;
    els.tDur.textContent = fmtTime(dur);
  }
}

function uniqGenres(list) {
  const s = new Set();
  list.forEach(t => { if (t.genre) s.add(t.genre); });
  return [...s].sort((a, b) => a.localeCompare(b));
}

function renderGenre() {
  const cur = els.genre.value;
  els.genre.innerHTML = `<option value="">All genres</option>`;
  uniqGenres(state.tracks).forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    els.genre.appendChild(opt);
  });
  if ([...els.genre.options].some(o => o.value === cur)) els.genre.value = cur;
}

function applyFilter() {
  const g = els.genre.value;
  state.filtered = state.tracks.filter(t => !g || t.genre === g);
  els.stats.textContent = `${state.filtered.length} tracks${g ? ` · ${g}` : ""}`;
  renderList();
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList() {
  els.list.innerHTML = "";
  state.filtered.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="t">${escapeHtml(t.title || t.id)}</div>
      <div class="m">${escapeHtml(metaLine(t))}</div>
      ${t.genre ? `<span class="badge">${escapeHtml(t.genre.toUpperCase())}</span>` : ""}
    `;

    const btn = document.createElement("button");
    btn.className = "playBtn";
    btn.textContent = "PLAY";
    btn.addEventListener("click", () => playFromFiltered(i));

    row.appendChild(left);
    row.appendChild(btn);
    els.list.appendChild(row);
  });
}

function playTrack(t) {
  if (!t) return;

  els.audio.src = t.src;
  resetProgress(); // reset immediately
  els.audio.play().catch(() => {});
  setNow(t);
  els.playPause.textContent = "⏸";
}

function playFromFiltered(i) {
  const t = state.filtered[i];
  if (!t) return;

  const abs = state.tracks.findIndex(x => x.id === t.id);
  state.currentIndex = abs >= 0 ? abs : 0;
  playTrack(t);
}

function nextTrack() {
  if (!state.tracks.length) return;
  if (state.currentIndex < 0) state.currentIndex = 0;
  state.currentIndex = (state.currentIndex + 1) % state.tracks.length;
  playTrack(state.tracks[state.currentIndex]);
}

function prevTrack() {
  if (!state.tracks.length) return;
  if (state.currentIndex < 0) state.currentIndex = 0;
  state.currentIndex = (state.currentIndex - 1 + state.tracks.length) % state.tracks.length;
  playTrack(state.tracks[state.currentIndex]);
}

function togglePlayPause() {
  if (!els.audio.src) {
    if (state.filtered.length) playFromFiltered(0);
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

function shuffle() {
  if (!state.tracks.length) return;
  state.currentIndex = Math.floor(Math.random() * state.tracks.length);
  playTrack(state.tracks[state.currentIndex]);
}

function setHero(volume) {
  if (volume === "peak") {
    els.heroVol.textContent = "VOLUME 1";
    els.heroName.textContent = "PEAK";
    els.heroImg.src = PEAK_COVER_URL;
  } else {
    els.heroVol.textContent = "VOLUME 2";
    els.heroName.textContent = "LEFT FIELD";
    els.heroImg.src = LEFT_COVER_URL;
  }
}

async function enterVolume(volume) {
  if (state.isLoading) return;
  state.isLoading = true;

  try {
    state.volume = volume;

    if (els.volumeSwitch) els.volumeSwitch.value = volume;
    setHero(volume);

    const file = volume === "peak" ? "tracks-peak.json" : "tracks-leftfield.json";
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
    state.tracks = await res.json();

    // reset player
    state.filtered = [];
    state.currentIndex = -1;
    els.audio.pause();
    els.audio.removeAttribute("src");
    els.audio.load();
    setNow(null);
    els.playPause.textContent = "▶";
    resetProgress();

    renderGenre();
    applyFilter();

    // show app
    els.landing.classList.add("hidden");
    els.app.classList.remove("hidden");
    els.player.classList.remove("hidden");
  } finally {
    state.isLoading = false;
  }
}

function wirePlayerProgress() {
  // Enable progress when we know duration
  els.audio.addEventListener("loadedmetadata", () => {
    enableProgressIfPossible();
  });

  // Update progress as it plays
  els.audio.addEventListener("timeupdate", () => {
    if (state.isSeeking) return;
    const cur = els.audio.currentTime || 0;
    const dur = els.audio.duration || 0;

    els.tCur.textContent = fmtTime(cur);
    els.tDur.textContent = fmtTime(dur);

    if (dur > 0) {
      els.seek.value = Math.floor((cur / dur) * 1000);
      els.seek.disabled = false;
    }
  });

  // Seek interaction: lock updates while user drags
  els.seek.addEventListener("pointerdown", () => { state.isSeeking = true; });
  els.seek.addEventListener("pointerup", () => { state.isSeeking = false; });

  els.seek.addEventListener("input", () => {
    const dur = els.audio.duration || 0;
    if (dur <= 0) return;
    const pct = Number(els.seek.value) / 1000;
    els.audio.currentTime = pct * dur;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Landing images
  els.imgPeak.src = PEAK_COVER_URL;
  els.imgLeft.src = LEFT_COVER_URL;

  // Enter from landing
  els.pickPeak.addEventListener("click", () => enterVolume("peak"));
  els.pickLeft.addEventListener("click", () => enterVolume("leftfield"));

  // Switch volumes in app
  if (els.volumeSwitch) {
    els.volumeSwitch.addEventListener("change", async () => {
      await enterVolume(els.volumeSwitch.value);
    });
  }

  // Genre only
  els.genre.addEventListener("change", applyFilter);

  // Shuffle
  els.shuffle.addEventListener("click", shuffle);

  // Player controls
  els.playPause.addEventListener("click", togglePlayPause);
  els.next.addEventListener("click", nextTrack);
  els.prev.addEventListener("click", prevTrack);

  // Autoplay next when track ends
  els.audio.addEventListener("ended", nextTrack);

  // Progress wiring
  resetProgress();
  wirePlayerProgress();
});


