/**
 * WWE Universe Ranking Manager
 * App local sin backend. Toda la persistencia se maneja con localStorage.
 */

const STORAGE_KEY = "wweUniverseManagerState";
const TABS = [
  { id: "estado", label: "Estado del Universo" },
  { id: "gestion", label: "Gestión de Luchadores" },
  { id: "rankings", label: "Rankings" },
  { id: "combate", label: "Registrar Combate" },
  { id: "carteleras", label: "Carteleras" },
];

const DIVISIONS = {
  RAW: [
    "World Heavyweight",
    "World Womens",
    "Intercontinental",
    "Womens Intercontinental",
    "World Tag Team",
  ],
  SMACKDOWN: [
    "Undisputed",
    "WWE Womens",
    "United States",
    "Womens United States",
    "WWE Tag Team",
  ],
};


const WEEKLY_ORDER = {
  RAW: [
    "World Womens",
    "World Tag Team",
    "Intercontinental",
    "World Heavyweight",
    "Womens Intercontinental",
  ],
  SMACKDOWN: [
    "WWE Womens",
    "WWE Tag Team",
    "United States",
    "Undisputed",
    "Womens United States",
  ],
};

const PPV_ORDER = [
  { brand: "RAW", division: "World Womens" },
  { brand: "SMACKDOWN", division: "WWE Womens" },
  { brand: "RAW", division: "World Tag Team" },
  { brand: "SMACKDOWN", division: "WWE Tag Team" },
  { brand: "RAW", division: "Intercontinental" },
  { brand: "SMACKDOWN", division: "United States" },
  { brand: "RAW", division: "Womens Intercontinental" },
  { brand: "SMACKDOWN", division: "Womens United States" },
  { brand: "RAW", division: "World Heavyweight" },
  { brand: "SMACKDOWN", division: "Undisputed" },
];

const state = loadState();
init();

function init() {
  renderTabs();
  renderAll();
}

function createInitialState() {
  return {
    wrestlers: [],
    matches: [],
    showNumber: 1,
    activeTab: "estado",
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    return { ...createInitialState(), ...JSON.parse(raw) };
  } catch (error) {
    console.warn("No se pudo cargar estado, se reinicia.", error);
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  TABS.forEach((tab) => {
    const btn = document.createElement("button");
    btn.textContent = tab.label;
    btn.className = state.activeTab === tab.id ? "active" : "";
    btn.onclick = () => {
      state.activeTab = tab.id;
      saveState();
      renderTabs();
      renderPanels();
    };
    tabs.appendChild(btn);
  });

  renderPanels();
}

function renderPanels() {
  TABS.forEach((tab) => {
    const panel = document.getElementById(`panel-${tab.id}`);
    panel.classList.toggle("hidden", state.activeTab !== tab.id);
  });
}

function renderAll() {
  renderEstado();
  renderGestion();
  renderRankings();
  renderCombate();
  renderCarteleras();
}

function getDivisionWrestlers(brand, division, includeChampion = false) {
  return state.wrestlers.filter(
    (w) =>
      w.marca === brand &&
      w.division === division &&
      (includeChampion || !w.esCampeon)
  );
}

function getChampion(brand, division) {
  return state.wrestlers.find(
    (w) => w.marca === brand && w.division === division && w.esCampeon
  );
}

function getSortedRanking(brand, division) {
  const list = getDivisionWrestlers(brand, division, false);
  return list.sort((a, b) => b.puntos - a.puntos || b.victorias - a.victorias);
}

function inRisk(brand, division, wrestlerId) {
  const ranking = getSortedRanking(brand, division);
  const idx = ranking.findIndex((w) => w.id === wrestlerId);
  if (idx < 0 || idx > 9 || ranking.length < 11) return false;
  return ranking[9].puntos - ranking[10].puntos < 5;
}

function renderEstado() {
  const panel = document.getElementById("panel-estado");
  const riskItems = [];
  const cards = [];

  Object.entries(DIVISIONS).forEach(([brand, divisions]) => {
    divisions.forEach((division) => {
      const champion = getChampion(brand, division);
      const ranking = getSortedRanking(brand, division);
      const contender = ranking[0];

      if (ranking.length >= 11 && ranking[9].puntos - ranking[10].puntos < 5) {
        riskItems.push(`${brand} / ${division}: ${ranking[9].nombre}`);
      }

      cards.push(`
        <div class="card">
          <h3>${brand} · ${division}</h3>
          <p><strong>Campeón:</strong> ${champion ? champion.nombre : "Sin campeón"}</p>
          <p><strong>#1 Contendiente:</strong> ${contender ? contender.nombre : "Sin contendiente"}</p>
        </div>
      `);
    });
  });

  panel.innerHTML = `
    <h2>Estado del Universo</h2>
    <div class="grid">${cards.join("")}</div>
    <div class="card" style="margin-top:0.8rem;">
      <h3>Luchadores en riesgo</h3>
      ${riskItems.length ? `<ul class="list">${riskItems.map((r) => `<li>${r}</li>`).join("")}</ul>` : "<p>Ninguno</p>"}
    </div>
  `;
}

function renderGestion() {
  const panel = document.getElementById("panel-gestion");
  panel.innerHTML = `
    <h2>Gestión de Luchadores</h2>
    <div class="grid">
      <div class="card">
        <h3>Agregar Luchador</h3>
        <label>Nombre</label>
        <input id="add-name" type="text" placeholder="Nombre" />
        <label>Marca</label>
        <select id="add-brand"></select>
        <label>División</label>
        <select id="add-division"></select>
        <button id="add-btn" class="primary">Agregar Luchador</button>
      </div>
      <div class="card">
        <h3>Editar división</h3>
        <label>Luchador</label>
        <select id="move-wrestler"></select>
        <label>Nueva marca</label>
        <select id="move-brand"></select>
        <label>Nueva división</label>
        <select id="move-division"></select>
        <button id="move-btn" class="secondary">Mover Luchador</button>
      </div>
    </div>

    <div class="card" style="margin-top:0.8rem;">
      <h3>Roster</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Marca</th><th>División</th><th>Puntos</th><th>W-L</th><th>Campeón</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${state.wrestlers
              .map(
                (w) => `
                <tr>
                  <td>${w.nombre}</td>
                  <td>${w.marca}</td>
                  <td>${w.division}</td>
                  <td>${w.puntos}</td>
                  <td>${w.victorias}-${w.derrotas}</td>
                  <td>${w.esCampeon ? "Sí" : "No"}</td>
                  <td><button data-champ="${w.id}" class="secondary">Hacer campeón</button> <button data-del="${w.id}" class="danger">Eliminar</button></td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setupBrandDivisionPair("add-brand", "add-division");
  setupBrandDivisionPair("move-brand", "move-division");
  fillWrestlerSelect();

  document.getElementById("add-btn").onclick = addWrestler;
  document.getElementById("move-btn").onclick = moveWrestler;


  panel.querySelectorAll("button[data-champ]").forEach((btn) => {
    btn.onclick = () => {
      setChampion(btn.dataset.champ);
    };
  });

  panel.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.del;
      state.wrestlers = state.wrestlers.filter((w) => w.id !== id);
      saveState();
      renderAll();
    };
  });
}

function setupBrandDivisionPair(brandId, divisionId) {
  const brandSelect = document.getElementById(brandId);
  const divisionSelect = document.getElementById(divisionId);

  brandSelect.innerHTML = Object.keys(DIVISIONS)
    .map((b) => `<option value="${b}">${b}</option>`)
    .join("");

  const refreshDivisions = () => {
    const brand = brandSelect.value;
    divisionSelect.innerHTML = DIVISIONS[brand]
      .map((d) => `<option value="${d}">${d}</option>`)
      .join("");
  };

  brandSelect.onchange = refreshDivisions;
  refreshDivisions();
}

function setChampion(wrestlerId) {
  const wrestler = state.wrestlers.find((w) => w.id === wrestlerId);
  if (!wrestler) return;

  state.wrestlers.forEach((w) => {
    if (w.marca === wrestler.marca && w.division === wrestler.division) {
      w.esCampeon = false;
    }
  });

  wrestler.esCampeon = true;
  saveState();
  renderAll();
}

function fillWrestlerSelect() {
  const select = document.getElementById("move-wrestler");
  if (!select) return;
  select.innerHTML = state.wrestlers
    .map((w) => `<option value="${w.id}">${w.nombre} (${w.marca} / ${w.division})</option>`)
    .join("");
}

function addWrestler() {
  const name = document.getElementById("add-name").value.trim();
  const marca = document.getElementById("add-brand").value;
  const division = document.getElementById("add-division").value;

  if (!name) return alert("Ingresa nombre");
  const exists = state.wrestlers.some(
    (w) => w.nombre.toLowerCase() === name.toLowerCase() && w.division === division
  );
  if (exists) return alert("Nombre duplicado en la división");

  state.wrestlers.push({
    id: uid("w"),
    nombre: name,
    marca,
    division,
    puntos: 0,
    victorias: 0,
    derrotas: 0,
    esCampeon: false,
    mesesUltimoLugar: 0,
    reinados: 0,
  });

  saveState();
  renderAll();
}

function moveWrestler() {
  const wrestlerId = document.getElementById("move-wrestler").value;
  const marca = document.getElementById("move-brand").value;
  const division = document.getElementById("move-division").value;
  const wrestler = state.wrestlers.find((w) => w.id === wrestlerId);

  if (!wrestler) return;
  const duplicate = state.wrestlers.some(
    (w) =>
      w.id !== wrestler.id &&
      w.division === division &&
      w.nombre.toLowerCase() === wrestler.nombre.toLowerCase()
  );
  if (duplicate) return alert("Ya existe ese nombre en la división destino");
  wrestler.marca = marca;
  wrestler.division = division;
  wrestler.puntos = 0;
  wrestler.victorias = 0;
  wrestler.derrotas = 0;
  wrestler.esCampeon = false;

  saveState();
  renderAll();
}

function renderRankings() {
  const panel = document.getElementById("panel-rankings");
  const sections = [];

  Object.entries(DIVISIONS).forEach(([brand, divisions]) => {
    divisions.forEach((division) => {
      const champ = getChampion(brand, division);
      const ranking = getSortedRanking(brand, division);

      sections.push(`
        <div class="card">
          <h3>${brand} · ${division}</h3>
          <p><strong>Campeón:</strong> ${champ ? champ.nombre : "Sin campeón"}</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Nombre</th><th>Puntos</th><th>W-L</th><th>Estado</th></tr>
              </thead>
              <tbody>
                ${ranking
                  .map((w, idx) => {
                    const active = idx < 10;
                    const risk = inRisk(brand, division, w.id);
                    return `
                      <tr>
                        <td>${idx + 1}</td>
                        <td>${w.nombre}</td>
                        <td>${w.puntos}</td>
                        <td>${w.victorias}-${w.derrotas}</td>
                        <td>
                          ${active ? '<span class="badge ok">TOP 10</span>' : ""}
                          ${risk ? '<span class="badge warn">EN RIESGO DE SALIR DEL TOP 10</span>' : ""}
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `);
    });
  });

  panel.innerHTML = `<h2>Rankings por Campeonato</h2><div class="grid">${sections.join("")}</div>`;
}

function renderCombate() {
  const panel = document.getElementById("panel-combate");
  panel.innerHTML = `
    <h2>Registrar Combate</h2>
    <div class="card">
      <label>Marca</label>
      <select id="fight-brand"></select>
      <label>División</label>
      <select id="fight-division"></select>
      <label>Luchador A</label>
      <select id="fight-a"></select>
      <label>Luchador B</label>
      <select id="fight-b"></select>
      <label>Ganador</label>
      <select id="fight-winner"></select>
      <button id="fight-save" class="primary">Registrar</button>
      <button id="show-next" class="secondary">Siguiente Show Semanal</button>
      <p class="small">Show actual: #${state.showNumber}</p>
    </div>
  `;

  setupBrandDivisionPair("fight-brand", "fight-division");
  refreshFightWrestlers();

  document.getElementById("fight-brand").onchange = () => {
    setupBrandDivisionPair("fight-brand", "fight-division");
    refreshFightWrestlers();
  };
  document.getElementById("fight-division").onchange = refreshFightWrestlers;

  document.getElementById("fight-save").onclick = registerFight;
  document.getElementById("show-next").onclick = () => {
    state.showNumber += 1;
    saveState();
    renderAll();
  };
}

function refreshFightWrestlers() {
  const brand = document.getElementById("fight-brand").value;
  const division = document.getElementById("fight-division").value;
  const list = getDivisionWrestlers(brand, division, true);

  const options = list.map((w) => `<option value="${w.id}">${w.nombre}</option>`).join("");
  document.getElementById("fight-a").innerHTML = options;
  document.getElementById("fight-b").innerHTML = options;
  document.getElementById("fight-winner").innerHTML = options;
}

function registerFight(isTitleMatch = false) {
  const brand = document.getElementById("fight-brand").value;
  const division = document.getElementById("fight-division").value;
  const aId = document.getElementById("fight-a").value;
  const bId = document.getElementById("fight-b").value;
  const winnerId = document.getElementById("fight-winner").value;

  if (!aId || !bId || aId === bId) return alert("Selecciona dos luchadores diferentes");
  if (winnerId !== aId && winnerId !== bId) return alert("Ganador inválido");

  const a = state.wrestlers.find((w) => w.id === aId);
  const b = state.wrestlers.find((w) => w.id === bId);
  const winner = state.wrestlers.find((w) => w.id === winnerId);
  const loser = winnerId === aId ? b : a;

  if (!a || !b || !winner || !loser) return;

  winner.victorias += 1;
  loser.derrotas += 1;

  if (!winner.esCampeon) winner.puntos += 10;
  if (!loser.esCampeon) loser.puntos -= 5;

  state.matches.push({
    idCombate: uid("m"),
    luchadorA: aId,
    luchadorB: bId,
    division,
    fecha: new Date().toISOString(),
    numeroShow: state.showNumber,
    titular: isTitleMatch,
    ganador: winnerId,
  });

  saveState();
  renderAll();
}

function wasRecentMatch(aId, bId, currentShow) {
  return state.matches.some((m) => {
    const samePair =
      (m.luchadorA === aId && m.luchadorB === bId) ||
      (m.luchadorA === bId && m.luchadorB === aId);
    return samePair && currentShow - m.numeroShow <= 3;
  });
}

function wasLastWeeklyMatch(aId, bId, currentShow) {
  return state.matches.some((m) => {
    const samePair =
      (m.luchadorA === aId && m.luchadorB === bId) ||
      (m.luchadorA === bId && m.luchadorB === aId);
    return samePair && !m.titular && m.numeroShow === currentShow - 1;
  });
}

function generateWeeklyCard(brand) {
  const fights = [];
  const usedThisShow = new Set();
  const orderedDivisions = WEEKLY_ORDER[brand] || DIVISIONS[brand] || [];

  orderedDivisions.forEach((division) => {

  DIVISIONS[brand].forEach((division) => {
    const ranking = getSortedRanking(brand, division).slice(0, 10);

    const available = ranking.filter((w) => !usedThisShow.has(w.id));
    if (available.length < 2) return;

    let selectedFight = null;

    for (const a of available) {
      const aPos = ranking.findIndex((w) => w.id === a.id);

      const preferredRival = available.find((b) => {
        if (b.id === a.id) return false;
        const bPos = ranking.findIndex((w) => w.id === b.id);
        const withinRange = Math.abs(aPos - bPos) <= 3;
        return withinRange && !wasLastWeeklyMatch(a.id, b.id, state.showNumber);
      });

      if (preferredRival) {
        selectedFight = { a, b: preferredRival };
        break;
      }
    }

    if (!selectedFight) {
      for (const a of available) {
        const aPos = ranking.findIndex((w) => w.id === a.id);
        const fallbackRival = available.find((b) => {
          if (b.id === a.id) return false;
          const bPos = ranking.findIndex((w) => w.id === b.id);
          return Math.abs(aPos - bPos) <= 3;
        });

        if (fallbackRival) {
          selectedFight = { a, b: fallbackRival };
          break;
        }
      }
    }

    if (!selectedFight) return;

    usedThisShow.add(selectedFight.a.id);
    usedThisShow.add(selectedFight.b.id);
    fights.push({
      brand,
      division,
      a: selectedFight.a.nombre,
      b: selectedFight.b.nombre,
    });
function generateWeeklyCard(brand) {
  const fights = [];

  DIVISIONS[brand].forEach((division) => {
    const ranking = getSortedRanking(brand, division).slice(0, 10);
    const pool = [...ranking];

    while (pool.length > 1) {
      const a = pool.shift();
      const aPos = ranking.findIndex((w) => w.id === a.id);
      let candidateIndex = pool.findIndex((b) => {
        const bPos = ranking.findIndex((w) => w.id === b.id);
        return Math.abs(aPos - bPos) <= 3 && !wasRecentMatch(a.id, b.id, state.showNumber);
      });

      if (candidateIndex === -1) {
        candidateIndex = pool.findIndex((b) => {
          const bPos = ranking.findIndex((w) => w.id === b.id);
          return Math.abs(aPos - bPos) <= 3;
        });
      }

      if (candidateIndex === -1) continue;
      const [b] = pool.splice(candidateIndex, 1);
      fights.push({ brand, division, a: a.nombre, b: b.nombre });
    }
  });

  return fights;
}
function generatePPV() {
  const fights = [];

  PPV_ORDER.forEach(({ brand, division }) => {
    const champion = getChampion(brand, division);
    const challenger = getSortedRanking(brand, division)[0];
    if (champion && challenger) {
      fights.push({
        brand,
        division,
        champion: champion.nombre,
        challenger: challenger.nombre,
      });
    }

function generatePPV() {
  const fights = [];

  Object.entries(DIVISIONS).forEach(([brand, divisions]) => {
    divisions.forEach((division) => {
      const champion = getChampion(brand, division);
      const challenger = getSortedRanking(brand, division)[0];
      if (champion && challenger) {
        fights.push({
          brand,
          division,
          champion: champion.nombre,
          challenger: challenger.nombre,
        });
      }
    });
  });

  return fights;
}

function renderCarteleras() {
  const panel = document.getElementById("panel-carteleras");
  panel.innerHTML = `
    <h2>Carteleras</h2>
    <div class="grid">
      <div class="card">
        <button id="gen-raw" class="primary">Generar RAW</button>
        <ul id="raw-list" class="list"></ul>
      </div>
      <div class="card">
        <button id="gen-smack" class="primary">Generar SmackDown</button>
        <ul id="smack-list" class="list"></ul>
      </div>
      <div class="card">
        <button id="gen-ppv" class="secondary">Generar PPV</button>
        <ul id="ppv-list" class="list"></ul>
      </div>
    </div>
    <div class="card" style="margin-top:0.8rem;">
      <h3>Resultado titular PPV</h3>
      <label>Marca</label>
      <select id="ppv-brand"></select>
      <label>División</label>
      <select id="ppv-division"></select>
      <label>Ganador (campeón o retador #1)</label>
      <select id="ppv-winner"></select>
      <button id="ppv-register" class="secondary">Registrar Resultado Titular</button>
    </div>
  `;

  document.getElementById("gen-raw").onclick = () => {
    const fights = generateWeeklyCard("RAW");
    renderFightList("raw-list", fights.map((f) => `${f.division}: ${f.a} vs ${f.b}`));
  };
  document.getElementById("gen-smack").onclick = () => {
    const fights = generateWeeklyCard("SMACKDOWN");
    renderFightList("smack-list", fights.map((f) => `${f.division}: ${f.a} vs ${f.b}`));
  };
  document.getElementById("gen-ppv").onclick = () => {
    const fights = generatePPV();
    renderFightList(
      "ppv-list",
      fights.map((f) => `${f.brand} / ${f.division}: ${f.challenger} vs ${f.champion} (C)`) 
    );
  };

  setupBrandDivisionPair("ppv-brand", "ppv-division");
  refreshPPVWinnerOptions();

  document.getElementById("ppv-brand").onchange = () => {
    setupBrandDivisionPair("ppv-brand", "ppv-division");
    refreshPPVWinnerOptions();
  };
  document.getElementById("ppv-division").onchange = refreshPPVWinnerOptions;
  document.getElementById("ppv-register").onclick = registerPPVTitleResult;
}

function renderFightList(id, items) {
  const list = document.getElementById(id);
  if (!items.length) {
    list.innerHTML = "<li>Sin combates sugeridos.</li>";
    return;
  }
  list.innerHTML = items.map((i) => `<li>${i}</li>`).join("");
}

function refreshPPVWinnerOptions() {
  const brand = document.getElementById("ppv-brand").value;
  const division = document.getElementById("ppv-division").value;
  const champ = getChampion(brand, division);
  const challenger = getSortedRanking(brand, division)[0];

  const options = [champ, challenger]
    .filter(Boolean)
    .map((w) => `<option value="${w.id}">${w.nombre}${w.esCampeon ? " (C)" : " (#1)"}</option>`)
    .join("");

  document.getElementById("ppv-winner").innerHTML = options || "";
}

function registerPPVTitleResult() {
  const brand = document.getElementById("ppv-brand").value;
  const division = document.getElementById("ppv-division").value;
  const winnerId = document.getElementById("ppv-winner").value;

  const champion = getChampion(brand, division);
  const challenger = getSortedRanking(brand, division)[0];
  if (!champion || !challenger) return alert("Se requiere campeón y retador #1");

  const winner = state.wrestlers.find((w) => w.id === winnerId);
  if (!winner) return;

  // Registrar combate titular en historial.
  state.matches.push({
    idCombate: uid("m"),
    luchadorA: champion.id,
    luchadorB: challenger.id,
    division,
    fecha: new Date().toISOString(),
    numeroShow: state.showNumber,
    titular: true,
    ganador: winner.id,
  });

  if (winner.id === challenger.id) {
    challenger.esCampeon = true;
    challenger.reinados += 1;
    champion.esCampeon = false;
    champion.puntos = 0;
  }

  const divisionRoster = state.wrestlers.filter(
    (w) => w.marca === brand && w.division === division
  );
  divisionRoster.forEach((w) => {
    w.puntos = 0;
  });

  saveState();
  renderAll();
}
