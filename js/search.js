(() => {
  const QUERY = "app_version=870&country_place_id=41207";
  const KIDS = ["kids-7-12", "russian-cartoons", "zarubezhnyie-multserialyi", "cartoons-fairytales"];
  const input = document.getElementById("query");
  const results = document.getElementById("results");
  let defaultResults = "";
  let timer = null;
  let requestId = 0;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  }

  function posterUrl(item) {
    const posters = item.posters || [];
    const vertical = posters.find((poster) => poster.content_format === "Posters-782x1200");
    return (vertical || posters[0] || {}).url || "";
  }

  function cardMarkup(item) {
    const src = posterUrl(item);
    const title = escapeHtml(item.title || "");
    const age = item.restrict != null ? `<span class="age-text">${item.restrict}+</span>` : "";
    const image = src ? `<img src="${src}" alt="${title}" loading="lazy" />` : `<span class="poster-name">${title}</span>`;
    return `<a class="poster" href="#">${image}${age}</a>`;
  }

  function showStatus(text) {
    results.innerHTML = `<p class="search-status">${text}</p>`;
  }

  async function search(query) {
    const id = ++requestId;
    showStatus("Ищем…");
    const url =
      "https://api2.ivi.ru/mobileapi/livesearch/v7/" +
      `?${QUERY}&query=${encodeURIComponent(query)}` +
      "&object_type=content&fields=id,title,hru,posters,object_type,restrict&from=0&to=23";
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (id !== requestId) return;
      const items = Array.isArray(data.result) ? data.result : [];
      results.innerHTML = items.length ? items.map(cardMarkup).join("") : "";
      if (!items.length) showStatus("Ничего не нашлось");
    } catch (error) {
      if (id === requestId) showStatus("Не удалось выполнить поиск");
    }
  }

  function mixKids(pages) {
    const seen = new Set();
    const items = [];
    const max = Math.max(...pages.map((page) => page.length), 0);
    for (let index = 0; index < max && items.length < 12; index += 1) {
      pages.forEach((page) => {
        const item = page[index];
        if (!item || seen.has(item.id) || !posterUrl(item) || items.length >= 12) return;
        seen.add(item.id);
        items.push(item);
      });
    }
    return items;
  }

  async function loadKids() {
    const pages = await Promise.all(
      KIDS.map(async (hru) => {
        const url =
          "https://api2.ivi.ru/mobileapi/collection/catalog/v7/" +
          `?${QUERY}&hru=${encodeURIComponent(hru)}` +
          "&sort=relevance&fields=id,title,hru,posters,object_type,restrict&from=0&to=11";
        const data = await fetch(url).then((response) => response.json());
        return Array.isArray(data.result) ? data.result : [];
      })
    );
    const items = mixKids(pages);
    defaultResults = items.map(cardMarkup).join("");
    if (!input.value.trim()) {
      results.innerHTML = defaultResults || '<p class="search-status">Не удалось загрузить подборку</p>';
    }
  }

  loadKids().catch(() => {
    if (!input.value.trim()) results.innerHTML = '<p class="search-status">Не удалось загрузить подборку</p>';
  });

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (!query) {
      requestId += 1;
      results.innerHTML = defaultResults;
      return;
    }
    timer = setTimeout(() => search(query), 300);
  });
})();
