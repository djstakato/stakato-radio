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

  genre: document.getElementById("genre"),
  shuffle: document.getElementById("shuffle"),
  back: document.getElementById("back"),
  stats: document.getElementById("stats"),
  list: document.getElementById("list"),

  audio: document.getElementById("audio"),
  nowTitle: document.getElementById("nowTitle"),
  nowMeta: document.getElementById("nowMeta"),
  playPause: document.getElementById("playPause"),
  next: document.getElementById("next"),
  prev: document.getElementById("prev"),
};

let state = {
  volume: null, // "peak" | "leftfield"
  tracks: [],
  filtered: [],
  currentIndex: -1,
};

function metaLine(t){
  const bits = [];
  if (t.artist) bits.push(t.artist);
  if (t.year) bits.push(String(t.year));
  if (t.genre) bits.push(t.genre);
  return bits.join(" · ");
}

function setNow(t){
  els.nowTitle.textContent = t ? (t.title || t.id) : "Nothing playing";
  els.nowMeta.textContent = t ? metaLine(t) : "";
}

function uniqGenres(list){
  const s = new Set();
  list.forEach(t => { if (t.genre) s.add(t.genre); });
  return [...s].sort((a,b) => a.localeCompare(b));
}

function renderGenre(){
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

function applyFilter(){
  const g = els.genre.value;
  state.filtered = state.tracks.filter(t => !g || t.genre === g);
  els.stats.textContent = `${state.filtered.length} tracks${g ? ` · ${g}` : ""}`;
  renderList();
}

function renderList(){
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

function playFromFiltered(i){
  const t = state.filtered[i];
  if (!t) return;

  // map to absolute index so next/prev works across full list
  const abs = state.tracks.findIndex(x => x.id === t.id);
  state.currentIndex = abs >= 0 ? abs : 0;

  els.audio.src = t.src;
  els.audio.play().catch(()=>{});
  setNow(t);
  els.playPause.textContent = "⏸";
}

function nextTrack(){
  if (!state.tracks.length) return;
  if (state.currentIndex < 0) state.currentIndex = 0;
  state.currentIndex = (state.currentIndex + 1) % state.tracks.length;
  const t = state.tracks[state.currentIndex];
  els.audio.src = t.src;
  els.audio.play().catch(()=>{});
  setNow(t);
  els.playPause.textContent = "⏸";
}

function prevTrack(){
  if (!state.tracks.length) return;
  if (state.currentIndex < 0) state.currentIndex = 0;
  state.currentIndex = (state.currentIndex - 1 + state.tracks.length) % state.tracks.length;
  const t = state.tracks[state.currentIndex];
  els.audio.src = t.src;
  els.audio.play().catch(()=>{});
  setNow(t);
  els.playPause.textContent = "⏸";
}

function togglePlayPause(){
  if (!els.audio.src){
    if (state.filtered.length) playFromFiltered(0);
    return;
  }
  if (els.audio.paused){
    els.audio.play().catch(()=>{});
    els.playPause.textContent = "⏸";
  } else {
    els.audio.pause();
    els.playPause.textContent = "▶";
  }
}

function shuffle(){
  if (!state.tracks.length) return;
  state.currentIndex = Math.floor(Math.random() * state.tracks.length);
  const t = state.tracks[state.currentIndex];
  els.audio.src = t.src;
  els.audio.play().catch(()=>{});
  setNow(t);
  els.playPause.textContent = "⏸";
}

async function enterVolume(volume){
  state.volume = volume;

  // hero + cover
  if (volume === "peak"){
    els.heroVol.textContent = "VOLUME 1";
    els.heroName.textContent = "PEAK";
    els.heroImg.src = PEAK_COVER_URL;
  } else {
    els.heroVol.textContent = "VOLUME 2";
    els.heroName.textContent = "LEFT FIELD";
    els.heroImg.src = LEFT_COVER_URL;
  }

  // load data
  const file = volume === "peak" ? "tracks-peak.json" : "tracks-leftfield.json";
  const res = await fetch(file, { cache: "no-store" });
  state.tracks = await res.json();

  // reset player
  state.currentIndex = -1;
  els.audio.pause();
  els.audio.removeAttribute("src");
  els.audio.load();
  setNow(null);
  els.playPause.textContent = "▶";

  renderGenre();
  applyFilter();

  // show app
  els.landing.classList.add("hidden");
  els.app.classList.remove("hidden");
  els.player.classList.remove("hidden");

  // little “awesome” moment: smooth scroll + subtle flash
  window.scrollTo({ top: 0, behavior: "smooth" });
  pulse();
}

function backToLanding(){
  els.app.classList.add("hidden");
  els.player.classList.add("hidden");
  els.landing.classList.remove("hidden");

  els.audio.pause();
  els.audio.removeAttribute("src");
  els.audio.load();
  setNow(null);
  els.playPause.textContent = "▶";
}

function pulse(){
  document.body.style.transition = "filter .18s ease";
  document.body.style.filter = "contrast(1.1) saturate(1.15)";
  setTimeout(() => { document.body.style.filter = ""; }, 180);
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  // set landing images
  els.imgPeak.src = PEAK_COVER_URL;
  els.imgLeft.src = LEFT_COVER_URL;

  els.pickPeak.addEventListener("click", () => enterVolume("peak"));
  els.pickLeft.addEventListener("click", () => enterVolume("leftfield"));

  els.genre.addEventListener("change", applyFilter);
  els.shuffle.addEventListener("click", shuffle);
  els.back.addEventListener("click", backToLanding);

  els.playPause.addEventListener("click", togglePlayPause);
  els.next.addEventListener("click", nextTrack);
  els.prev.addEventListener("click", prevTrack);

  els.audio.addEventListener("ended", nextTrack);
});
