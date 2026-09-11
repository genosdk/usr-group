const projects = {
  photon: {
    index: "01",
    name: "PHOTON",
    path: "photon.usr.group",
    state: "ACTIVE RESEARCH",
    description: "Alternate firmware research for the Elektron Analog Rytm MKII. Mapping the machine below its documented interface and building a new operating layer from first principles.",
    tags: "FIRMWARE / REVERSE ENGINEERING / AUDIO",
    url: "https://github.com/genosdk/analog-rytm-mkii-research",
    action: "VIEW SOURCE"
  },
  sudo: {
    index: "02",
    name: "SUDO",
    path: "sudo.usr.group",
    state: "RESTRICTED",
    description: "Controlled access to beta firmware, test procedures, and reports from trusted operators.",
    tags: "BETA / TESTERS / REPORTS"
  },
  src: {
    index: "03",
    name: "SRC",
    path: "src.usr.group",
    state: "PUBLIC INDEX",
    description: "Source repositories, utilities, experiments, and reproducible artifacts released by the group.",
    tags: "GIT / TOOLS / RELEASES",
    url: "https://github.com/genosdk",
    action: "OPEN GITHUB"
  },
  man: {
    index: "04",
    name: "MAN",
    path: "man.usr.group",
    state: "IN PREPARATION",
    description: "Field manuals, protocol notes, build instructions, and technical references written for operators.",
    tags: "MANUALS / PROTOCOLS / NOTES"
  },
  lab: {
    index: "05",
    name: "LAB",
    path: "lab.usr.group",
    state: "LIVE WORK",
    description: "Active traces, unresolved questions, hardware observations, and experiments not yet promoted to documentation.",
    tags: "EXPERIMENTS / TRACES / WORKLOG"
  },
  archive: {
    index: "06",
    name: "ARCHIVE",
    path: "archive.usr.group",
    state: "PRESERVED",
    description: "Stable findings, recovered knowledge, superseded methods, and reference material kept addressable over time.",
    tags: "FINDINGS / HISTORY / REFERENCE"
  }
};

const selectors = [...document.querySelectorAll(".selector")];
const output = {
  index: document.querySelector("#project-index"),
  command: document.querySelector("#project-command"),
  name: document.querySelector("#project-name"),
  path: document.querySelector("#project-path"),
  state: document.querySelector("#project-state"),
  description: document.querySelector("#project-description"),
  tags: document.querySelector("#project-tags"),
  action: document.querySelector("#project-action"),
  actionLabel: document.querySelector("#project-action-label")
};

function selectProject(key, updateHash = true) {
  const project = projects[key] || projects.photon;
  document.body.dataset.project = key;
  selectors.forEach((selector) => {
    const active = selector.dataset.project === key;
    selector.classList.toggle("is-active", active);
    selector.setAttribute("aria-pressed", String(active));
  });

  output.index.textContent = project.index;
  output.command.textContent = project.name.toLowerCase();
  output.name.textContent = project.name;
  output.path.textContent = project.path;
  output.state.textContent = project.state;
  output.description.textContent = project.description;
  output.tags.textContent = project.tags;
  output.action.hidden = !project.url;

  if (project.url) {
    output.action.href = project.url;
    output.actionLabel.textContent = project.action;
  }

  if (updateHash) {
    history.replaceState(null, "", key === "photon" ? location.pathname : `#${key}`);
  }
}

selectors.forEach((selector, index) => {
  selector.addEventListener("click", () => selectProject(selector.dataset.project));
  selector.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const next = selectors[(index + direction + selectors.length) % selectors.length];
    next.focus();
    selectProject(next.dataset.project);
  });
});

const initialKey = location.hash.slice(1);
selectProject(projects[initialKey] ? initialKey : "photon", false);

const clock = document.querySelector("#utc-clock");
function updateClock() {
  clock.textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
}
updateClock();
setInterval(updateClock, 1000);

const audio = document.querySelector("#site-audio");
const audioControl = document.querySelector("#audio-control");
const spectrumCanvas = document.querySelector("#spectrum-canvas");
const audioSource = document.body.dataset.audioSrc.trim();

if (audioSource) audio.src = audioSource;

let audioContext;
let analyser;
let sourceNode;
let frequencyData;
const spectrumHistory = [];
const spectrumRows = 34;
const spectrumBins = 72;
let lastSpectrumSample = 0;

const palette = [
  [0, [18, 7, 46]],
  [.22, [52, 13, 92]],
  [.42, [112, 27, 105]],
  [.61, [184, 52, 82]],
  [.78, [238, 112, 43]],
  [.91, [255, 184, 55]],
  [1, [255, 239, 118]]
];

function paletteColor(value, alpha) {
  const level = Math.max(0, Math.min(1, value));
  let lower = palette[0];
  let upper = palette[palette.length - 1];
  for (let index = 1; index < palette.length; index += 1) {
    if (level <= palette[index][0]) {
      lower = palette[index - 1];
      upper = palette[index];
      break;
    }
  }
  const mix = (level - lower[0]) / (upper[0] - lower[0] || 1);
  const channels = lower[1].map((channel, index) => Math.round(channel + (upper[1][index] - channel) * mix));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

function initializeAudioGraph() {
  if (analyser) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  audioContext = new AudioEngine();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = .76;
  analyser.minDecibels = -95;
  analyser.maxDecibels = -10;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
}

function currentSpectrum(time) {
  if (!analyser || audio.paused) {
    return Array.from({ length: spectrumBins }, (_, index) => {
      const x = index / (spectrumBins - 1);
      const pulse = .5 + .5 * Math.sin(time * .00035 + index * .18);
      return .012 + .018 * pulse * Math.exp(-x * 2.4);
    });
  }

  analyser.getByteFrequencyData(frequencyData);
  const nyquist = audioContext.sampleRate / 2;
  return Array.from({ length: spectrumBins }, (_, index) => {
    const position = index / (spectrumBins - 1);
    const frequency = 28 * Math.pow(nyquist / 28, position);
    const center = Math.max(1, Math.min(frequencyData.length - 2, Math.round(frequency / nyquist * frequencyData.length)));
    const energy = (frequencyData[center - 1] + frequencyData[center] * 2 + frequencyData[center + 1]) / (4 * 255);
    const edgeTaper = Math.pow(Math.sin(Math.PI * position), .22);
    return Math.min(1, Math.pow(energy, .95) * 1.08 * edgeTaper);
  });
}

function renderSpectrum(time) {
  const context = spectrumCanvas.getContext("2d");
  const bounds = spectrumCanvas.getBoundingClientRect();
  const density = Math.min(3, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(bounds.width * density));
  const height = Math.max(1, Math.round(bounds.height * density));
  if (spectrumCanvas.width !== width || spectrumCanvas.height !== height) {
    spectrumCanvas.width = width;
    spectrumCanvas.height = height;
  }
  context.setTransform(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  if (!spectrumHistory.length || time - lastSpectrumSample > 52) {
    spectrumHistory.unshift(currentSpectrum(time));
    if (spectrumHistory.length > spectrumRows) spectrumHistory.length = spectrumRows;
    lastSpectrumSample = time;
  }
  while (spectrumHistory.length < spectrumRows) spectrumHistory.push([...spectrumHistory[spectrumHistory.length - 1]]);

  const point = (row, bin, level) => {
    const depth = row / (spectrumRows - 1);
    const perspective = 1 - depth * .42;
    const horizontal = bin / (spectrumBins - 1) - .5;
    return [
      bounds.width * .5 + horizontal * bounds.width * .94 * perspective,
      bounds.height * .95 - depth * bounds.height * .28 - level * bounds.height * .76 * perspective
    ];
  };

  context.globalCompositeOperation = "source-over";
  for (let row = spectrumRows - 2; row >= 0; row -= 1) {
    for (let bin = 0; bin < spectrumBins - 1; bin += 1) {
      const values = [
        spectrumHistory[row][bin],
        spectrumHistory[row][bin + 1],
        spectrumHistory[row + 1][bin + 1],
        spectrumHistory[row + 1][bin]
      ];
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const displayLevel = Math.min(1, .1 + Math.pow(average, .72) * 1.08);
      const alpha = .7 + (1 - row / (spectrumRows - 1)) * .28;
      const corners = [
        point(row, bin, values[0]),
        point(row, bin + 1, values[1]),
        point(row + 1, bin + 1, values[2]),
        point(row + 1, bin, values[3])
      ];
      context.beginPath();
      context.moveTo(corners[0][0], corners[0][1]);
      corners.slice(1).forEach(([x, y]) => context.lineTo(x, y));
      context.closePath();
      context.fillStyle = paletteColor(displayLevel, alpha);
      context.fill();
    }
  }
  requestAnimationFrame(renderSpectrum);
}

function updateAudioControl() {
  const playing = !audio.paused;
  audioControl.classList.toggle("is-playing", playing);
  audioControl.setAttribute("aria-pressed", String(playing));
  audioControl.setAttribute("aria-label", playing ? "Stop audio" : "Play audio");
}

async function startAudio() {
  if (!audioSource) return;
  try {
    initializeAudioGraph();
    if (audioContext?.state === "suspended") await audioContext.resume();
    await audio.play();
    audioControl.classList.remove("is-blocked");
  } catch {
    audioControl.classList.add("is-blocked");
  }
  updateAudioControl();
}

audioControl.addEventListener("click", async () => {
  if (audio.paused) {
    await startAudio();
  } else {
    audio.pause();
    audio.currentTime = 0;
    audioControl.classList.remove("is-blocked");
    updateAudioControl();
  }
});

audio.addEventListener("play", updateAudioControl);
audio.addEventListener("pause", updateAudioControl);
audio.addEventListener("ended", updateAudioControl);
requestAnimationFrame(renderSpectrum);
startAudio();
