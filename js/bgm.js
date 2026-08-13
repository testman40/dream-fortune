const audio = document.getElementById("bgm-audio");
const controls = document.getElementById("bgm-controls");
const summary = document.getElementById("bgm-summary");
const toggle = document.getElementById("bgm-toggle");
const slider = document.getElementById("bgm-volume");
const volumeOutput = document.getElementById("bgm-volume-output");
const status = document.getElementById("bgm-status");

const ENABLED_KEY = "dreamFortune.bgmEnabled.v1";
const VOLUME_KEY = "dreamFortune.bgmVolume.v1";
const DEFAULT_VOLUME = 30;
const MAX_VOLUME = 50;
const FADE_DURATION = 650;

let enabled = readEnabled();
let volume = readVolume();
let fadeFrame = 0;
let resumeFromGesture = null;

audio.loop = true;
audio.volume = volume / 100;
slider.value = String(volume);
render();

if (enabled) armGestureStart();

toggle.addEventListener("click", async () => {
  enabled = !enabled;
  save(ENABLED_KEY, String(enabled));
  render();
  if (enabled) await startPlayback();
  else {
    disarmGestureStart();
    fadeTo(0, true);
  }
});

slider.addEventListener("input", () => {
  volume = clampVolume(slider.value);
  save(VOLUME_KEY, String(volume));
  cancelAnimationFrame(fadeFrame);
  audio.volume = volume / 100;
  render();
});

audio.addEventListener("error", () => {
  status.textContent = "音源を読み込めませんでした";
});

function readEnabled() {
  try { return localStorage.getItem(ENABLED_KEY) === "true"; }
  catch { return false; }
}

function readVolume() {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    return clampVolume(saved === null ? DEFAULT_VOLUME : saved);
  } catch {
    return DEFAULT_VOLUME;
  }
}

function clampVolume(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_VOLUME, Math.max(0, Math.round(number))) : DEFAULT_VOLUME;
}

function save(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* 保存できない環境でもBGM操作は継続する */ }
}

function render() {
  summary.textContent = `♪ BGM ${enabled ? "ON" : "OFF"}`;
  toggle.textContent = enabled ? "ON" : "OFF";
  toggle.setAttribute("aria-pressed", String(enabled));
  slider.value = String(volume);
  volumeOutput.value = `${volume}%`;
  if (!enabled) status.textContent = "停止中";
  else if (audio.paused) status.textContent = "操作後に再生します";
  else status.textContent = "再生中";
}

async function startPlayback() {
  cancelAnimationFrame(fadeFrame);
  audio.volume = 0;
  try {
    await audio.play();
    fadeTo(volume / 100, false);
    render();
    return true;
  } catch {
    audio.volume = volume / 100;
    status.textContent = "再生するには画面を操作してください";
    armGestureStart();
    return false;
  }
}

function fadeTo(target, pauseAfter) {
  cancelAnimationFrame(fadeFrame);
  const safeTarget = Math.min(MAX_VOLUME / 100, Math.max(0, target));
  const startVolume = audio.volume;
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : FADE_DURATION;
  const startedAt = performance.now();

  const step = (now) => {
    const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
    audio.volume = startVolume + (safeTarget - startVolume) * progress;
    if (progress < 1) fadeFrame = requestAnimationFrame(step);
    else {
      if (pauseAfter) audio.pause();
      render();
    }
  };
  fadeFrame = requestAnimationFrame(step);
}

function armGestureStart() {
  if (resumeFromGesture) return;
  resumeFromGesture = async (event) => {
    if (!enabled || event.target.closest("#bgm-controls")) return;
    if (await startPlayback()) disarmGestureStart();
  };
  document.addEventListener("pointerdown", resumeFromGesture, true);
  document.addEventListener("keydown", resumeFromGesture, true);
}

function disarmGestureStart() {
  if (!resumeFromGesture) return;
  document.removeEventListener("pointerdown", resumeFromGesture, true);
  document.removeEventListener("keydown", resumeFromGesture, true);
  resumeFromGesture = null;
}
