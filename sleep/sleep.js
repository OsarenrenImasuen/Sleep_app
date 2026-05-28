// ══════════════════════════════════════════════
//  SLEEP.JS — integrated game logic
// ══════════════════════════════════════════════

// Level definitions
const LEVELS = [
  { lvl:1,  title:"Cloud Drifter",    xpNeeded:0    },
  { lvl:2,  title:"Twilight Napper",  xpNeeded:100  },
  { lvl:3,  title:"Star Chaser",      xpNeeded:250  },
  { lvl:4,  title:"Moon Wanderer",    xpNeeded:450  },
  { lvl:5,  title:"Night Owl",        xpNeeded:700  },
  { lvl:6,  title:"Dream Seeker",     xpNeeded:1000 },
  { lvl:7,  title:"Sleep Sage",       xpNeeded:1400 },
  { lvl:8,  title:"Lunar Walker",     xpNeeded:1900 },
  { lvl:9,  title:"Star Drifter",     xpNeeded:2500 },
  { lvl:10, title:"Deep Voyager",     xpNeeded:3200 },
  { lvl:11, title:"Astral Sleeper",   xpNeeded:4000 },
  { lvl:12, title:"Nebula Rester",    xpNeeded:4900 },
  { lvl:13, title:"Cosmic Dreamer",   xpNeeded:6000 },
  { lvl:14, title:"Eclipse Walker",   xpNeeded:7200 },
  { lvl:15, title:"Void Traveller",   xpNeeded:8600 },
  { lvl:16, title:"Galaxy Drifter",   xpNeeded:10200},
  { lvl:17, title:"Midnight Sage",    xpNeeded:12000},
  { lvl:18, title:"Aurora Master",    xpNeeded:14100},
  { lvl:19, title:"Celestial Knight", xpNeeded:16500},
  { lvl:20, title:"Dream Sovereign",  xpNeeded:19200},
];

const STORE_ITEMS = [
  { id:"boost_small",  icon:"⚡", name:"Small EXP Booster", desc:"Earn +25% XP on your next sleep session. Perfect for a quick edge.", price:10, multiplier:1.25 },
  { id:"boost_big",    icon:"🔥", name:"Major EXP Booster", desc:"Earn +50% XP on your next sleep session. Dream bigger, gain faster.", price:20, multiplier:1.50 },
  { id:"boost_ultra",  icon:"💫", name:"Ultra EXP Booster", desc:"Earn +100% XP on your next sleep session. Double your dream power.", price:40, multiplier:2.00 },
  { id:"lucky_night",  icon:"🌟", name:"Lucky Night Pass",  desc:"Earn +2 tokens per hour slept instead of 1, for one night.", price:15, multiplier:1.0, tokenBoost:true },
  { id:"dream_elixir", icon:"🧪", name:"Dream Elixir", desc:"Permanently earn 5 bonus XP per sleep session, forever.", price:80, permanent:true  },
  {id:"money_potion", icon:"⚗️", name:"Money Potion", desc: "Earn More tokens per hour slept.", price: 45, multiplier:3.0, tokenBoost:true }
];

// ── State ──
let state = {
  xp: 0,
  tokens: 0,
  nights: 0,
  totalHours: 0,
  activeBooster: null,   // { multiplier, name } or null
  tokenBoostNext: false,
  permanentBonus: 0,     // flat XP added each session
  inventory: {},         // itemId: count owned
};

function save() {
  localStorage.setItem("slumber_state", JSON.stringify(state));
}

function load() {
  const s = localStorage.getItem("slumber_state");
  if (s) state = Object.assign(state, JSON.parse(s));
}

// ── Level helpers ──
function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) { current = LEVELS[i]; break; }
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = LEVELS[nextIdx] || null;
  const xpInLevel  = xp - current.xpNeeded;
  const xpForLevel = next ? next.xpNeeded - current.xpNeeded : 1;
  const pct = next ? Math.min(100, Math.round(xpInLevel / xpForLevel * 100)) : 100;
  return { current, next, xpInLevel, xpForLevel, pct };
}

// ── Log Sleep ──
function logSleep() {
  const startEl = document.getElementById("sleepStart");
  const endEl   = document.getElementById("sleepEnd");
  let [sh, sm]  = startEl.value.split(":").map(Number);
  let [eh, em]  = endEl.value.split(":").map(Number);

  let startMin = sh * 60 + sm;
  let endMin   = eh * 60 + em;
  if (endMin <= startMin) endMin += 1440; // past midnight
  const hoursSlept = (endMin - startMin) / 60;

  if (hoursSlept < 0.5) { showToast("Sleep time too short to log!"); return; }
  if (hoursSlept > 14)  { showToast("That seems too long — max 14 hours."); return; }

  // Base XP: 10 per hour + sweet-spot bonus for 7-9h
  let baseXp = Math.round(hoursSlept * 10);
  if (hoursSlept >= 7 && hoursSlept <= 9) baseXp += 20;

  // Permanent bonus
  baseXp += state.permanentBonus;

  // Booster
  let multiplier  = 1;
  let boosterName = "";
  if (state.activeBooster) {
    multiplier  = state.activeBooster.multiplier;
    boosterName = state.activeBooster.name;
    state.activeBooster = null; // consume
  }
  const finalXp = Math.round(baseXp * multiplier);

  // Tokens
  const tokenMulti  = state.tokenBoostNext ? 2 : 1;
  const tokensEarned = Math.floor(hoursSlept * tokenMulti);
  state.tokenBoostNext = false;

  const prevLvl = getLevelInfo(state.xp).current.lvl;
  state.xp         += finalXp;
  state.tokens     += tokensEarned;
  state.nights     += 1;
  state.totalHours += hoursSlept;
  save();

  const newLvl    = getLevelInfo(state.xp).current.lvl;
  const leveledUp = newLvl > prevLvl;

  // Show result
  const result = document.getElementById("sleepResult");
  result.classList.add("show");

  document.getElementById("resultGain").textContent =
    "+" + finalXp + " XP" + (multiplier > 1 ? " (boosted!)" : "") + "  🪙 +" + tokensEarned;

  document.getElementById("resultDetail").textContent =
    hoursSlept.toFixed(1) + "h slept · " +
    (hoursSlept >= 7 && hoursSlept <= 9 ? "Sweet spot bonus included · " : "") +
    (boosterName ? boosterName + " applied · " : "") +
    "Base: " + (baseXp - state.permanentBonus) + " XP";

  if (leveledUp) {
    const info = getLevelInfo(state.xp);
    setTimeout(function() {
      showToast("🎉 Level Up! You are now Level " + info.current.lvl + " — " + info.current.title);
    }, 600);
  }

  updateAllUI();
}

// ── Store ──
function renderStore() {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  STORE_ITEMS.forEach(function(item) {
    let owned =0
    if (state.inventory[item.id]>0){
      owned = state.inventory[item.id]
    } else{
      owned = 0
    }
    //const owned = state.inventory[item.id] || 0;
    const isPermanentOwned = item.permanent && owned > 0;

    const card = document.createElement("div");
    card.className = "store-item";

    const permanentLine = isPermanentOwned
      ? '<p style="font-size:.78rem;color:#2a7a2a;font-weight:500;">✓ Purchased — active permanently</p>'
      : (item.permanent
          ? '<p style="font-size:.78rem;color:#2a7a2a;font-weight:500;">One-time permanent upgrade</p>'
          : '<p style="font-size:.78rem;color:#3a5a7a;">You own: <strong>' + owned + '</strong></p>');

    const footerRight = isPermanentOwned
      ? '<span class="owned-badge" style="display:inline-block;">Owned</span>'
      : '<button class="btn btn-gold btn-sm" onclick="buyItem(\'' + item.id + '\')">Buy</button>';

    card.innerHTML =
      '<div class="item-icon">' + item.icon + '</div>' +
      '<h3>' + item.name + '</h3>' +
      '<p>' + item.desc + '</p>' +
      permanentLine +
      '<div class="item-footer">' +
        '<div class="price-tag"><span>🪙</span>' + item.price + '</div>' +
        footerRight +
      '</div>';

    grid.appendChild(card);
  });
}

function buyItem(id) {
  const item = STORE_ITEMS.find(function(i) { return i.id === id; });
  if (!item) return;
  if (state.tokens < item.price) { showToast("Not enough tokens! Sleep more to earn tokens."); return; }
  if (item.permanent && (state.inventory[id] || 0) > 0) { showToast("You already own this upgrade!"); return; }

  state.tokens -= item.price;
  state.inventory[id] = (state.inventory[id] || 0) + 1;

  if (item.permanent) {
    state.permanentBonus += 5;
    showToast("✨ " + item.name + " activated permanently!");
  } else if (item.tokenBoost) {
    state.tokenBoostNext = true;
    showToast("🌟 Token boost ready for tonight!");
  } else {
    state.activeBooster = { multiplier: item.multiplier, name: item.name };
    showToast("⚡ " + item.name + " ready! Log sleep to use it.");
  }

  save();
  updateAllUI();
  renderStore();
}

// ── UI Updates ──
function updateAllUI() {
  const info = getLevelInfo(state.xp);
  const current    = info.current;
  const next       = info.next;
  const xpInLevel  = info.xpInLevel;
  const xpForLevel = info.xpForLevel;
  const pct        = info.pct;

  // Home page
  document.getElementById("homeLvl").textContent      = current.lvl;
  document.getElementById("homeLvlTitle").textContent  = current.title;
  document.getElementById("homeXpFill").style.width    = pct + "%";
  document.getElementById("homeXpLabel").textContent   =
    xpInLevel + " / " + xpForLevel + " XP" + (next ? " to Level " + next.lvl : " (Max!)");

  // Booster notice
  const bn = document.getElementById("boosterNotice");
  if (state.activeBooster) {
    bn.textContent = "⚡ " + state.activeBooster.name + " active! ×" + state.activeBooster.multiplier + " XP this session.";
    bn.classList.add("show");
  } else {
    bn.classList.remove("show");
  }

  // Sleep Level page
  document.getElementById("bigLvlNum").textContent   = current.lvl;
  document.getElementById("bigLvlTitle").textContent  = current.title;
  document.getElementById("bigXpFill").style.width    = pct + "%";
  document.getElementById("bigXpCur").textContent     = xpInLevel + " XP";
  document.getElementById("bigXpNext").textContent    = next
    ? (xpForLevel - xpInLevel) + " XP to Level " + next.lvl
    : "Max Level!";
  document.getElementById("statTotalXp").textContent  = state.xp;
  document.getElementById("statNights").textContent   = state.nights;
  document.getElementById("statTokens").textContent   = state.tokens;
  const avg = state.nights ? (state.totalHours / state.nights).toFixed(1) + "h" : "—";
  document.getElementById("statAvgHours").textContent = avg;

  // Level table
  const tbody = document.getElementById("levelTableBody");
  tbody.innerHTML = "";
  LEVELS.forEach(function(l) {
    const tr = document.createElement("tr");
    if (l.lvl === current.lvl) tr.className = "current-row";
    const prefix = l.lvl === current.lvl ? "▶ " : "";
    tr.innerHTML =
      "<td>" + prefix + l.lvl + "</td>" +
      "<td>" + l.title + "</td>" +
      "<td>" + l.xpNeeded + " XP</td>";
    tbody.appendChild(tr);
  });

  // Token display (store page)
  document.getElementById("tokenCount").textContent = state.tokens;

  // Profile page
  document.getElementById("profileLvl").textContent    = current.lvl;
  document.getElementById("profileTitle").textContent   = current.title;
  document.getElementById("profileXp").textContent      = state.xp;
  document.getElementById("profileNights").textContent  = state.nights;

  // Ranking page
  document.getElementById("rankYouLvl").textContent = "Level " + current.lvl + " · " + current.title;

  renderStore();
}

// ── Navigation ──
function showPage(id) {
  document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
  document.querySelectorAll(".nav-links li a").forEach(function(a) { a.classList.remove("active"); });
  document.getElementById("page-" + id).classList.add("active");
  document.querySelector('[data-page="' + id + '"]').classList.add("active");
  document.getElementById("navLinks").classList.remove("open");
  if (id === "home") {
    document.getElementById("sleepResult").classList.remove("show");
  }
}

document.querySelectorAll("[data-page]").forEach(function(el) {
  el.addEventListener("click", function(e) {
    e.preventDefault();
    showPage(el.dataset.page);
  });
});

document.getElementById("navToggle").addEventListener("click", function() {
  document.getElementById("navLinks").classList.toggle("open");
});

// ── Toast ──
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function() { t.classList.remove("show"); }, 3000);
}

// ── INIT ──
load();
updateAllUI();