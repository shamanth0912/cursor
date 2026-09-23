(function (global) {
  const SOURCE = {
    sourceTitle: "Tourist Rush in Chikkamagaluru Hill Stations",
    sourceUrl:
      "https://www.kannadaprabha.in/karnataka-news/chikkamagaluru-news/tourist-rush-in-chikkamagaluru-hill-stations/articleshow-v7pdkgg",
    publicationDate: "2026-01-14",
    lastReviewed: "2026-09-20",
    methodologyNote:
      "Figures represent recorded visits at tourism destinations and may include the same person at multiple locations. They should not be interpreted as unique visitors.",
    geography: "Chikkamagaluru district, Karnataka",
  };

  function statistic(partial) {
    return {
      value: partial.value,
      unit: partial.unit || "visits",
      geography: partial.geography || SOURCE.geography,
      definition: partial.definition,
      referenceYear: partial.referenceYear,
      sourceTitle: SOURCE.sourceTitle,
      sourceUrl: SOURCE.sourceUrl,
      publicationDate: SOURCE.publicationDate,
      lastReviewed: SOURCE.lastReviewed,
      methodologyNote: SOURCE.methodologyNote,
    };
  }

  const destinationVisits = [
    { id: "sringeri", name: "Sringeri", catalogueId: "sringeri", visits2024: 3537777, visits2025: 2021279 },
    { id: "horanadu", name: "Horanadu", catalogueId: "horanadu", visits2024: 1800638, visits2025: 1294199 },
    { id: "kalasa", name: "Kalasa", catalogueId: "kalasa", visits2024: 797922, visits2025: 805882 },
    { id: "datta-peetha", name: "Datta Peetha", catalogueId: "baba-budangiri", visits2024: 1255784, visits2025: 2487253 },
    { id: "kemmannugundi", name: "Kemmannugundi", catalogueId: "kemmanagundi", visits2024: 538217, visits2025: 1091493 },
  ];

  const districtVisitTotals = [
    { year: 2024, visits: 7930338 },
    { year: 2025, visits: 8146973 },
  ];

  const districtTotal2024 = statistic({
    value: 7930338,
    definition: "Reported recorded destination visits across Chikkamagaluru district.",
    referenceYear: 2024,
  });

  const districtTotal2025 = statistic({
    value: 8146973,
    definition: "Reported recorded destination visits across Chikkamagaluru district.",
    referenceYear: 2025,
  });

  const accommodation = {
    status: "pending",
    title: "Accommodation landscape",
    headline: "Data verification in progress",
    supporting:
      "Verified taluk-level accommodation figures will be added after the current registration data is confirmed.",
    note: "No property counts are published here until the registration data is confirmed.",
  };

  const MONTHS = [
    { id: 1, key: "jan", label: "January", kn: "ಜನವರಿ", seasonId: "winter" },
    { id: 2, key: "feb", label: "February", kn: "ಫೆಬ್ರವರಿ", seasonId: "winter" },
    { id: 3, key: "mar", label: "March", kn: "ಮಾರ್ಚ್", seasonId: "summer" },
    { id: 4, key: "apr", label: "April", kn: "ಏಪ್ರಿಲ್", seasonId: "summer" },
    { id: 5, key: "may", label: "May", kn: "ಮೇ", seasonId: "summer" },
    { id: 6, key: "jun", label: "June", kn: "ಜೂನ್", seasonId: "monsoon" },
    { id: 7, key: "jul", label: "July", kn: "ಜುಲೈ", seasonId: "monsoon" },
    { id: 8, key: "aug", label: "August", kn: "ಆಗಸ್ಟ್", seasonId: "monsoon" },
    { id: 9, key: "sep", label: "September", kn: "ಸೆಪ್ಟೆಂಬರ್", seasonId: "monsoon" },
    { id: 10, key: "oct", label: "October", kn: "ಅಕ್ಟೋಬರ್", seasonId: "post-monsoon" },
    { id: 11, key: "nov", label: "November", kn: "ನವೆಂಬರ್", seasonId: "winter" },
    { id: 12, key: "dec", label: "December", kn: "ಡಿಸೆಂಬರ್", seasonId: "winter" },
  ];

  const seasonPlans = {
    winter: {
      seasonName: "Clearer ridges, cooler mornings",
      shortDescription:
        "November–February is the classic visiting window for viewpoints: cooler nights, clearer mornings on Mullayanagiri and Kemmanagundi, and coffee harvest in many estates.",
      suitableCategoryIds: ["peaks", "viewpoints", "hill-station", "temples"],
      recommendedPlaceIds: ["mullayanagiri", "baba-budangiri", "kemmanagundi"],
      considerations: "Nights are cold on the peaks. Festival calendars belong to temples and the district site, not to this page.",
      packingNote: "Carry a warm layer for ridge mornings. Mist can still close a view without warning.",
      sourceUrl: "stories.html#seasons",
      sourceYear: null,
      dataStatus: "editorial",
      rainfallObservations: null,
    },
    summer: {
      seasonName: "Warmer conditions, thinner falls",
      shortDescription:
        "March–May: town heat pushes people toward the ghats. Waterfalls are often reduced. Start early and carry water.",
      suitableCategoryIds: ["temples", "hill-station", "heritage", "lakes"],
      recommendedPlaceIds: ["kemmanagundi", "sringeri", "hirekolale"],
      considerations: "Some grassland treks feel harsher. Check forest fire and access notices.",
      packingNote: "Water, a hat, and shoes that can take laterite dust.",
      sourceUrl: "stories.html#seasons",
      sourceYear: null,
      dataStatus: "editorial",
      rainfallObservations: null,
    },
    monsoon: {
      seasonName: "Monsoon landscapes, possible restrictions",
      shortDescription:
        "June–September is when the ghats become water, falls at their most theatrical, and when roads fail, leeches appear, and parks close.",
      suitableCategoryIds: ["waterfalls", "lakes", "hill-station"],
      recommendedPlaceIds: ["hebbe-falls", "jhari-falls", "hirekolale"],
      considerations:
        "Do not treat a viral jeep video as an open road. Follow PWD, police and forest closures. Fuel up before remote loops.",
      packingNote: "Rain layer, grip-soled shoes, and a plan that can wait out a landslide notice.",
      sourceUrl: "stories.html#seasons",
      sourceYear: null,
      dataStatus: "editorial",
      rainfallObservations: null,
    },
    "post-monsoon": {
      seasonName: "Green transitional period",
      shortDescription:
        "October: hills hold colour after the rains. Some falls still run. Trails can remain slick.",
      suitableCategoryIds: ["viewpoints", "heritage", "waterfalls", "temples"],
      recommendedPlaceIds: ["charmadi", "sringeri", "kadambi-falls"],
      considerations: "Ask about leeches and slippery laterite. Confirm any Dasara-related temple crowds locally.",
      packingNote: "A light rain layer still earns its place in the bag.",
      sourceUrl: "stories.html#seasons",
      sourceYear: null,
      dataStatus: "editorial",
      rainfallObservations: null,
    },
  };

  function formatIndian(value) {
    const n = Math.round(Number(value) || 0);
    const sign = n < 0 ? "-" : "";
    const digits = String(Math.abs(n));
    if (digits.length <= 3) return sign + digits;
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return `${sign}${rest},${last3}`;
  }

  function formatCompact(value) {
    const n = Number(value) || 0;
    const abs = Math.abs(n);
    if (abs >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")}Cr`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}M`;
    if (abs >= 1e5) return `${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
    return formatIndian(n);
  }

  function formatPercent(ratio, digits) {
    const places = digits == null ? 1 : digits;
    const n = Number(ratio) || 0;
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(places)}%`;
  }

  function percentChange(from, to) {
    if (!from) return 0;
    return ((to - from) / from) * 100;
  }

  function publishedDestinations() {
    return (global.CKM.destinations || []).filter((place) => place && place.id && place.unpublished !== true && place.disabled !== true);
  }

  function catalogueCount() {
    return publishedDestinations().length;
  }

  function districtTotals() {
    const y24 = districtVisitTotals.find((row) => row.year === 2024);
    const y25 = districtVisitTotals.find((row) => row.year === 2025);
    const annualIncrease = percentChange(y24.visits, y25.visits);
    return {
      y24,
      y25,
      annualIncrease,
      annualIncreaseDisplay: formatPercent(annualIncrease, 1),
      fiveRowSum2025: destinationVisits.reduce((sum, row) => sum + row.visits2025, 0),
    };
  }

  function destinationRows() {
    return destinationVisits.map((row) => {
      const change = percentChange(row.visits2024, row.visits2025);
      return {
        ...row,
        change,
        changeLabel: formatPercent(change, 1),
        direction: change > 0.05 ? "up" : change < -0.05 ? "down" : "flat",
        visits2024Label: formatIndian(row.visits2024),
        visits2025Label: formatIndian(row.visits2025),
      };
    });
  }

  function sortDestinationRows(mode) {
    const rows = destinationRows().slice();
    if (mode === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === "increase") {
      rows.sort((a, b) => b.change - a.change);
    } else {
      rows.sort((a, b) => b.visits2025 - a.visits2025);
    }
    return rows;
  }

  function monthPlan(monthId) {
    const month = MONTHS.find((m) => m.id === Number(monthId)) || MONTHS[0];
    const plan = seasonPlans[month.seasonId];
    const editorial = (global.CKM.seasons || []).find((s) => s.id === month.seasonId);
    return {
      month,
      ...plan,
      shortDescription: (editorial && editorial.text) || plan.shortDescription,
      seasonName: (editorial && editorial.title) || plan.seasonName,
    };
  }

  function placesForSeason(seasonId, limit) {
    const tagged = publishedDestinations().filter((place) => (place.seasons || []).includes(seasonId));
    const plan = seasonPlans[seasonId];
    const preferred = (plan.recommendedPlaceIds || [])
      .map((id) => publishedDestinations().find((place) => place.id === id))
      .filter(Boolean);
    const rest = tagged.filter((place) => !preferred.some((p) => p.id === place.id));
    return preferred.concat(rest).slice(0, limit || 3);
  }

  function talukMetrics(talukId) {
    const taluk = (global.CKM.taluks || []).find((t) => t.id === talukId);
    const places = publishedDestinations().filter((place) => place.talukId === talukId);
    const cats = {};
    places.forEach((place) => {
      cats[place.category] = (cats[place.category] || 0) + 1;
    });
    const categories = Object.entries(cats)
      .map(([id, count]) => {
        const meta = (global.CKM.categories || []).find((c) => c.id === id);
        return { id, count, label: meta ? meta.label : id };
      })
      .sort((a, b) => b.count - a.count);
    const featured = places.slice(0, 3);
    const permitCount = places.filter((place) => (place.tags || []).includes("permit")).length;
    return { taluk, places, categories, featured, permitCount };
  }

  global.CKMStatistics = {
    SOURCE,
    destinationVisits,
    districtVisitTotals,
    districtTotal2024,
    districtTotal2025,
    accommodation,
    MONTHS,
    seasonPlans,
    formatIndian,
    formatCompact,
    formatPercent,
    percentChange,
    publishedDestinations,
    catalogueCount,
    districtTotals,
    destinationRows,
    sortDestinationRows,
    monthPlan,
    placesForSeason,
    talukMetrics,
  };
})(window);
