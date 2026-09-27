// ===========================================================
// Pokédex Card Lookup
// Fetches Pokémon data from PokeAPI and renders it as a card.
// No API key needed -- PokeAPI is a free, open, public API,
// so nothing secret has to live in this frontend code.
// ===========================================================

const API_BASE = "https://pokeapi.co/api/v2/pokemon/";
const STAT_MAX = 180; // rough visual ceiling used to scale the stat bars

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const quickButtons = document.getElementById("quick-search-buttons");
const cardSlot = document.getElementById("card-slot");
const statusPanel = document.getElementById("status-panel");

// Friendlier labels for the six base stats returned by the API.
const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = input.value.trim().toLowerCase();
  if (!name) {
    setStatus("Type a name first.", "error");
    return;
  }
  loadPokemon(name);
});

quickButtons.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  const name = chip.dataset.name;
  input.value = name;
  loadPokemon(name);
});

/**
 * Fetches a Pokémon by name (or numeric id) and renders the result.
 * Handles the loading, success, and error states end to end.
 */
async function loadPokemon(name) {
  setLoading(true);
  renderSkeleton();
  setStatus(`Looking up "${name}"...`, "loading");

  try {
    const response = await fetch(`${API_BASE}${encodeURIComponent(name)}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No Pokémon named "${name}" was found.`);
      }
      throw new Error(`The API returned an error (status ${response.status}).`);
    }

    const data = await response.json();
    const card = normalizePokemon(data);
    renderCard(card);
    setStatus(`Showing ${card.name} (#${card.id}).`, "success");
  } catch (err) {
    // A failed fetch() (offline, DNS, CORS) throws a generic TypeError,
    // so give that case a clearer message than the raw error text.
    const message =
      err instanceof TypeError
        ? "Couldn't reach the PokeAPI. Check your connection and try again."
        : err.message;
    renderError(message);
    setStatus(message, "error");
  } finally {
    setLoading(false);
  }
}

/**
 * Transforms the raw PokeAPI response into just the fields this
 * card needs, so the render function doesn't have to know about
 * the API's nested shape.
 */
function normalizePokemon(data) {
  return {
    id: data.id,
    name: data.name,
    sprite:
      data.sprites?.other?.["official-artwork"]?.front_default ||
      data.sprites?.front_default ||
      "",
    types: data.types.map((t) => t.type.name),
    heightM: data.height / 10, // API gives decimetres
    weightKg: data.weight / 10, // API gives hectograms
    stats: data.stats.map((s) => ({
      key: s.stat.name,
      label: STAT_LABELS[s.stat.name] || s.stat.name,
      value: s.base_stat,
    })),
    abilities: data.abilities.map((a) => ({
      name: a.ability.name.replace(/-/g, " "),
      hidden: a.is_hidden,
    })),
  };
}

function renderCard(p) {
  const primaryType = p.types[0] || "normal";

  const typePills = p.types
    .map(
      (t) =>
        `<span class="type-pill" style="--pill-color: var(--type-${t})">${t}</span>`
    )
    .join("");

  const statRows = p.stats
    .map((s) => {
      const pct = Math.min(100, Math.round((s.value / STAT_MAX) * 100));
      return `
        <div class="stat-row">
          <span class="stat-row__label">${s.label}</span>
          <span class="stat-row__track">
            <span class="stat-row__fill" style="width:${pct}%"></span>
          </span>
          <span class="stat-row__value">${s.value}</span>
        </div>`;
    })
    .join("");

  const abilityPills = p.abilities
    .slice(0, 4)
    .map(
      (a) =>
        `<span class="ability-pill${a.hidden ? " ability-pill--hidden" : ""}">${a.name}${a.hidden ? " (hidden)" : ""}</span>`
    )
    .join("");

  cardSlot.innerHTML = `
    <div class="poke-card" style="--type-color: var(--type-${primaryType})">
      <div class="poke-card__inner">
        <div class="poke-card__top">
          <h2 class="poke-card__name">${p.name}</h2>
          <span class="poke-card__id">#${String(p.id).padStart(3, "0")}</span>
        </div>

        <div class="poke-card__types">${typePills}</div>

        <div class="poke-card__art-frame">
          ${
            p.sprite
              ? `<img class="poke-card__art" src="${p.sprite}" alt="Official artwork of ${p.name}" />`
              : `<p style="color:var(--ink-dim); font-size:13px;">No artwork available.</p>`
          }
        </div>

        <div class="poke-card__measurements">
          <span>Height <strong>${p.heightM} m</strong></span>
          <span>Weight <strong>${p.weightKg} kg</strong></span>
        </div>

        <p class="poke-card__section-title">Base stats</p>
        ${statRows}

        <p class="poke-card__section-title" style="margin-top:16px;">Abilities</p>
        <div class="poke-card__abilities">${abilityPills}</div>
      </div>
    </div>
  `;
}

function renderSkeleton() {
  cardSlot.innerHTML = `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-line skeleton-line--w40"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-line skeleton-line--w60"></div>
      <div class="skeleton-line skeleton-line--w40"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
  `;
}

function renderError(message) {
  cardSlot.innerHTML = `
    <div class="error-card">
      <div class="error-card__glyph">!</div>
      <p class="error-card__title">Couldn't load that Pokémon</p>
      <p class="error-card__detail">${escapeHtml(message)}</p>
    </div>
  `;
}

function setLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.querySelector(".btn__label").textContent = isLoading
    ? "Searching..."
    : "Search";
}

function setStatus(message, state) {
  statusPanel.textContent = message;
  statusPanel.dataset.state = state;
}

/** Minimal escaping so an error message can never inject markup. */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
