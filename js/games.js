(() => {
  const LOAD_TIME = 1300;
  const CLOSE_RATIO = 0.86;
  const MIN_RATIO = 0.5;
  const WHEEL_CLOSE = 70;
  const WHEEL_RANGE = 260;
  const RADIUS = parseFloat(getComputedStyle(document.querySelector(".game")).borderTopLeftRadius) || 43;

  const reels = document.getElementById("reels");
  const back = document.querySelector(".back");
  try {
    if (back && sessionStorage.getItem("kids-player-return")) {
      back.href = "../index.html?return=player";
    }
  } catch (e) {}
  const games = [...reels.querySelectorAll(".game")];
  const instances = new Map();
  const gesture = { pointers: new Map(), start: 1, ratio: 1, active: false, origin: null, mid: null };

  let current = null;
  let busy = false;
  let wheelTotal = 0;
  let wheelTimer = null;

  const loaders = {
    coloring: (view) => window.PaintGame(view, {
      assets: "../assets/coloring/",
      isBlocked: () => gesture.active,
    }),
    soon: (view, game) => {
      view.innerHTML = `<div class="soon-screen"><p>${game.dataset.title}</p><span>Игра скоро появится</span></div>`;
      return { ready: Promise.resolve(), cancelStroke() {} };
    },
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const device = window.DeviceFrame;

  function toLocal(x, y) {
    return device ? device.toLocal(x, y) : { x, y };
  }

  function localRect(element) {
    const rect = element.getBoundingClientRect();
    return device ? device.toLocalRect(rect) : rect;
  }

  function fullRect() {
    if (device) return { left: 0, top: 0, width: device.width, height: device.height };
    const width = Math.min(window.innerWidth, 480);
    return { left: (window.innerWidth - width) / 2, top: 0, width, height: window.innerHeight };
  }

  function slotRect(game) {
    const slide = localRect(game.parentElement);
    const gap = parseFloat(getComputedStyle(game.parentElement).paddingLeft);
    return { left: slide.left + gap, top: slide.top, width: slide.width - gap * 2, height: slide.height };
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function morphTime() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--morph")) || 0;
  }

  function fitTransform(rect, full, x, y) {
    const scale = Math.max(rect.width / full.width, rect.height / full.height);
    const shiftX = x + (rect.width - full.width * scale) / 2;
    const shiftY = y + (rect.height - full.height * scale) / 2;
    return `translate(${shiftX}px, ${shiftY}px) scale(${scale})`;
  }

  function setSize(game, full) {
    game.style.setProperty("--game-w", `${full.width}px`);
    game.style.setProperty("--game-h", `${full.height}px`);
  }

  function rest(game) {
    const full = fullRect();
    setSize(game, full);
    game.style.setProperty("--fit", fitTransform(slotRect(game), full, 0, 0));
  }

  function frame(game, rect, radius) {
    const full = fullRect();
    const top = Math.max(0, rect.top - full.top);
    const left = Math.max(0, rect.left - full.left);
    const right = Math.max(0, full.left + full.width - rect.left - rect.width);
    const bottom = Math.max(0, full.top + full.height - rect.top - rect.height);
    game.style.left = `${full.left}px`;
    game.style.top = `${full.top}px`;
    game.style.width = `${full.width}px`;
    game.style.height = `${full.height}px`;
    setSize(game, full);
    game.style.setProperty("--fit", fitTransform(rect, full, rect.left - full.left, rect.top - full.top));
    game.style.setProperty("--clip", `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`);
  }

  function unframe(game) {
    ["left", "top", "width", "height", "--clip"].forEach((name) => game.style.removeProperty(name));
  }

  function afterMorph(game, done) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      game.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      done();
    };
    const onEnd = (event) => {
      if (event.target === game && event.propertyName === "clip-path") finish();
    };
    game.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, morphTime() + 80);
  }

  function radiusFor(scale) {
    const slot = current ? slotRect(current).width / fullRect().width : 0.94;
    return RADIUS * clamp((1 - scale) / Math.max(0.01, 1 - slot), 0, 1);
  }

  function pinchRect(scale, cx, cy, dx = 0, dy = 0) {
    const full = fullRect();
    return {
      left: cx + (full.left - cx) * scale + dx,
      top: cy + (full.top - cy) * scale + dy,
      width: full.width * scale,
      height: full.height * scale,
    };
  }

  function follow(scale, cx, cy, dx, dy) {
    current.classList.add("is-still");
    frame(current, pinchRect(scale, cx, cy, dx, dy), radiusFor(scale));
  }

  function springBack() {
    if (!current) return;
    const game = current;
    game.classList.remove("is-still");
    frame(game, fullRect(), 0);
  }

  async function load(game) {
    if (instances.has(game)) return;
    game.classList.add("is-loading");
    const instance = loaders[game.dataset.game](game.querySelector(".game-view"), game);
    instances.set(game, instance);
    await Promise.all([instance.ready, wait(LOAD_TIME)]);
    game.classList.remove("is-loading");
    game.classList.add("is-loaded");
  }

  function open(game) {
    if (busy || current) return;
    busy = true;
    current = game;
    game.classList.add("is-still", "is-floating");
    frame(game, slotRect(game), RADIUS);
    game.getBoundingClientRect();
    game.classList.remove("is-still");
    game.classList.add("is-open");
    frame(game, fullRect(), 0);
    reels.classList.add("is-locked");
    afterMorph(game, () => {
      busy = false;
      load(game);
    });
  }

  function close() {
    if (busy || !current) return;
    const game = current;
    busy = true;
    clearTimeout(wheelTimer);
    wheelTotal = 0;
    instances.get(game)?.cancelStroke();
    game.classList.remove("is-still", "is-open");
    frame(game, slotRect(game), RADIUS);
    afterMorph(game, () => {
      game.classList.add("is-still");
      game.classList.remove("is-floating");
      unframe(game);
      rest(game);
      game.getBoundingClientRect();
      game.classList.remove("is-still");
      reels.classList.remove("is-locked");
      current = null;
      busy = false;
    });
  }

  function snapOffset(slide) {
    const align = (getComputedStyle(slide).scrollSnapAlign || "start").split(/\s+/)[0];
    const style = getComputedStyle(reels);
    const padTop = parseFloat(style.scrollPaddingTop) || 0;
    const padBottom = parseFloat(style.scrollPaddingBottom) || 0;
    const top = slide.offsetTop;
    const height = slide.offsetHeight;
    const view = reels.clientHeight;
    if (align === "center") return top + height / 2 - (padTop + view - padBottom) / 2;
    if (align === "end") return top + height - (view - padBottom);
    return top - padTop;
  }

  games.forEach((game) => {
    game.addEventListener("click", () => {
      if (current) return;
      const target = snapOffset(game.parentElement);
      if (Math.abs(reels.scrollTop - target) > 8) {
        reels.scrollTo({ top: target, behavior: "smooth" });
        return;
      }
      open(game);
    });

    game.addEventListener("keydown", (event) => {
      if (!current && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        open(game);
      }
    });
  });

  function pinchPoints() {
    const [a, b] = [...gesture.pointers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  document.addEventListener("pointerdown", (event) => {
    if (!current || busy) return;
    gesture.pointers.set(event.pointerId, toLocal(event.clientX, event.clientY));
    if (gesture.pointers.size === 2) {
      const points = pinchPoints();
      gesture.active = true;
      gesture.start = points.distance || 1;
      gesture.ratio = 1;
      gesture.origin = points;
      instances.get(current)?.cancelStroke();
    }
  }, true);

  document.addEventListener("pointermove", (event) => {
    if (!gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, toLocal(event.clientX, event.clientY));
    if (!gesture.active || gesture.pointers.size < 2 || !current || busy) return;
    const points = pinchPoints();
    gesture.ratio = points.distance / gesture.start;
    const { x, y } = gesture.origin;
    follow(clamp(gesture.ratio, MIN_RATIO, 1), x, y, points.x - x, points.y - y);
  }, true);

  function releasePointer(event) {
    if (!gesture.pointers.delete(event.pointerId)) return;
    if (gesture.active && gesture.pointers.size === 1 && current && !busy) {
      if (gesture.ratio < CLOSE_RATIO) close();
      else springBack();
    }
    if (gesture.pointers.size < 2) gesture.active = false;
  }

  document.addEventListener("pointerup", releasePointer, true);
  document.addEventListener("pointercancel", releasePointer, true);

  window.addEventListener("wheel", (event) => {
    if (!current || !event.ctrlKey) return;
    event.preventDefault();
    if (busy) return;
    wheelTotal = Math.max(0, wheelTotal + event.deltaY);
    clearTimeout(wheelTimer);
    if (wheelTotal > WHEEL_CLOSE) {
      close();
      return;
    }
    const full = fullRect();
    const scale = clamp(1 - wheelTotal / WHEEL_RANGE, MIN_RATIO, 1);
    follow(scale, full.left + full.width / 2, full.top + full.height / 2, 0, 0);
    wheelTimer = setTimeout(() => {
      wheelTotal = 0;
      if (!current || busy) return;
      if (scale < CLOSE_RATIO) close();
      else springBack();
    }, 180);
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.addEventListener("resize", () => {
    games.forEach((game) => {
      if (game !== current) {
        rest(game);
        return;
      }
      if (busy || gesture.active) return;
      game.classList.add("is-still");
      frame(game, fullRect(), 0);
      game.getBoundingClientRect();
      game.classList.remove("is-still");
    });
  });

  games.forEach(rest);

  if (location.hash === "#coloring") {
    const target = games.find((game) => game.dataset.title === "Раскраска");
    if (target) reels.scrollTop = snapOffset(target.parentElement);
  }
})();
