(() => {
  const QUERY = "app_version=870&country_place_id=41207";
  const SHELVES = [
    { title: "Для детей от 7 до 12 лет", hru: "kids-7-12" },
    { title: "Для дошкольников", hru: "sayhellotofall" },
    { title: "Наши мультфильмы", hru: "russian-cartoons" },
    { title: "Сказки", hru: "cartoons-fairytales" },
    { title: "Про животных", hru: "cartoons-animals" },
    { title: "Советские сказки", hru: "10-skazok" },
    { title: "Зарубежные мультсериалы", hru: "zarubezhnyie-multserialyi" },
  ];

  const root = document.getElementById("shelves");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function posterUrl(item) {
    const posters = item.posters || [];
    const vertical = posters.find((poster) => poster.content_format === "Posters-782x1200");
    return (vertical || posters[0] || {}).url || "";
  }

  function shelfMarkup(title, items) {
    const cards = items
      .map((item) => {
        const src = posterUrl(item);
        if (!src) return "";
        const name = item.title || "Без названия";
        const safeName = escapeHtml(name);
        const safeSrc = escapeHtml(src);
        return `<a class="poster" href="#" data-title="${safeName}"><img src="${safeSrc}" alt="${safeName}" loading="lazy" draggable="false" /></a>`;
      })
      .join("");
    if (!cards) return "";
    return `
      <section class="shelf">
        <a class="shelf-head" href="#">
          <h2>${title}</h2>
          <span class="chevron" aria-hidden="true">›</span>
        </a>
        <div class="row">${cards}</div>
      </section>`;
  }

  async function loadShelf(shelf) {
    const url =
      "https://api2.ivi.ru/mobileapi/collection/catalog/v7/" +
      `?${QUERY}&hru=${encodeURIComponent(shelf.hru)}` +
      "&sort=relevance&fields=id,title,hru,posters,object_type&from=0&to=14";
    const response = await fetch(url);
    const data = await response.json();
    if (!Array.isArray(data.result)) return "";
    return shelfMarkup(shelf.title, data.result);
  }

  async function loadHero() {
    const response = await fetch(
      "https://api2.ivi.ru/mobileapi/compilationinfo/v7/" +
      `?${QUERY}&id=7312&fields=id,title,synopsis,description,promo_images,title_image`
    );
    const data = await response.json();
    const item = data.result;
    if (!item) return;
    const promos = item.promo_images || [];
    const background = promos.find((image) => image.content_format === "BackgroundImage-1280x720");
    const titles = item.title_image || [];
    const logo = titles.find((image) => image.content_format === "TitleImage-UpTo3000x3000");
    const image = document.getElementById("hero-image");
    const logoImage = document.getElementById("hero-logo");
    if (background && background.url && image.getAttribute("src") !== background.url) image.src = background.url;
    if (logo && logo.url && logoImage && logoImage.getAttribute("src") !== logo.url) logoImage.src = logo.url;
    if (item.title) image.alt = item.title;
    const text = (item.synopsis || item.description || "").replace(/<[^>]*>/g, "").trim();
    if (text) document.getElementById("hero-text").textContent = text;
  }

  function continueYear(raw) {
    const years = Array.isArray(raw.years) ? raw.years.filter(Boolean) : [];
    if (years.length) {
      const start = years[0];
      const end = years[years.length - 1];
      return start === end ? String(start) : `${start}–${end}`;
    }
    return raw.year ? String(raw.year) : "";
  }

  function shotUrls(item) {
    return (item.promo_images || [])
      .filter((image) => String(image.content_format || "").toLowerCase() === "shots-1920x1080" && image.url)
      .map((image) => image.url);
  }

  async function catalogItems(hru) {
    const response = await fetch(
      "https://api2.ivi.ru/mobileapi/collection/catalog/v7/" +
      `?${QUERY}&hru=${encodeURIComponent(hru)}&sort=relevance` +
      "&fields=id,title,object_type,year,years,promo_images&from=0&to=24"
    );
    const data = await response.json();
    return Array.isArray(data.result) ? data.result : [];
  }

  async function loadContinue() {
    const host = document.getElementById("continue");
    if (!host) return;
    const picked = [];
    const seen = new Set();
    for (const hru of ["kids-7-12", "sayhellotofall", "russian-cartoons"]) {
      if (picked.length >= 6) break;
      const items = await catalogItems(hru);
      for (const item of items) {
        if (!item || !item.title || seen.has(item.id)) continue;
        const shots = shotUrls(item);
        if (!shots.length) continue;
        seen.add(item.id);
        picked.push({ item, shots });
        if (picked.length >= 6) break;
      }
    }
    if (!picked.length) return;
    const cards = picked.map(({ item, shots }) => {
      const year = continueYear(item);
      const kind = item.object_type === "content" ? "Фильм" : "Сериал";
      const sub = year ? `${year}, ${kind}` : kind;
      const progress = 22 + (Number(item.id) % 58);
      const name = escapeHtml(item.title);
      const [src, ...rest] = shots;
      return `<a class="cw" href="#">
        <img class="cw__img" src="${escapeHtml(src)}" data-rest="${escapeHtml(rest.join("|"))}" alt="${name}" draggable="false" />
        <span class="cw__shade"><span class="cw__copy">
          <span class="cw__title">${name}</span>
          <span class="cw__sub">${escapeHtml(sub)}</span>
        </span></span>
        <span class="cw__progress"><span style="width:${progress}%"></span></span>
      </a>`;
    }).join("");
    const promo = `<a class="cw cw-game" href="#" data-game="coloring" aria-label="Раскрась Трёх котов">
        <span class="cw-game__cats" aria-hidden="true">
          <img src="assets/coloring/korzhik.svg" alt="" draggable="false" />
          <img src="assets/coloring/karamelka.svg" alt="" draggable="false" />
          <img src="assets/coloring/kompot.svg" alt="" draggable="false" />
        </span>
        <span class="cw-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 6h10a5 5 0 0 1 4.9 6l-.8 4a3 3 0 0 1-5.2 1.3L14.2 15H9.8l-1.7 2.3A3 3 0 0 1 2.9 16l-.8-4A5 5 0 0 1 7 6Zm0 3v1.5H5.5v2H7V14h2v-1.5h1.5v-2H9V9H7Zm9.5 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-2 2.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>Игра</span>
        <span class="cw__shade"><span class="cw__copy">
          <span class="cw__title">Раскрась Трёх котов</span>
          <span class="cw__sub">Вы смотрели Три Кота</span>
        </span></span>
      </a>`;
    host.hidden = false;
    host.innerHTML = `<h2>Продолжить просмотр</h2><div class="row">${promo}${cards}</div>`;
  }

  loadHero().catch(() => {});
  loadContinue().catch(() => {});

  let restoreFeedScroll = null;

  Promise.all(SHELVES.map((shelf) => loadShelf(shelf).catch(() => "")))
    .then((blocks) => {
      const html = blocks.filter(Boolean).join("");
      root.innerHTML = html || '<p class="shelves-status">Не удалось загрузить подборки</p>';
      if (restoreFeedScroll !== null) screen.scrollTop = restoreFeedScroll;
    });

  const frame = window.DeviceFrame;
  const screen = frame ? frame.screen : document.scrollingElement;
  const player = document.getElementById("player");
  const stage = document.getElementById("player-stage");
  const backBtn = document.getElementById("player-back");
  const toggleBtn = document.getElementById("player-toggle");
  const lockBtn = document.getElementById("player-lock");
  const lockLabel = document.getElementById("player-lock-label");
  const nowEl = document.getElementById("player-now");
  const track = document.getElementById("player-track");
  const fill = document.getElementById("player-fill");
  const thumb = document.getElementById("player-thumb");
  const chrome = document.getElementById("player-chrome");
  const subEl = document.getElementById("player-sub");
  const seriesBtn = document.getElementById("player-series");
  const seriesSheet = document.getElementById("series-sheet");
  const seriesTabs = document.getElementById("series-tabs");

  let episode = 1;
  let seasonLabel = "Сезон 1";

  const DURATION = 5 * 60 + 7;
  const DRAG = 10;
  let current = 12;
  let playing = false;
  let scrubbing = false;
  let lastTs = 0;
  let raf = 0;
  let idleTimer = 0;
  let closeTimer = 0;
  let shownSecond = -1;

  function formatTime(total) {
    const s = Math.max(0, Math.floor(total));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function renderTime() {
    const ratio = current / DURATION;
    const pct = ratio * 100 + "%";
    fill.style.width = pct;
    thumb.style.left = pct;
    const shown = Math.floor(current);
    if (shown !== shownSecond) {
      shownSecond = shown;
      nowEl.textContent = formatTime(shown);
      track.setAttribute("aria-valuenow", String(shown));
    }
  }

  function wake() {
    stage.classList.remove("is-idle");
    clearTimeout(idleTimer);
    if (playing && !stage.classList.contains("is-locked")) {
      idleTimer = setTimeout(() => stage.classList.add("is-idle"), 2400);
    }
  }

  function tick(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!scrubbing) {
      current += dt;
      if (current >= DURATION) {
        current = DURATION;
        playing = false;
        stage.classList.add("is-paused");
        toggleBtn.setAttribute("aria-label", "Смотреть");
        renderTime();
        wake();
        return;
      }
    }
    renderTime();
    raf = requestAnimationFrame(tick);
  }

  function startPlaying() {
    playing = true;
    lastTs = 0;
    stage.classList.remove("is-paused");
    toggleBtn.setAttribute("aria-label", "Пауза");
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    wake();
  }

  function setLandscape(on) {
    if (frame) frame.setLandscape(on);
    screen.classList.toggle("is-locked", on);
  }

  function resetChrome() {
    stage.classList.remove("is-locked", "is-idle", "is-paused", "is-series");
    seriesSheet.classList.remove("is-open");
    seriesSheet.setAttribute("aria-hidden", "true");
    lockLabel.textContent = "Заблокировать";
    lockBtn.setAttribute("aria-pressed", "false");
    lockBtn.setAttribute("aria-label", "Заблокировать");
  }

  function finishClose() {
    if (player.hidden) return;
    clearTimeout(closeTimer);
    player.hidden = true;
    player.classList.remove("is-closing", "is-open");
    resetChrome();
  }

  function closePlayer() {
    if (player.hidden || player.classList.contains("is-closing")) return;
    playing = false;
    cancelAnimationFrame(raf);
    clearTimeout(idleTimer);
    player.classList.remove("is-open");
    player.classList.add("is-closing");
    setLandscape(false);
    const done = (event) => {
      if (event.target !== player || event.propertyName !== "opacity") return;
      player.removeEventListener("transitionend", done);
      finishClose();
    };
    player.addEventListener("transitionend", done);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      player.removeEventListener("transitionend", done);
      finishClose();
    }, 800);
  }

  function openPlayer() {
    if (!player.hidden) return;
    current = 12;
    shownSecond = -1;
    scrubbing = false;
    resetChrome();
    renderTime();
    player.classList.remove("is-closing");
    player.hidden = false;
    player.getBoundingClientRect();
    player.classList.add("is-open");
    setLandscape(true);
    startPlaying();
  }

  function clamp(value) {
    return Math.min(1, Math.max(0, value));
  }

  function scrubRatio(clientX) {
    const rect = track.getBoundingClientRect();
    if (!rect.width) return 0;
    return clamp((clientX - rect.left) / rect.width);
  }

  function seekFromPointer(event) {
    current = scrubRatio(event.clientX) * DURATION;
    shownSecond = -1;
    renderTime();
  }

  root.addEventListener("pointerdown", (event) => {
    const poster = event.target.closest(".poster");
    if (!poster || !root.contains(poster)) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const row = poster.parentElement;
    const startLeft = row ? row.scrollLeft : 0;
    const startTop = screen.scrollTop;
    let moved = false;
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG) moved = true;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (row && Math.abs(row.scrollLeft - startLeft) > 2) moved = true;
      if (Math.abs(screen.scrollTop - startTop) > 2) moved = true;
      poster.dataset.dragged = moved ? "1" : "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });

  root.addEventListener("click", (event) => {
    const poster = event.target.closest(".poster");
    if (!poster || !root.contains(poster)) return;
    event.preventDefault();
    event.stopPropagation();
    if (poster.dataset.dragged === "1") {
      poster.dataset.dragged = "";
      return;
    }
    openPlayer();
  });

  const continueRow = document.getElementById("continue");
  continueRow.addEventListener("error", (event) => {
    const img = event.target;
    if (!img.classList || !img.classList.contains("cw__img")) return;
    const rest = (img.dataset.rest || "").split("|").filter(Boolean);
    const next = rest.shift();
    img.dataset.rest = rest.join("|");
    if (next) img.src = next;
  }, true);
  continueRow.addEventListener("click", (event) => {
    const card = event.target.closest(".cw");
    if (!card || !continueRow.contains(card)) return;
    event.preventDefault();
    if (card.dataset.dragged === "1") {
      card.dataset.dragged = "";
      return;
    }
    if (card.dataset.game) {
      let variant = "1";
      try {
        variant = sessionStorage.getItem("kids-games-variant") || "1";
        sessionStorage.removeItem("kids-player-return");
      } catch (e) {}
      window.location.href = variant === "2" ? "games/v2/index.html" : "games/index.html#coloring";
      return;
    }
    openPlayer();
  });
  continueRow.addEventListener("pointerdown", (event) => {
    const card = event.target.closest(".cw");
    if (!card || !continueRow.contains(card)) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const row = card.parentElement;
    const startLeft = row ? row.scrollLeft : 0;
    const startTop = screen.scrollTop;
    let moved = false;
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG) moved = true;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (row && Math.abs(row.scrollLeft - startLeft) > 2) moved = true;
      if (Math.abs(screen.scrollTop - startTop) > 2) moved = true;
      card.dataset.dragged = moved ? "1" : "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });

  const hero = document.getElementById("hero");
  hero.addEventListener("click", () => openPlayer());
  hero.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPlayer();
    }
  });

  backBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    closePlayer();
  });

  toggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (playing) {
      playing = false;
      cancelAnimationFrame(raf);
      stage.classList.add("is-paused");
      toggleBtn.setAttribute("aria-label", "Смотреть");
      wake();
      return;
    }
    if (current >= DURATION) current = 0;
    startPlaying();
  });

  lockBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const locked = !stage.classList.contains("is-locked");
    stage.classList.toggle("is-locked", locked);
    stage.classList.remove("is-idle");
    lockLabel.textContent = locked ? "Разблокировать" : "Заблокировать";
    lockBtn.setAttribute("aria-pressed", locked ? "true" : "false");
    lockBtn.setAttribute("aria-label", locked ? "Разблокировать" : "Заблокировать");
    if (locked) clearTimeout(idleTimer);
    else wake();
  });

  chrome.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".player-track")) return;
    wake();
  });

  track.addEventListener("pointerdown", (event) => {
    if (stage.classList.contains("is-locked")) return;
    event.preventDefault();
    event.stopPropagation();
    scrubbing = true;
    track.setPointerCapture(event.pointerId);
    seekFromPointer(event);
    wake();
  });

  track.addEventListener("pointermove", (event) => {
    if (!scrubbing) return;
    seekFromPointer(event);
  });

  const endScrub = () => {
    scrubbing = false;
  };
  track.addEventListener("pointerup", endScrub);
  track.addEventListener("pointercancel", endScrub);

  stage.addEventListener("click", (event) => {
    if (event.target.closest("button, .player-track, .series-sheet")) return;
    if (stage.classList.contains("is-locked")) return;
    if (stage.classList.contains("is-idle")) {
      wake();
      return;
    }
    if (playing) {
      clearTimeout(idleTimer);
      stage.classList.add("is-idle");
    }
  });

  function openSeries() {
    if (stage.classList.contains("is-locked")) return;
    seriesSheet.classList.add("is-open");
    seriesSheet.setAttribute("aria-hidden", "false");
    stage.classList.add("is-series");
    clearTimeout(idleTimer);
    stage.classList.remove("is-idle");
  }

  function closeSeries() {
    if (!seriesSheet.classList.contains("is-open")) return;
    seriesSheet.classList.remove("is-open");
    seriesSheet.setAttribute("aria-hidden", "true");
    stage.classList.remove("is-series");
    wake();
  }

  function seasonPhrase(label) {
    return label.replace(/^Сезон/, "сезон");
  }

  const seriesRow = document.getElementById("series-row");
  const episodeCache = new Map();
  let catalogSeasons = null;

  function episodeImage(item) {
    const promos = item.promo_images || [];
    const clean = promos.find((image) => String(image.content_format || "").includes("clean"));
    if (clean && clean.url) return clean.url;
    const posters = item.posters || [];
    const wide = posters.find((poster) => !poster.is_compilation_poster);
    return (wide || posters[0] || {}).url || "assets/player/three-cats.png";
  }

  function episodeSeconds(item) {
    const loc = (item.localizations || [])[0];
    return loc && loc.duration ? loc.duration : 0;
  }

  function clock(total) {
    const s = Math.max(0, Math.round(total));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function episodeMeta(card, on) {
    const total = Number(card.dataset.duration) || 5 * 60;
    if (!on) return card.dataset.timing || clock(total);
    const left = Math.max(0, total - current);
    return "ещё " + Math.max(1, Math.round(left / 60)) + " мин.";
  }

  function playIcon() {
    return '<svg class="ep-play" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.4 5 2 1.2z" fill="currentColor"/></svg>';
  }

  function episodeCard(ep) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ep";
    button.dataset.ep = String(ep.n);
    if (ep.duration) button.dataset.duration = String(ep.duration);
    button.dataset.timing = ep.duration ? clock(ep.duration) : "5 мин.";
    const on = ep.n === episode;
    if (on) button.classList.add("is-current");
    button.innerHTML =
      '<img class="ep-thumb" src="' + escapeHtml(ep.image) + '" alt="" />' +
      '<span class="ep-title">' + playIcon() + escapeHtml(ep.title) + "</span>" +
      '<span class="ep-meta">' + episodeMeta(button, on) + "</span>";
    return button;
  }

  function paintSeason(list) {
    const game = seriesRow.querySelector(".ep-game:not(.ep-game-only)");
    const extras = [...seriesRow.querySelectorAll(".ep-game-only")];
    seriesRow.querySelectorAll(".ep:not(.ep-game)").forEach((node) => node.remove());
    const fragment = document.createDocumentFragment();
    list.forEach((ep, index) => {
      fragment.appendChild(episodeCard(ep));
      if (index === 2 && game) fragment.appendChild(game);
    });
    if (game && game.parentElement === seriesRow) fragment.appendChild(game);
    const anchor = extras[0] || null;
    seriesRow.insertBefore(fragment, anchor);
  }

  async function fetchSeason(number) {
    const key = String(number);
    if (episodeCache.has(key)) return episodeCache.get(key);
    const url =
      "https://api2.ivi.ru/mobileapi/videofromcompilation/v7/" +
      `?${QUERY}&id=10275&season=${encodeURIComponent(key)}&from=0&to=60&fake=1` +
      "&fields=title,episode,posters,promo_images,localizations";
    const response = await fetch(url);
    const data = await response.json();
    const list = (data.result || [])
      .filter((item) => item && item.title)
      .map((item) => ({
        n: item.episode,
        title: item.title,
        duration: episodeSeconds(item),
        image: episodeImage(item),
      }));
    if (!list.length) throw new Error("empty");
    episodeCache.set(key, list);
    return list;
  }

  async function showIviSeason(seasonKey) {
    if (!catalogSeasons || seasonKey === "games") return;
    const number = seasonKey === "special" ? catalogSeasons.special : seasonKey;
    if (!number) return;
    const list = await fetchSeason(number);
    paintSeason(list);
  }

  async function loadThreeCats(preferred) {
    try {
      const response = await fetch(
        "https://api2.ivi.ru/mobileapi/compilationinfo/v7/" +
        `?${QUERY}&id=10275&fields=id,title,seasons`
      );
      const data = await response.json();
      const seasons = (data.result && data.result.seasons) || [];
      const regular = seasons.filter((season) => season.number < 10).sort((a, b) => a.number - b.number);
      const special = seasons.find((season) => season.number >= 10);
      if (!regular.length) throw new Error("no seasons");
      catalogSeasons = { special: special ? String(special.number) : "" };
      const label = seriesTabs.querySelector(".series-tabs-label");
      const games = seriesTabs.querySelector('[data-season="games"]');
      seriesTabs.replaceChildren(label);
      regular.forEach((season) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "series-tab";
        button.setAttribute("role", "tab");
        button.dataset.season = String(season.number);
        button.textContent = String(season.number);
        seriesTabs.appendChild(button);
      });
      if (special) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "series-tab series-tab-wide";
        button.setAttribute("role", "tab");
        button.dataset.season = "special";
        button.textContent = "Спецвыпуски";
        seriesTabs.appendChild(button);
      }
      seriesTabs.appendChild(games);
      const season = preferred && seriesTabs.querySelector(`[data-season="${preferred}"]`)
        ? preferred
        : String(regular[0].number);
      seriesTabs.querySelectorAll(".series-tab").forEach((item) => {
        const on = item.dataset.season === season;
        item.classList.toggle("is-active", on);
        item.setAttribute("aria-selected", on ? "true" : "false");
      });
      seriesRow.classList.toggle("is-games", season === "games");
      if (season !== "games") {
        seasonLabel = season === "special" ? "Спецвыпуски" : "Сезон " + season;
        subEl.textContent = "Серия " + episode + " " + seasonPhrase(seasonLabel);
        await showIviSeason(season);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function openGames() {
    const tab = seriesTabs.querySelector(".series-tab.is-active");
    try {
      sessionStorage.setItem("kids-player-return", JSON.stringify({
        season: tab ? tab.dataset.season : "1",
        rowScroll: seriesRow.scrollLeft,
        time: current,
        episode,
        feedScroll: screen.scrollTop,
      }));
    } catch (e) {}
    closeSeries();
    closePlayer();
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;
    setTimeout(() => {
      let variant = "1";
      try { variant = sessionStorage.getItem("kids-games-variant") || "1"; } catch (e) {}
      window.location.href = variant === "2" ? "games/v2/index.html" : "games/index.html";
    }, delay);
  }

  seriesBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openSeries();
  });

  document.getElementById("series-close").addEventListener("click", (event) => {
    event.stopPropagation();
    closeSeries();
  });

  document.getElementById("series-backdrop").addEventListener("click", (event) => {
    event.stopPropagation();
    closeSeries();
  });

  seriesTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".series-tab");
    if (!tab) return;
    event.stopPropagation();
    seriesTabs.querySelectorAll(".series-tab").forEach((item) => {
      const on = item === tab;
      item.classList.toggle("is-active", on);
      item.setAttribute("aria-selected", on ? "true" : "false");
    });
    const season = tab.dataset.season;
    seriesRow.classList.toggle("is-games", season === "games");
    seriesRow.scrollLeft = 0;
    if (season === "games") return;
    seasonLabel = season === "special" ? "Спецвыпуски" : "Сезон " + season;
    subEl.textContent = "Серия " + episode + " " + seasonPhrase(seasonLabel);
    showIviSeason(season).catch(() => {});
  });

  seriesRow.addEventListener("click", (event) => {
    const card = event.target.closest(".ep");
    if (!card) return;
    event.stopPropagation();
    if (card.classList.contains("ep-game")) {
      openGames();
      return;
    }
    episode = Number(card.dataset.ep);
    document.querySelectorAll(".ep:not(.ep-game)").forEach((item) => {
      const on = item === card;
      item.classList.toggle("is-current", on);
      item.querySelector(".ep-meta").textContent = episodeMeta(item, on);
    });
    subEl.textContent = "Серия " + episode + " " + seasonPhrase(seasonLabel);
    current = 0;
    shownSecond = -1;
    renderTime();
    closeSeries();
    startPlaying();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && seriesSheet.classList.contains("is-open")) {
      closeSeries();
      return;
    }
    if (event.key === "Escape" && !player.hidden) closePlayer();
  });

  function restoreFromGames() {
    if (!document.documentElement.classList.contains("is-player-return")) return;
    let state = null;
    try {
      state = JSON.parse(sessionStorage.getItem("kids-player-return") || "null");
      sessionStorage.removeItem("kids-player-return");
    } catch (e) {}
    history.replaceState(null, "", location.pathname);
    if (!state) {
      document.documentElement.classList.remove("is-player-return");
      return;
    }

    restoreFeedScroll = Number(state.feedScroll) || 0;
    screen.scrollTop = restoreFeedScroll;

    current = Math.min(DURATION, Math.max(0, Number(state.time) || 0));
    shownSecond = -1;
    episode = Number(state.episode) || 1;
    renderTime();
    document.querySelectorAll(".ep:not(.ep-game)").forEach((item) => {
      const on = Number(item.dataset.ep) === episode;
      item.classList.toggle("is-current", on);
      item.querySelector(".ep-meta").textContent = episodeMeta(item, on);
    });

    const season = state.season || "1";
    const tab = seriesTabs.querySelector(`[data-season="${season}"]`);
    seriesTabs.querySelectorAll(".series-tab").forEach((item) => {
      const on = item === tab;
      item.classList.toggle("is-active", on);
      item.setAttribute("aria-selected", on ? "true" : "false");
    });
    seriesRow.classList.toggle("is-games", season === "games");
    if (season !== "games") {
      seasonLabel = season === "special" ? "Спецвыпуски" : "Сезон " + season;
    }
    subEl.textContent = "Серия " + episode + " " + seasonPhrase(seasonLabel);

    player.hidden = false;
    player.classList.add("is-open");
    stage.classList.add("is-paused", "is-series");
    toggleBtn.setAttribute("aria-label", "Смотреть");
    seriesSheet.classList.add("is-open");
    seriesSheet.setAttribute("aria-hidden", "false");
    setLandscape(true);
    seriesRow.scrollLeft = Number(state.rowScroll) || 0;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.remove("is-player-return");
    }));
    return season;
  }

  const restoredSeason = restoreFromGames();
  loadThreeCats(restoredSeason);
})();
