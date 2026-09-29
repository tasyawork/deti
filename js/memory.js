(() => {
  const base = new URL("../assets/games/memory/", document.currentScript.src);
  const FACES = [
    { id: "masha", file: "masha.png", alt: "Маша" },
    { id: "bear", file: "bear.png", alt: "Медведь" },
    { id: "hedgehog", file: "hedgehog.png", alt: "Ёжик" },
    { id: "rabbit", file: "rabbit.png", alt: "Заяц" },
  ].map((face) => ({ ...face, src: new URL(face.file + "?v=1", base).href }));

  const PAIRS = 3;
  const FLIP_MS = 700;
  const CLEAR_MS = 700;
  const PRAISE = [
    "Молодец!",
    "Так держать!",
    "Гений!",
    "Супер!",
    "Отлично!",
    "Ты супер!",
    "Вот это память!",
    "Блестяще!",
    "Ура, все пары!",
  ];

  function shuffle(list) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = next[i];
      next[i] = next[j];
      next[j] = swap;
    }
    return next;
  }

  window.MemoryGame = function MemoryGame(root) {
    root.innerHTML =
      '<div class="memory" data-cols="2">' +
        '<div class="memory-board"></div>' +
        '<div class="memory-done" hidden>' +
          '<p class="memory-praise"></p>' +
          '<button type="button" class="memory-again">Играть</button>' +
        "</div>" +
      "</div>";

    const board = root.querySelector(".memory-board");
    const done = root.querySelector(".memory-done");
    const praise = root.querySelector(".memory-praise");
    const again = root.querySelector(".memory-again");
    let lastPraise = "";

    let lock = false;
    let open = [];
    let matched = 0;
    let timer = 0;
    let advance = 0;

    function faceOf(id) {
      return FACES.find((face) => face.id === id);
    }

    function card(id) {
      const face = faceOf(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "memory-card";
      button.dataset.id = id;
      button.innerHTML =
        '<span class="memory-card-inner">' +
          '<span class="memory-face memory-back"></span>' +
          '<span class="memory-face memory-front">' +
            '<img alt="' + face.alt + '" draggable="false" src="' + face.src + '" />' +
          "</span>" +
        "</span>";
      button.addEventListener("pointerdown", (event) => {
        button.dataset.px = String(event.clientX);
        button.dataset.py = String(event.clientY);
      });
      button.addEventListener("click", (event) => {
        const dx = event.clientX - Number(button.dataset.px || event.clientX);
        const dy = event.clientY - Number(button.dataset.py || event.clientY);
        if (dx * dx + dy * dy > 64) return;
        flip(button);
      });
      return button;
    }

    function start() {
      window.clearTimeout(timer);
      window.clearTimeout(advance);
      lock = false;
      open = [];
      matched = 0;
      const faces = shuffle(shuffle(FACES).slice(0, PAIRS).flatMap((face) => [face.id, face.id]));
      done.hidden = true;
      board.hidden = false;
      board.replaceChildren(...faces.map(card));
    }

    function flip(button) {
      if (lock || button.classList.contains("is-up")) return;
      button.classList.add("is-up");
      open.push(button);
      if (open.length < 2) return;
      lock = true;
      const [a, b] = open;
      open = [];
      if (a.dataset.id === b.dataset.id) {
        a.classList.add("is-matched");
        b.classList.add("is-matched");
        matched += 1;
        lock = false;
        if (matched === PAIRS) cleared();
        return;
      }
      timer = window.setTimeout(() => {
        a.classList.remove("is-up");
        b.classList.remove("is-up");
        lock = false;
      }, FLIP_MS);
    }

    function nextPraise() {
      let phrase = lastPraise;
      while (phrase === lastPraise) {
        phrase = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      }
      lastPraise = phrase;
      return phrase;
    }

    function cleared() {
      advance = window.setTimeout(() => {
        praise.textContent = nextPraise();
        board.hidden = true;
        done.hidden = false;
      }, CLEAR_MS);
    }

    const ready = Promise.all(FACES.map((face) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = face.src;
    })));

    again.addEventListener("click", () => start());
    start();

    return {
      ready,
      cancelStroke() {},
    };
  };
})();
