(() => {
  const PAGES = {
    crocodile: {
      title: "Крокодил",
      src: "../../assets/coloring/crocodile.svg",
      hint: "Нажми внутрь контура крокодила",
    },
    lion: {
      title: "Лев",
      src: "../../assets/coloring/lion.svg",
      hint: "Нажми внутрь контура льва",
    },
  };

  const COLORS = [
    { hex: "#FFE6C8", label: "Кремовый" },
    { hex: "#FF9B4A", label: "Оранжевый" },
    { hex: "#FFD166", label: "Жёлтый" },
    { hex: "#FF6B5A", label: "Красный" },
    { hex: "#FF8AB5", label: "Розовый" },
    { hex: "#3EC6B2", label: "Бирюзовый" },
    { hex: "#5BA8FF", label: "Синий" },
    { hex: "#A78BFA", label: "Фиолетовый" },
    { hex: "#C4A574", label: "Песочный" },
    { hex: "#8D6E63", label: "Коричневый" },
    { hex: "#90A4AE", label: "Серый" },
    { hex: "#F7F1EA", label: "Светлый" },
  ];

  const stage = document.getElementById("stage");
  const colorsEl = document.getElementById("colors");
  const hintEl = document.getElementById("hint");
  const pageTitle = document.getElementById("pageTitle");
  const progressBar = document.getElementById("progressBar");
  const soundBtn = document.getElementById("soundBtn");
  const fillTool = document.getElementById("fillTool");
  const eraseTool = document.getElementById("eraseTool");
  const resetBtn = document.getElementById("resetBtn");
  const doneBtn = document.getElementById("doneBtn");
  const completeModal = document.getElementById("completeModal");
  const completeText = document.getElementById("completeText");
  const againBtn = document.getElementById("againBtn");
  const otherBtn = document.getElementById("otherBtn");
  const confettiEl = document.getElementById("confetti");
  const pageButtons = Array.from(document.querySelectorAll(".page-btn"));

  let selectedColor = COLORS[1].hex;
  let mode = "fill";
  let soundOn = true;
  let audioCtx = null;
  let currentId = "crocodile";
  let regions = [];

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, dur, type, gainValue) {
    if (!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainValue, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  function playPop() {
    ensureAudio();
    tone(520, 0.12, "sine", 0.16);
  }

  function playWin() {
    ensureAudio();
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.18, "triangle", 0.12), i * 110);
    });
  }

  function renderColors() {
    colorsEl.innerHTML = "";
    COLORS.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-swatch" + (color.hex === selectedColor ? " selected" : "");
      btn.style.background = color.hex;
      btn.title = color.label;
      btn.setAttribute("aria-label", color.label);
      btn.addEventListener("click", () => {
        selectedColor = color.hex;
        mode = "fill";
        syncTools();
        renderColors();
        hintEl.textContent = `${color.label}. Нажми внутрь контура`;
      });
      colorsEl.appendChild(btn);
    });
  }

  function syncTools() {
    fillTool.classList.toggle("active", mode === "fill");
    eraseTool.classList.toggle("active", mode === "erase");
  }

  function isFilled(region) {
    return Boolean(region.style.fill);
  }

  function renderProgress() {
    if (!regions.length) {
      progressBar.style.width = "0%";
      return;
    }
    const done = regions.filter(isFilled).length;
    progressBar.style.width = `${Math.round((done / regions.length) * 100)}%`;
  }

  const LABELS = {
    tail: "хвост",
    body: "туловище",
    jawTop: "верхняя челюсть",
    jawBottom: "нижняя челюсть",
    mouth: "пасть",
    teethTop: "верхние зубки",
    teethBottom: "нижние зубки",
    eye: "глаз",
    mane: "грива",
    face: "мордочка",
    ear: "ушко",
    leg: "лапа",
    tuft: "кисточка",
    nose: "носик",
  };

  function regionLabel(region) {
    return LABELS[region.dataset.name] || "область";
  }

  function paint(region) {
    const name = regionLabel(region);
    if (mode === "erase") {
      region.style.fill = "";
      hintEl.textContent = `Стерли: ${name}`;
    } else {
      region.style.fill = selectedColor;
      const label = COLORS.find((c) => c.hex === selectedColor).label;
      hintEl.textContent = `${name}: ${label.toLowerCase()}`;
      playPop();
    }
    renderProgress();
  }

  function bindRegions() {
    regions = Array.from(stage.querySelectorAll(".region"));
    regions.forEach((region) => {
      region.setAttribute("role", "button");
      region.setAttribute("tabindex", "0");
      region.setAttribute("aria-label", `Закрасить: ${regionLabel(region)}`);
      region.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        paint(region);
      });
    });
    renderProgress();
  }

  async function loadPage(id) {
    const page = PAGES[id];
    if (!page) return;
    currentId = id;
    pageTitle.textContent = page.title;
    hintEl.textContent = page.hint;
    pageButtons.forEach((btn) => {
      const on = btn.dataset.page === id;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    completeModal.classList.remove("show");
    const response = await fetch(page.src);
    stage.innerHTML = await response.text();
    const svg = stage.querySelector("svg");
    if (svg) svg.setAttribute("aria-label", page.title);
    bindRegions();
  }

  function resetPage() {
    regions.forEach((region) => {
      region.style.fill = "";
    });
    completeModal.classList.remove("show");
    mode = "fill";
    syncTools();
    renderProgress();
    hintEl.textContent = PAGES[currentId].hint;
  }

  function spawnConfetti() {
    confettiEl.innerHTML = "";
    const palette = ["#FF6B5A", "#FFD166", "#3EC6B2", "#5BA8FF", "#A78BFA", "#FF8AB5"];
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = palette[i % palette.length];
      piece.style.animationDuration = `${1.2 + Math.random()}s`;
      confettiEl.appendChild(piece);
    }
  }

  function finish() {
    completeText.textContent = `${PAGES[currentId].title} раскрашен.`;
    spawnConfetti();
    completeModal.classList.add("show");
    playWin();
  }

  pageButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.page !== currentId) loadPage(btn.dataset.page);
    });
  });

  fillTool.addEventListener("click", () => {
    mode = "fill";
    syncTools();
    hintEl.textContent = "Заливка: выбери цвет и нажми внутрь контура";
  });
  eraseTool.addEventListener("click", () => {
    mode = "erase";
    syncTools();
    hintEl.textContent = "Ластик: нажми на закрашенную часть";
  });
  resetBtn.addEventListener("click", resetPage);
  doneBtn.addEventListener("click", finish);
  againBtn.addEventListener("click", resetPage);
  otherBtn.addEventListener("click", () => {
    loadPage(currentId === "crocodile" ? "lion" : "crocodile");
  });

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) playPop();
  });

  document.addEventListener("pointerdown", () => ensureAudio(), { once: true });

  renderColors();
  syncTools();
  loadPage("crocodile");
})();
