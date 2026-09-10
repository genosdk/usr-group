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
