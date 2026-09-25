(function (global) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function metricCardsHtml() {
    const S = global.CKMStatistics;
    const totals = S.districtTotals();
    const places = S.catalogueCount();
    return `
      <ul class="num-metrics">
        <li class="num-card">
          <p class="num-card-value">${esc(S.formatCompact(totals.y25.visits))}</p>
          <p class="num-card-label">Recorded destination visits</p>
          <p class="num-card-note">Across Chikkamagaluru district in 2025</p>
        </li>
        <li class="num-card">
          <p class="num-card-value">${esc(totals.annualIncreaseDisplay)}</p>
          <p class="num-card-label">Annual increase</p>
          <p class="num-card-note">Compared with the reported 2024 district total of ${esc(S.formatIndian(totals.y24.visits))}</p>
        </li>
        <li class="num-card">
          <p class="num-card-value">${esc(String(places))}</p>
          <p class="num-card-label">Places documented</p>
          <p class="num-card-note">Destinations currently published in this guide</p>
        </li>
      </ul>`;
  }

  function chartHtml(sort) {
    const S = global.CKMStatistics;
    const rows = S.sortDestinationRows(sort || "visits");
    const max = Math.max(...rows.flatMap((row) => [row.visits2024, row.visits2025]));
    const bars = rows
      .map((row) => {
        const w24 = (row.visits2024 / max) * 100;
        const w25 = (row.visits2025 / max) * 100;
        const arrow = row.direction === "up" ? "▲" : row.direction === "down" ? "▼" : "–";
        const changeWords = row.direction === "up" ? "increase" : row.direction === "down" ? "decrease" : "little change";
        return `<div class="num-dest">
          <div class="num-dest-head">
            <h4>${esc(row.name)}</h4>
            <p class="num-change num-change--${esc(row.direction)}" aria-label="${esc(row.name)} ${esc(changeWords)} ${esc(row.changeLabel)}">
              <span aria-hidden="true">${arrow}</span> ${esc(row.changeLabel)}
            </p>
          </div>
          <div class="num-bars" role="img" aria-label="${esc(row.name)}: 2024 ${esc(row.visits2024Label)} visits; 2025 ${esc(row.visits2025Label)} visits">
            <div class="num-bar">
              <span class="num-bar-year">2024</span>
              <span class="num-bar-track"><span class="num-bar-fill num-bar-fill--24" style="--w:${w24.toFixed(2)}%"></span></span>
              <span class="num-bar-val">${esc(row.visits2024Label)}</span>
            </div>
            <div class="num-bar">
              <span class="num-bar-year">2025</span>
              <span class="num-bar-track"><span class="num-bar-fill num-bar-fill--25" style="--w:${w25.toFixed(2)}%"></span></span>
              <span class="num-bar-val">${esc(row.visits2025Label)}</span>
            </div>
          </div>
        </div>`;
      })
      .join("");
    const tableRows = rows
      .map(
        (row) => `<tr>
          <th scope="row">${esc(row.name)}</th>
          <td>${esc(row.visits2024Label)}</td>
          <td>${esc(row.visits2025Label)}</td>
          <td>${esc(row.changeLabel)} ${row.direction === "up" ? "up" : row.direction === "down" ? "down" : "unchanged"}</td>
        </tr>`
      )
      .join("");
    return `
      <div class="num-legend" aria-hidden="false">
        <span><i class="num-swatch num-swatch--24"></i> 2024 recorded visits</span>
        <span><i class="num-swatch num-swatch--25"></i> 2025 recorded visits</span>
      </div>
      <div class="num-chart" data-visitor-chart>${bars}</div>
      <div class="num-table-wrap">
        <table class="num-table">
          <caption>Published destination visits, 2024 and 2025</caption>
          <thead>
            <tr>
              <th scope="col">Destination</th>
              <th scope="col">2024 visits</th>
              <th scope="col">2025 visits</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  }

  function seasonPanelHtml(monthId) {
    const S = global.CKMStatistics;
    const plan = S.monthPlan(monthId);
    const cats = (global.CKM.categories || []).filter((c) => plan.suitableCategoryIds.includes(c.id));
    const places = S.placesForSeason(plan.month.seasonId, 3);
    const chips = cats.map((c) => `<span class="num-chip">${esc(c.label)}</span>`).join("");
    const cards = places
      .map(
        (place) => `<a class="num-place" href="places.html?id=${esc(place.id)}">
          <img src="${esc(place.image)}" alt="" width="400" height="260" loading="lazy" />
          <span>${esc(place.name)}</span>
        </a>`
      )
      .join("");
    return `
      <p class="num-season-name">${esc(plan.seasonName)}</p>
      <p class="section-lead">${esc(plan.shortDescription)}</p>
      <p class="num-chips-label">Suitable experiences</p>
      <div class="num-chips">${chips}</div>
      <p class="num-chips-label">Three places for this weather</p>
      <div class="num-places">${cards}</div>
      <p class="num-consider"><strong>On the road and in forest.</strong> ${esc(plan.considerations)}</p>
      <p class="num-pack"><strong>Packing note.</strong> ${esc(plan.packingNote)}</p>
      <p class="num-rain-slot" data-rainfall-placeholder hidden>Future rainfall observations will sit here once a multi-year climate series is sourced.</p>
      <a class="text-link t-learn" href="${esc(plan.sourceUrl)}">Complete seasonal guidance</a>
      <p class="num-editorial">Editorial month groups, not a live weather board. No rainfall averages or temperature ranges are shown until a verified climate series is added.</p>`;
  }

  function talukPanelHtml(talukId) {
    const S = global.CKMStatistics;
    const id = talukId || "chikkamagaluru";
    const m = S.talukMetrics(id);
    if (!m.taluk) return "<p>Choose a taluk.</p>";
    const cats = m.categories.map((c) => `<li>${esc(c.label)} · ${c.count}</li>`).join("") || "<li>No categories yet.</li>";
    const featured = m.featured
      .map((p) => `<li><a href="places.html?id=${esc(p.id)}">${esc(p.name)}</a></li>`)
      .join("");
    const permit =
      m.permitCount > 0
        ? `<p>${m.permitCount} documented ${m.permitCount === 1 ? "place notes a" : "places note a"} forest permit.</p>`
        : "<p>No permit-tagged places in this taluk in the current catalogue.</p>";
    return `
      <p class="num-taluk-count"><strong>${m.places.length}</strong> places documented in ${esc(m.taluk.listName || m.taluk.name)}</p>
      <ul class="num-cat-list">${cats}</ul>
      ${featured ? `<p class="num-chips-label">Featured in this taluk</p><ul class="num-featured">${featured}</ul>` : ""}
      ${permit}
      <a class="btn btn-line" href="taluk.html?id=${esc(m.taluk.id)}">Explore ${esc(m.taluk.listName || m.taluk.name)}</a>`;
  }

    function numbersSectionHtml(mode) {
    const S = global.CKMStatistics;
    const totals = S.districtTotals();
    const months = S.MONTHS.map(
      (m, i) => `<button type="button" class="num-month" role="tab" id="num-month-${m.id}" data-month="${m.id}" aria-selected="${i === 0 ? "true" : "false"}" aria-controls="num-season-panel">${esc(m.label)}</button>`
    ).join("");
    const talukBtns = (global.CKMMap ? global.CKMMap.listOrder() : global.CKM.taluks || [])
      .map((t, i) => {
        const taluk = t.id ? t : global.CKM.taluks.find((x) => x.id === t);
        if (!taluk) return "";
        return `<button type="button" class="num-taluk-btn" data-numbers-taluk="${esc(taluk.id)}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(taluk.listName || taluk.name)}</button>`;
      })
      .join("");
    const intro =
      mode === "page"
        ? `<div class="wrap">
          <p class="num-tooltip-line">
            <button type="button" class="num-info" data-num-info aria-expanded="false" aria-controls="num-info-panel">About these visits</button>
          </p>
          <div class="num-info-panel" id="num-info-panel" hidden>
            <p>Recorded visits are destination entries, not necessarily unique travellers.</p>
          </div>
          ${metricCardsHtml()}
          <p class="num-district-note">District totals are the published district figures (${esc(S.formatIndian(totals.y24.visits))} in 2024; ${esc(S.formatIndian(totals.y25.visits))} in 2025). The five destination rows below do not add up to those totals, other locations are included in the district count.</p>
        </div>`
        : `<div class="wrap">
          <p class="kicker">Tourism</p>
          <h2 id="num-title">How the hills were counted.</h2>
          <p class="section-lead">Published destination entries for 2024 and 2025, set beside the places this companion actually documents. These are historical records, not a live gate.</p>
          <p class="num-tooltip-line">
            <button type="button" class="num-info" data-num-info aria-expanded="false" aria-controls="num-info-panel">About these visits</button>
          </p>
          <div class="num-info-panel" id="num-info-panel" hidden>
            <p>Recorded visits are destination entries, not necessarily unique travellers.</p>
          </div>
          ${metricCardsHtml()}
          <p class="num-district-note">District totals are the published district figures (${esc(S.formatIndian(totals.y24.visits))} in 2024; ${esc(S.formatIndian(totals.y25.visits))} in 2025). The five destination rows below do not add up to those totals, other locations are included in the district count.</p>
        </div>`;
    return `
      <section class="num-section" id="chikkamagaluru-in-numbers" aria-label="Tourism statistics">
        ${intro}

        <div class="wrap num-block">
          <p class="kicker">Visitor patterns</p>
          <h3>Where recorded visits changed</h3>
          <p class="section-lead">Compare published destination visits for 2024 and 2025. These figures measure entries at destinations and may count one traveller more than once.</p>
          <div class="num-sort" role="group" aria-label="Sort destinations">
            <button type="button" class="num-sort-btn" data-visit-sort="visits" aria-pressed="true">2025 visits</button>
            <button type="button" class="num-sort-btn" data-visit-sort="increase" aria-pressed="false">Largest increase</button>
            <button type="button" class="num-sort-btn" data-visit-sort="name" aria-pressed="false">Destination name</button>
          </div>
          <div data-visitor-board>${chartHtml("visits")}</div>
          <p class="num-summary">Among the five published destination rows, Sri Guru Dattatreya Baba Budan Swamy Dargah recorded the most visits in 2025. Kemmannugundi had the largest percentage increase, while Sringeri and Horanadu recorded declines.</p>
          <p class="num-source">Source: <a href="${esc(S.SOURCE.sourceUrl)}" rel="noopener noreferrer">${esc(S.SOURCE.sourceTitle)}</a>, Kannada Prabha, published 14 January 2026. Last reviewed 20 September 2026.</p>
          <details class="num-read">
            <summary>How to read this data</summary>
            <ul>
              <li>Visits are not necessarily unique travellers.</li>
              <li>The five destination rows do not sum to the complete district total.</li>
              <li>No cause is assigned to increases or decreases.</li>
              <li>Figures are historical, not live.</li>
            </ul>
            <p>${esc(S.SOURCE.methodologyNote)}</p>
          </details>
        </div>

        <div class="wrap num-block">
          <p class="kicker">Travel through the seasons</p>
          <h3>The hills change every month</h3>
          <p class="section-lead">Editorial notes from this companion’s seasonal chapter, not a rainfall graph, and not today’s weather.</p>
          <div class="num-months" role="tablist" aria-label="Month">${months}</div>
          <div class="num-season-panel" id="num-season-panel" role="tabpanel" data-season-panel aria-labelledby="num-month-1">
            ${seasonPanelHtml(1)}
          </div>
        </div>

        <div class="wrap num-block">
          <p class="kicker">Explore the district</p>
          <h3>Nine current taluks, one map.</h3>
          <p class="section-lead">Catalogue counts below are from this guide’s published places. The nine-taluk choropleth lives on the homepage and the map page, it is not drawn twice here. Kalasa and Ajjampura were carved from Mudigere and Tarikere after older maps; the OSM boundaries used there are the current nine taluks, not a historical grouping.</p>
          <p><a class="text-link t-learn" href="map.html">Open the district map</a></p>
          <div class="num-taluk-layout">
            <div class="num-taluk-list" role="group" aria-label="Taluks">${talukBtns}</div>
            <div class="num-taluk-panel" data-taluk-panel>${talukPanelHtml("chikkamagaluru")}</div>
          </div>
        </div>

        <div class="wrap num-block">
          <p class="kicker">Stay notes</p>
          <h3>Accommodation landscape</h3>
          <div class="num-pending" data-accommodation-pending>
            <svg class="num-pending-icon" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="1.6" d="M8 22 L24 10 L40 22 V40 H8 Z M18 40 V28 H30 V40" />
            </svg>
            <p class="num-pending-kicker">Data verification in progress</p>
            <p>${esc(S.accommodation.supporting)}</p>
            <p class="num-pending-note">${esc(S.accommodation.note)}</p>
          </div>
        </div>
      </section>`;
  }

  function bind(root) {
    if (!root || !global.CKMStatistics) return;
    const board = root.querySelector("[data-visitor-board]");
    root.querySelectorAll("[data-visit-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll("[data-visit-sort]").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        if (board) board.innerHTML = chartHtml(btn.getAttribute("data-visit-sort"));
      });
    });
    const info = root.querySelector("[data-num-info]");
    const panel = root.querySelector("#num-info-panel");
    if (info && panel) {
      info.addEventListener("click", () => {
        const open = info.getAttribute("aria-expanded") === "true";
        info.setAttribute("aria-expanded", open ? "false" : "true");
        panel.hidden = open;
      });
    }
    const seasonPanel = root.querySelector("[data-season-panel]");
    root.querySelectorAll("[data-month]").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll("[data-month]").forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
        const id = btn.getAttribute("data-month");
        if (seasonPanel) {
          seasonPanel.innerHTML = seasonPanelHtml(id);
          seasonPanel.setAttribute("aria-labelledby", btn.id);
        }
      });
    });
    const talukPanel = root.querySelector("[data-taluk-panel]");
    root.querySelectorAll("[data-numbers-taluk]").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll("[data-numbers-taluk]").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        const id = btn.getAttribute("data-numbers-taluk");
        if (talukPanel) talukPanel.innerHTML = talukPanelHtml(id);
        if (typeof global.CKMNumbers.onTaluk === "function") global.CKMNumbers.onTaluk(id);
      });
    });
  }

  global.CKMNumbers = {
    numbersSectionHtml,
    talukPanelHtml,
    bind,
    onTaluk: null,
  };
})(window);
