(() => {
  if (window.DeviceFrame) return;

  const WIDTH = 430;
  const HEIGHT = 932;
  const PAD = 32;

  let device = document.getElementById("device");
  let screen = document.getElementById("device-screen");

  if (!device) {
    device = document.createElement("div");
    device.className = "device";
    device.id = "device";

    screen = document.createElement("div");
    screen.className = "device-screen";
    screen.id = "device-screen";
    device.appendChild(screen);

    [...document.body.childNodes].forEach((node) => {
      if (node.nodeType === 1 && node.tagName === "SCRIPT") return;
      if (node.nodeType === 1 && node.hasAttribute("data-device-layer")) device.appendChild(node);
      else screen.appendChild(node);
    });
    document.body.prepend(device);
  }

  function applyScale() {
    const landscape = device.classList.contains("is-landscape")
      || document.documentElement.classList.contains("is-player-return");
    const w = landscape ? HEIGHT : WIDTH;
    const h = landscape ? WIDTH : HEIGHT;
    const scale = Math.min(1, (window.innerWidth - PAD) / w, (window.innerHeight - PAD) / h);
    const value = String(Math.max(0.2, scale));
    document.documentElement.style.setProperty("--device-scale", value);
    device.style.setProperty("--device-scale", value);
    placeSwitcher();
  }

  function placeSwitcher() {
    const el = document.querySelector(".variant-switch");
    if (!el) return;
    const scale = parseFloat(device.style.getPropertyValue("--device-scale")) || 1;
    const landscape = device.classList.contains("is-landscape")
      || document.documentElement.classList.contains("is-player-return");
    const frameLeft = (window.innerWidth - (landscape ? HEIGHT : WIDTH) * scale) / 2;
    const gap = 20;
    const edge = 16;
    el.classList.remove("is-compact", "is-hidden");
    if (frameLeft - el.offsetWidth - gap < edge) el.classList.add("is-compact");
    const width = el.offsetWidth;
    const left = frameLeft - width - gap;
    el.classList.toggle("is-hidden", left < edge);
    el.style.transform = "translateY(-50%)";
    el.style.top = "50%";
    el.style.left = `${Math.max(edge, left)}px`;
  }

  function matrix() {
    const value = getComputedStyle(device).transform;
    return value && value !== "none" ? new DOMMatrix(value) : new DOMMatrix();
  }

  function toLocal(x, y) {
    const point = matrix().inverse().transformPoint(
      new DOMPoint(x - window.innerWidth / 2, y - window.innerHeight / 2)
    );
    return { x: point.x + WIDTH / 2, y: point.y + HEIGHT / 2 };
  }

  function toLocalRect(rect) {
    const a = toLocal(rect.left, rect.top);
    const b = toLocal(rect.right, rect.bottom);
    const left = Math.min(a.x, b.x);
    const top = Math.min(a.y, b.y);
    return { left, top, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
  }

  document.querySelectorAll(".variant-switch a").forEach((link) => {
    link.addEventListener("click", () => {
      try { sessionStorage.setItem("kids-games-variant", link.dataset.variant || "1"); } catch (e) {}
    });
  });

  window.addEventListener("resize", applyScale);
  applyScale();
  requestAnimationFrame(() => requestAnimationFrame(() => device.classList.add("is-ready")));

  window.DeviceFrame = {
    device,
    screen,
    width: WIDTH,
    height: HEIGHT,
    toLocal,
    toLocalRect,
    setLandscape(on) {
      device.classList.toggle("is-landscape", !!on);
      applyScale();
    },
  };
})();
