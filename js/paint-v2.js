(() => {
  const SIZE = 1024;
  const LINE_ALPHA = 90;
  const MASK_GROW = 3;
  const THICKNESS = {
    brush: { min: 18, max: 110, value: 0.24 },
    eraser: { min: 28, max: 140, value: 0.25 },
  };
  const ZOOM = 1.2;
  const CONTENT_W = 734;
  const CONTENT_H = 992;

  const PAGES = [
    { id: "korzhik", title: "Коржик" },
    { id: "karamelka", title: "Карамелька" },
    { id: "kompot", title: "Компот" },
  ];

  const THUMB = 128;
  const MIN_REGION = 300;
  const REGION_FILLED = 0.5;
  const DONE_AREA = 0.85;
  const DONE_COUNT = 0.7;

  const COLORS = [
    { name: "Красный", value: "#ff4d5e" },
    { name: "Оранжевый", value: "#ff9f1c" },
    { name: "Жёлтый", value: "#ffd43b" },
    { name: "Зелёный", value: "#3ecf6e" },
    { name: "Синий", value: "#3d8bff" },
  ];

  const PENCILS = ["pink", "orange", "yellow", "green", "blue"];

  function makeCanvas(width = SIZE, height = width) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function drawingSquare(box) {
    const side = Math.min(
      Math.min(box.width, box.height) * ZOOM,
      (box.width * SIZE) / CONTENT_W,
      (box.height * SIZE) / CONTENT_H,
    );
    return { side, ox: (box.width - side) / 2, oy: (box.height - side) / 2 };
  }

  function transferPaint(src, width, height) {
    const dst = makeCanvas(width, height);
    const from = drawingSquare(src);
    const to = drawingSquare(dst);
    if (from.side < 1 || to.side < 1) return dst;
    const ctx = dst.getContext("2d");
    ctx.drawImage(src, from.ox, from.oy, from.side, from.side, to.ox, to.oy, to.side, to.side);
    if (from.oy > 0 && to.oy > 0) ctx.drawImage(src, 0, 0, src.width, from.oy, 0, 0, width, to.oy);
    const fromBottom = src.height - from.oy - from.side;
    const toBottom = height - to.oy - to.side;
    if (fromBottom > 0 && toBottom > 0) {
      ctx.drawImage(src, 0, from.oy + from.side, src.width, fromBottom, 0, to.oy + to.side, width, toBottom);
    }
    if (from.ox > 0 && to.ox > 0) ctx.drawImage(src, 0, from.oy, from.ox, from.side, 0, to.oy, to.ox, to.side);
    const fromRight = src.width - from.ox - from.side;
    const toRight = width - to.ox - to.side;
    if (fromRight > 0 && toRight > 0) {
      ctx.drawImage(src, from.ox + from.side, from.oy, fromRight, from.side, to.ox + to.side, to.oy, toRight, to.side);
    }
    return dst;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function computeLabels(img) {
    const canvas = makeCanvas();
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const total = SIZE * SIZE;
    const labels = new Int32Array(total);
    for (let i = 0; i < total; i += 1) labels[i] = data[i * 4 + 3] > LINE_ALPHA ? 0 : -1;

    const stack = new Int32Array(total);
    let next = 1;
    for (let i = 0; i < total; i += 1) {
      if (labels[i] !== -1) continue;
      let top = 0;
      stack[top++] = i;
      labels[i] = next;
      while (top) {
        const p = stack[--top];
        const x = p % SIZE;
        if (x > 0 && labels[p - 1] === -1) { labels[p - 1] = next; stack[top++] = p - 1; }
        if (x < SIZE - 1 && labels[p + 1] === -1) { labels[p + 1] = next; stack[top++] = p + 1; }
        if (p >= SIZE && labels[p - SIZE] === -1) { labels[p - SIZE] = next; stack[top++] = p - SIZE; }
        if (p < total - SIZE && labels[p + SIZE] === -1) { labels[p + SIZE] = next; stack[top++] = p + SIZE; }
      }
      next += 1;
    }
    return labels;
  }

  function buildMask(page, label) {
    if (page.masks.has(label)) return page.masks.get(label);
    const { labels } = page;
    const total = SIZE * SIZE;
    let area = new Uint8Array(total);
    for (let i = 0; i < total; i += 1) if (labels[i] === label) area[i] = 1;

    for (let pass = 0; pass < MASK_GROW; pass += 1) {
      const grown = area.slice();
      for (let i = 0; i < total; i += 1) {
        if (area[i] || labels[i] !== 0) continue;
        const x = i % SIZE;
        if ((x > 0 && area[i - 1]) || (x < SIZE - 1 && area[i + 1]) ||
            (i >= SIZE && area[i - SIZE]) || (i < total - SIZE && area[i + SIZE])) {
          grown[i] = 1;
        }
      }
      area = grown;
    }

    const square = makeCanvas();
    const ctx = square.getContext("2d");
    const image = ctx.createImageData(SIZE, SIZE);
    for (let i = 0; i < total; i += 1) if (area[i]) image.data[i * 4 + 3] = 255;
    ctx.putImageData(image, 0, 0);
    const box = page.paint;
    const { side, ox, oy } = drawingSquare(box);
    const canvas = makeCanvas(box.width, box.height);
    const sheet = canvas.getContext("2d");
    if (side > 0) sheet.drawImage(square, ox, oy, side, side);
    if (label === page.background) {
      sheet.fillStyle = "#fff";
      sheet.fillRect(0, 0, box.width, oy);
      sheet.fillRect(0, oy + side, box.width, Math.max(0, box.height - oy - side));
      sheet.fillRect(0, oy, ox, side);
      sheet.fillRect(ox + side, oy, Math.max(0, box.width - ox - side), side);
    }
    page.masks.set(label, canvas);
    return canvas;
  }

  function labelAt(page, x, y) {
    const { labels } = page;
    const { side, ox, oy } = drawingSquare(page.paint);
    if (side < 1) return 0;
    const localX = ((x - ox) / side) * SIZE;
    const localY = ((y - oy) / side) * SIZE;
    if (localX < 0 || localY < 0 || localX >= SIZE || localY >= SIZE) return page.background || 0;
    const cx = Math.round(localX);
    const cy = Math.round(localY);
    for (let r = 0; r <= 16; r += 2) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const px = cx + dx;
          const py = cy + dy;
          if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
          const label = labels[py * SIZE + px];
          if (label > 0) return label;
        }
      }
    }
    return 0;
  }

  function findRegions(labels) {
    const areas = new Map();
    const outside = new Set();
    for (let i = 0; i < labels.length; i += 1) {
      const label = labels[i];
      if (label <= 0) continue;
      areas.set(label, (areas.get(label) || 0) + 1);
      const x = i % SIZE;
      if (x === 0 || x === SIZE - 1 || i < SIZE || i >= labels.length - SIZE) outside.add(label);
    }
    const regions = new Map();
    let total = 0;
    let background = 0;
    let backgroundArea = 0;
    areas.forEach((area, label) => {
      if (outside.has(label)) {
        if (area > backgroundArea) {
          background = label;
          backgroundArea = area;
        }
        return;
      }
      if (area < MIN_REGION) return;
      regions.set(label, area);
      total += area;
    });
    return { regions, total, background };
  }

  function isComplete(page) {
    const sample = makeCanvas();
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    const { side, ox, oy } = drawingSquare(page.paint);
    if (side > 0) sampleCtx.drawImage(page.paint, ox, oy, side, side, 0, 0, SIZE, SIZE);
    const alpha = sampleCtx.getImageData(0, 0, SIZE, SIZE).data;
    const painted = new Map();
    const { labels, regions } = page;
    for (let i = 0; i < labels.length; i += 1) {
      if (!alpha[i * 4 + 3] || !regions.has(labels[i])) continue;
      painted.set(labels[i], (painted.get(labels[i]) || 0) + 1);
    }
    let filledArea = 0;
    let filledCount = 0;
    regions.forEach((area, label) => {
      if ((painted.get(label) || 0) / area < REGION_FILLED) return;
      filledArea += area;
      filledCount += 1;
    });
    return filledArea / page.total >= DONE_AREA && filledCount / regions.size >= DONE_COUNT;
  }

  window.PaintGame = function PaintGame(root, { assets, isBlocked }) {
    root.innerHTML = `
      <div class="paint">
        <div class="paint-pages">
          ${PAGES.map((page, i) => `
            <button class="page-thumb${i ? "" : " is-active"}" type="button" data-page="${i}" aria-label="${page.title}">
              <canvas width="${THUMB}" height="${THUMB}"></canvas>
              <span class="done-badge" aria-hidden="true">★</span>
            </button>`).join("")}
        </div>
        <p class="paint-toast" role="status">Готово! Раскраска стала цветной</p>
        <div class="paint-stage">
          <div class="paper">
            <canvas></canvas>
            <img alt="" />
          </div>
        </div>
        <div class="paint-dock">
          <div class="dock-panel">
            <div class="thickness" role="slider" tabindex="0" aria-label="Толщина" aria-valuemin="0" aria-valuemax="100">
              <span class="thickness-track"></span>
              <span class="thickness-thumb"></span>
            </div>
            <div class="pencils" role="radiogroup" aria-label="Карандаши">
              ${COLORS.map((color, i) => `
                <button class="pencil${i ? "" : " is-active"}" type="button" role="radio" aria-checked="${i === 0}" aria-label="${color.name} карандаш" data-tool="brush" data-color="${color.value}">
                  <img src="${assets}tools/pencil-${PENCILS[i]}.png" alt="" draggable="false" />
                </button>`).join("")}
              <button class="pencil pencil-eraser" type="button" role="radio" aria-checked="false" aria-label="Ластик" data-tool="eraser">
                <img src="${assets}tools/eraser.png" alt="" draggable="false" />
              </button>
            </div>
          </div>
        </div>
      </div>`;

    const paper = root.querySelector(".paper");
    const view = paper.querySelector("canvas");
    const lines = paper.querySelector("img");
    const viewCtx = view.getContext("2d");
    const stroke = makeCanvas(1, 1);
    const strokeCtx = stroke.getContext("2d");
    const clipped = makeCanvas(1, 1);
    const clippedCtx = clipped.getContext("2d");

    const pages = PAGES.map((page) => ({
      ...page,
      src: `${assets}${page.id}.svg`,
      img: null,
      labels: null,
      regions: null,
      total: 0,
      complete: false,
      masks: new Map(),
      background: 0,
      paint: makeCanvas(),
    }));

    const thumbs = [...root.querySelectorAll(".page-thumb")];
    const toast = root.querySelector(".paint-toast");
    let page = pages[0];
    let color = COLORS[0].value;
    let tool = "brush";
    const thicknessOf = { brush: THICKNESS.brush.value, eraser: THICKNESS.eraser.value };
    let drawing = null;
    let toastTimer = null;
    const panel = root.querySelector(".dock-panel");
    const slider = root.querySelector(".thickness");
    const pencils = [...root.querySelectorAll(".pencil")];

    function syncThickness() {
      const value = thicknessOf[tool];
      panel.style.setProperty("--thickness", value);
      panel.style.setProperty("--ink", tool === "eraser" ? "#ff8fa3" : color);
      slider.setAttribute("aria-valuenow", String(Math.round(value * 100)));
    }

    function strokeSize() {
      const range = THICKNESS[tool];
      return range.min + (range.max - range.min) * thicknessOf[tool];
    }

    function drawThumb(index) {
      const item = pages[index];
      const ctx = thumbs[index].querySelector("canvas").getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, THUMB, THUMB);
      const square = drawingSquare(item.paint);
      if (item.complete && square.side > 1) {
        ctx.drawImage(item.paint, square.ox, square.oy, square.side, square.side, 0, 0, THUMB, THUMB);
      }
      if (item.img) ctx.drawImage(item.img, 0, 0, THUMB, THUMB);
      thumbs[index].classList.toggle("is-done", item.complete);
    }

    function updateCompletion() {
      if (!page.labels) return;
      const wasComplete = page.complete;
      page.complete = isComplete(page);
      if (page.complete === wasComplete) return;
      drawThumb(pages.indexOf(page));
      if (page.complete) {
        clearTimeout(toastTimer);
        toast.classList.add("is-visible");
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
      }
    }

    function toolWidth(px) {
      const { side } = drawingSquare(view);
      return side > 0 ? px * (side / SIZE) : px;
    }

    function fit() {
      const width = paper.clientWidth;
      const height = paper.clientHeight;
      if (width < 2 || height < 2) return;
      if (view.width === width && view.height === height) return;
      if (drawing) cancelStroke();
      pages.forEach((item) => {
        if (item.paint.width === width && item.paint.height === height) return;
        item.paint = transferPaint(item.paint, width, height);
        item.masks.clear();
      });
      const { side, ox, oy } = drawingSquare({ width, height });
      Object.assign(lines.style, { left: `${ox}px`, top: `${oy}px`, width: `${side}px`, height: `${side}px` });
      view.width = width;
      view.height = height;
      stroke.width = width;
      stroke.height = height;
      clipped.width = width;
      clipped.height = height;
      render(false);
      pages.forEach((item, index) => { if (item.img) drawThumb(index); });
    }

    function render(withStroke) {
      viewCtx.clearRect(0, 0, view.width, view.height);
      viewCtx.drawImage(page.paint, 0, 0);
      if (withStroke) viewCtx.drawImage(clipped, 0, 0);
    }

    function showPage(index) {
      cancelStroke();
      page = pages[index];
      lines.src = page.src;
      thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === index));
      render(false);
    }

    function toCanvas(event) {
      const rect = view.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / (rect.width || 1)) * view.width,
        y: ((event.clientY - rect.top) / (rect.height || 1)) * view.height,
      };
    }

    function drawSegment(ctx, from, to, width) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x + 0.01, to.y);
      ctx.stroke();
    }

    function updateClipped() {
      clippedCtx.globalCompositeOperation = "source-over";
      clippedCtx.clearRect(0, 0, clipped.width, clipped.height);
      clippedCtx.drawImage(stroke, 0, 0);
      clippedCtx.globalCompositeOperation = "destination-in";
      clippedCtx.drawImage(drawing.mask, 0, 0);
      clippedCtx.globalCompositeOperation = "source-over";
    }

    function paintTo(point) {
      if (tool === "eraser") {
        const ctx = page.paint.getContext("2d");
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "#000";
        drawSegment(ctx, drawing.last, point, toolWidth(strokeSize()));
        ctx.globalCompositeOperation = "source-over";
        render(false);
      } else {
        strokeCtx.strokeStyle = color;
        drawSegment(strokeCtx, drawing.last, point, toolWidth(strokeSize()));
        updateClipped();
        render(true);
      }
      drawing.last = point;
    }

    function cancelStroke() {
      if (!drawing) return;
      drawing = null;
      strokeCtx.clearRect(0, 0, stroke.width, stroke.height);
      clippedCtx.clearRect(0, 0, clipped.width, clipped.height);
      render(false);
    }

    function finishStroke() {
      if (!drawing) return;
      if (tool === "brush") page.paint.getContext("2d").drawImage(clipped, 0, 0);
      drawing = null;
      strokeCtx.clearRect(0, 0, stroke.width, stroke.height);
      clippedCtx.clearRect(0, 0, clipped.width, clipped.height);
      render(false);
      updateCompletion();
    }

    view.addEventListener("pointerdown", (event) => {
      if (isBlocked() || drawing || !page.labels) return;
      const point = toCanvas(event);
      const label = labelAt(page, point.x, point.y);
      if (tool === "brush" && !label) return;
      view.setPointerCapture(event.pointerId);
      drawing = {
        pointerId: event.pointerId,
        last: point,
        mask: tool === "brush" ? buildMask(page, label) : null,
      };
      paintTo(point);
    });

    view.addEventListener("pointermove", (event) => {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      if (isBlocked()) { cancelStroke(); return; }
      paintTo(toCanvas(event));
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      view.addEventListener(type, (event) => {
        if (drawing && event.pointerId === drawing.pointerId) finishStroke();
      });
    });

    pencils.forEach((pencil) => {
      pencil.addEventListener("click", () => {
        tool = pencil.dataset.tool;
        if (pencil.dataset.color) color = pencil.dataset.color;
        pencils.forEach((item) => {
          const active = item === pencil;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-checked", String(active));
        });
        syncThickness();
      });
    });

    function setThickness(event) {
      const rect = slider.querySelector(".thickness-track").getBoundingClientRect();
      const value = (event.clientX - rect.left) / (rect.width || 1);
      thicknessOf[tool] = Math.min(1, Math.max(0, value));
      syncThickness();
    }

    let sliding = null;
    slider.addEventListener("pointerdown", (event) => {
      sliding = event.pointerId;
      slider.setPointerCapture?.(event.pointerId);
      setThickness(event);
    });
    slider.addEventListener("pointermove", (event) => {
      if (event.pointerId === sliding) setThickness(event);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      slider.addEventListener(type, (event) => {
        if (event.pointerId === sliding) sliding = null;
      });
    });
    slider.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 0.1, ArrowUp: 0.1, ArrowLeft: -0.1, ArrowDown: -0.1 }[event.key];
      if (!step) return;
      event.preventDefault();
      thicknessOf[tool] = Math.min(1, Math.max(0, thicknessOf[tool] + step));
      syncThickness();
    });

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener("click", () => showPage(i));
    });

    syncThickness();
    showPage(0);
    new ResizeObserver(() => fit()).observe(paper);
    fit();

    const ready = Promise.all(
      pages.map(async (item, i) => {
        item.img = await loadImage(item.src);
        item.labels = computeLabels(item.img);
        Object.assign(item, findRegions(item.labels));
        drawThumb(i);
      })
    );

    return { ready, cancelStroke };
  };
})();
