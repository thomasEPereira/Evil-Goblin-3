"use strict";
/* ===== Interface: HUD, boss bar, shop, stats menu, pause screen =====
   The always-on HUD only shows what you need mid-fight (HP, ability cooldowns, gold, wave).
   Everything else lives in the Stats menu (Tab or I).
*/

const UI_FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
const UI_PANEL = "rgba(11,17,13,.84)";
const UI_EDGE = "rgba(255,255,255,.13)";
const UI_DIM = "#9fb3a5";
const UI_GOLD = "#ffd24a";
const TAG_COLORS = { SWORD: "#ff8a4c", DASH: "#4cc9ff", GUN: "#ffd24a", DEF: "#5be37d", UTIL: "#c58cff" };

/* ---------- drawing helpers ---------- */
function rr(x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function uiPanel(x, y, w, h, r){
  rr(x, y, w, h, r);
  ctx.fillStyle = UI_PANEL;
  ctx.fill();
  ctx.strokeStyle = UI_EDGE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function uiText(str, x, y, size, color, align, weight, shadow){
  ctx.font = (weight || "600") + " " + size + "px " + UI_FONT;
  ctx.textAlign = align || "left";
  ctx.textBaseline = "alphabetic";
  if(shadow){
    ctx.shadowColor = "rgba(0,0,0,.85)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = "left";
}

function uiBar(x, y, w, h, frac, color){
  rr(x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fill();

  if(frac > 0){
    ctx.save();
    rr(x, y, w, h, h / 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * frac, h);
    ctx.fillStyle = "rgba(255,255,255,.2)";      // gloss
    ctx.fillRect(x, y, w * frac, h * 0.42);
    ctx.restore();
  }

  rr(x, y, w, h, h / 2);
  ctx.strokeStyle = "rgba(255,255,255,.3)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function uiCoin(x, y, r){
  ctx.fillStyle = "#c9931a";
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = UI_GOLD;
  ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, Math.PI * 2); ctx.fill();
}

function fmt(n){ return Math.floor(n).toLocaleString("en-US"); }

function wrapText(str, maxW){
  const words = str.split(" ");
  const lines = [];
  let line = "";
  for(const w of words){
    const test = line ? line + " " + w : w;
    if(line && ctx.measureText(test).width > maxW){ lines.push(line); line = w; }
    else line = test;
  }
  if(line) lines.push(line);
  return lines;
}

/* ---------- HUD ---------- */
function drawAbility(x, y, w, key, label, frac, color){
  const ready = frac >= 1;
  rr(x, y, w, 34, 9);
  ctx.fillStyle = "rgba(0,0,0,.5)";
  ctx.fill();

  ctx.save();
  rr(x, y, w, 34, 9);
  ctx.clip();
  ctx.globalAlpha = ready ? 0.9 : 0.5;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), 34);
  ctx.restore();

  rr(x, y, w, 34, 9);
  ctx.strokeStyle = ready ? color : "rgba(255,255,255,.18)";
  ctx.lineWidth = ready ? 2 : 1;
  ctx.stroke();

  uiText(label, x + 11, y + 22, 13, ready ? "#06130c" : "#fff", "left", "800");
  uiText(key, x + w - 10, y + 21, 11, ready ? "#06130c" : "#d5e0d8", "right", "700");
}

function drawHud(){
  const p = player, W = canvas.width;

  /* --- left: HP + abilities --- */
  const lx = 14, ly = 14, lw = 276;
  uiPanel(lx, ly, lw, 98, 14);

  const frac = clamp(p.hp / p.maxHp, 0, 1);
  const hpColor = frac > 0.5 ? "#4ade80" : (frac > 0.25 ? "#fbbf24" : "#f87171");
  uiText("HP", lx + 14, ly + 30, 13, UI_DIM, "left", "800");
  uiBar(lx + 44, ly + 14, lw - 58, 22, frac, hpColor);
  uiText(Math.max(0, Math.ceil(p.hp)) + " / " + p.maxHp, lx + 44 + (lw - 58) / 2, ly + 30, 14, "#fff", "center", "800", true);

  const aw = (lw - 38) / 2;
  const d = p.dash, s = p.sword;
  drawAbility(lx + 14, ly + 50, aw, "SPACE", "DASH",
    d.cdTimer > 0 ? 1 - d.cdTimer / d.cooldown : 1, "#4cc9ff");
  drawAbility(lx + 24 + aw, ly + 50, aw, "CLICK", "SWORD",
    s.cdTimer > 0 ? 1 - s.cdTimer / s.cooldown : 1, SWORD_TIERS[s.tier].color);

  /* --- right: wave, gold, enemies --- */
  const rw = 218, rx = W - 14 - rw, ry = 14;
  const rh = challenge ? 128 : 98;
  uiPanel(rx, ry, rw, rh, 14);

  uiText("WAVE", rx + 16, ry + 26, 12, UI_DIM, "left", "800");
  uiText(String(wave), rx + 16, ry + 58, 32, "#fff", "left", "800");
  uiText(goblins.length + " goblins", rx + rw - 16, ry + 26, 13, "#c9d6cc", "right", "700");

  uiCoin(rx + 24, ry + 80, 9);
  uiText(fmt(p.gold), rx + 40, ry + 87, 21, UI_GOLD, "left", "800");

  if(challenge){
    rr(rx + 12, ry + 98, rw - 24, 22, 8);
    ctx.fillStyle = "rgba(170,90,255,.35)";
    ctx.fill();
    ctx.strokeStyle = "rgba(200,140,255,.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    uiText("EMPEROR\u00B2  next \u00D7" + Math.pow(2, emperorKills), rx + rw / 2, ry + 114, 12, "#ecd9ff", "center", "800");
  }

  drawHints();
}

function drawHints(){
  const segs = [["Tab", "Stats"], ["B", "Shop"], ["P", "Pause"]];
  if(emperorKills > 0 && !challenge) segs.push(["G", "EMPEROR\u00B2 challenge"]);

  ctx.font = "800 12px " + UI_FONT;
  const keyFont = "800 12px " + UI_FONT, labFont = "600 12px " + UI_FONT;
  let total = 0;
  for(const [k, l] of segs){
    ctx.font = keyFont; total += ctx.measureText(k).width + 6;
    ctx.font = labFont; total += ctx.measureText(l).width + 20;
  }
  total -= 20;

  const w = total + 28, x = (canvas.width - w) / 2, y = canvas.height - 40;
  rr(x, y, w, 26, 13);
  ctx.fillStyle = "rgba(11,17,13,.7)";
  ctx.fill();

  let cx = x + 14;
  ctx.textAlign = "left";
  for(const [k, l] of segs){
    const gold = k === "G";
    ctx.font = keyFont;
    ctx.fillStyle = UI_GOLD;
    ctx.fillText(k, cx, y + 17);
    cx += ctx.measureText(k).width + 6;
    ctx.font = labFont;
    ctx.fillStyle = gold ? UI_GOLD : "#aab6ad";
    ctx.fillText(l, cx, y + 17);
    cx += ctx.measureText(l).width + 20;
  }
}

function drawVignette(){
  const frac = player.hp / player.maxHp;
  if(frac >= 0.3 || gameOver) return;
  const a = (0.3 - frac) / 0.3 * 0.45 + 0.06 * Math.sin(performance.now() / 140);
  const W = canvas.width, H = canvas.height;
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(180,0,0,0)");
  g.addColorStop(1, "rgba(180,0,0," + clamp(a, 0, 0.6) + ")");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ---------- boss bar ---------- */
function drawBossBar(){
  const boss = goblins.find(g => g.boss);
  if(!boss) return;

  const W = canvas.width;
  const w = clamp(W - 660, 280, 560), x = (W - w) / 2, y = 46, h = 18;
  const emp = boss.kind === "emperor";

  let color = "#e5484d";
  if(emp) color = EMP_BAR[boss.phase];
  else if(boss.phase === 3) color = "#8a2be2";

  let label = boss.title;
  if(emp){
    label += " - PHASE " + boss.phase + "/" + EMP_PHASES;
    if(EMP_NAMES[boss.phase]) label += " (" + EMP_NAMES[boss.phase] + ")";
  }else if(boss.phase === 3){
    label += " - FINAL PHASE";
  }

  uiText(label, W / 2, 36, 17, "#fff", "center", "800", true);
  uiBar(x, y, w, h, clamp(boss.hp / boss.maxHp, 0, 1), color);
  uiText(fmt(Math.max(0, boss.hp)) + " / " + fmt(boss.maxHp), W / 2, y + 14, 11, "#fff", "center", "700", true);

  if(emp){                                    // one pip per phase: filled = reached
    const pw = 24, gap = 6;
    const total = EMP_PHASES * pw + (EMP_PHASES - 1) * gap;
    for(let p = 1; p <= EMP_PHASES; p++){
      const px = (W - total) / 2 + (p - 1) * (pw + gap);
      rr(px, y + 26, pw, 8, 4);
      ctx.fillStyle = p <= boss.phase ? EMP_BAR[p] : "rgba(0,0,0,.6)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/* ---------- shop ---------- */
function drawShop(){
  const L = shopLayout();
  clampShopScroll();

  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  uiPanel(L.x, L.y, L.w, L.h, 18);

  uiText("GOBLIN SHOP", L.x + 28, L.y + 52, 30, "#fff", "left", "800");

  const goldTxt = fmt(player.gold);
  uiText(goldTxt, L.x + L.w - 28, L.y + 50, 24, UI_GOLD, "right", "800");
  ctx.font = "800 24px " + UI_FONT;
  uiCoin(L.x + L.w - 28 - ctx.measureText(goldTxt).width - 16, L.y + 42, 10);

  const rowRight = L.x + L.w - 28;
  for(let i = 0; i < L.visible; i++){
    const idx = shopScroll + i;
    if(idx >= shopItems.length) break;

    const it = shopItems[idx];
    const y = L.y + L.listTop + i * L.rowH;
    const maxed = itemMaxed(it);
    const cost = itemCost(it);
    const afford = player.gold >= cost;
    const sel = idx === selected;

    if(sel){
      rr(L.x + 14, y - 23, L.w - 40, 30, 9);
      ctx.fillStyle = "rgba(255,210,74,.13)";
      ctx.fill();
      ctx.strokeStyle = UI_GOLD;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // category chip
    rr(L.x + 24, y - 18, 58, 20, 6);
    ctx.fillStyle = TAG_COLORS[it.tag] || "#888";
    ctx.fill();
    uiText(it.tag, L.x + 24 + 29, y - 3, 11, "#09120c", "center", "800");

    // name
    const nameColor = maxed ? "#6d7a71" : (sel ? "#fff" : (afford ? "#e6efe8" : "#9aa89e"));
    uiText(itemName(it), L.x + 94, y - 1, 16, nameColor, "left", sel ? "800" : "600");

    // level + price
    const lv = itemLevelText(it);
    if(lv) uiText(lv, rowRight - 96, y - 1, 13, "#7f9186", "right", "700");
    if(maxed) uiText("MAXED", rowRight, y - 1, 15, "#6d7a71", "right", "800");
    else uiText(fmt(cost) + "g", rowRight, y - 1, 16, afford ? "#7ee787" : "#ff8b8b", "right", "800");
  }

  // scrollbar
  if(shopItems.length > L.visible){
    const trackH = L.visible * L.rowH - 10;
    const tx = L.x + L.w - 16, ty = L.y + L.listTop - 22;
    rr(tx, ty, 4, trackH, 2);
    ctx.fillStyle = "rgba(255,255,255,.1)";
    ctx.fill();
    const thumbH = Math.max(24, trackH * L.visible / shopItems.length);
    const thumbY = ty + (trackH - thumbH) * (shopScroll / (shopItems.length - L.visible));
    rr(tx, thumbY, 4, thumbH, 2);
    ctx.fillStyle = "rgba(255,210,74,.7)";
    ctx.fill();
  }

  // description box
  const dy = L.y + L.h - 112;
  rr(L.x + 16, dy, L.w - 32, 54, 10);
  ctx.fillStyle = "rgba(255,255,255,.05)";
  ctx.fill();
  ctx.font = "500 15px " + UI_FONT;
  const lines = wrapText(itemDesc(shopItems[selected]), L.w - 64).slice(0, 2);
  lines.forEach((ln, i) => uiText(ln, L.x + 30, dy + 22 + i * 19, 15, "#d5e0d8", "left", "500"));

  if(performance.now() < shopNote.until){
    uiText(shopNote.text, L.x + 30, L.y + L.h - 38, 15, shopNote.text === "Bought!" ? "#7ee787" : "#ff8b8b", "left", "800");
  }
  uiText("UP / DOWN select     ENTER buy     ESC or B close     Tab stats",
    L.x + L.w / 2, L.y + L.h - 16, 13, UI_DIM, "center", "600");
}

/* ---------- stats menu (Tab / I) ---------- */
function statsCard(x, y, w, title, accent, rows){
  const h = 44 + rows.length * 24;
  rr(x, y, w, h, 12);
  ctx.fillStyle = "rgba(255,255,255,.045)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  rr(x + 14, y + 15, 4, 16, 2);
  ctx.fillStyle = accent;
  ctx.fill();
  uiText(title, x + 26, y + 29, 14, accent, "left", "800");

  rows.forEach((r, i) => {
    const ry = y + 56 + i * 24;
    uiText(r[0], x + 16, ry, 14, UI_DIM, "left", "600");
    uiText(r[1], x + w - 16, ry, 14, r[2] || "#fff", "right", "800");
  });
  return h;
}

function drawStatsMenu(){
  const p = player, s = p.sword, d = p.dash;
  const W = canvas.width, H = canvas.height;
  const cw = 252, gap = 12;
  const DW = cw * 3 + gap * 2 + 48;
  const tier = SWORD_TIERS[s.tier];

  const col1 = [
    ["SURVIVAL", "#5be37d", [
      ["Max HP", p.maxHp + " / " + MAX_HP_CAP],
      ["Armor", p.armor + " / " + ARMOR_CAP + "  (-" + r1(p.armor * ARMOR_REDUCTION * 100) + "%)"],
      ["Regeneration", r1(p.regen * 60) + " HP/s"],
      ["Move speed", r1(p.speed) + " / " + SPEED_CAP]
    ]],
    ["DASH", "#4cc9ff", [
      ["Cooldown", r1(d.cooldown / 60) + " s"],
      ["Distance", Math.round(d.speed * d.duration) + " px"],
      ["Shockwave", d.shockwave ? Math.round(d.shockMult * 100) + "% sword dmg" : "locked"]
    ]],
    ["GUN", UI_GOLD, [
      ["Damage", p.damage],
      ["Projectiles", p.multishot],
      ["Pierce", p.pierce]
    ]]
  ];
  const col2 = [
    ["SWORD", tier.color, [
      ["Weapon", tier.name, tier.color],
      ["Damage per swing", fmt(swordDamage())],
      ["Reach", Math.round(swordRange()) + " px"],
      ["Swings per second", r1(60 / s.cooldown)],
      ["Sword DPS", fmt(swordDamage() * 60 / s.cooldown)],
      ["Swing arc", s.whirlwind ? "360\u00B0" : Math.round(SWORD_ARC * 180 / Math.PI) + "\u00B0"],
      ["Lifesteal", r1(s.lifesteal) + " HP / hit"],
      ["Damage bonus", "\u00D7" + r1(s.dmgMult)]
    ]],
    ["ECONOMY", UI_GOLD, [
      ["Gold bonus", "\u00D7" + r1(p.goldMult)],
      ["Pickup range", Math.round(p.magnet) + " px"],
      ["Kills", fmt(p.kills)],
      ["Level", p.level]
    ]]
  ];
  const col3 = [
    ["RUN", "#c58cff", [
      ["Wave", wave],
      ["Goblins left", goblins.length],
      ["Emperor kills", emperorKills],
      ["Emperor\u00B2", challenge ? "ACTIVE (next \u00D7" + Math.pow(2, emperorKills) + ")" : (emperorKills > 0 ? "press G" : "locked")]
    ]],
    ["CONTROLS", "#ff8a4c", [
      ["Sword", "Left click"],
      ["Shoot", "Right click"],
      ["Dash", "Space"],
      ["Move", "W A S D"],
      ["Shop", "B"],
      ["Stats", "Tab / I"],
      ["Pause", "P"],
      ["Challenge", "G"]
    ]]
  ];

  const colH = cols => cols.reduce((a, c) => a + 44 + c[2].length * 24 + 12, -12);
  const DH = 96 + Math.max(colH(col1), colH(col2), colH(col3)) + 24;
  const sc = Math.min(1, (W - 24) / DW, (H - 24) / DH);

  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate((W - DW * sc) / 2, (H - DH * sc) / 2);
  ctx.scale(sc, sc);

  uiPanel(0, 0, DW, DH, 18);
  uiText("STATS", 24, 52, 30, "#fff", "left", "800");
  uiText("Tab / I / Esc to close", DW - 24, 50, 13, UI_DIM, "right", "600");

  [col1, col2, col3].forEach((col, ci) => {
    let y = 76;
    const x = 24 + ci * (cw + gap);
    for(const [title, accent, rows] of col) y += statsCard(x, y, cw, title, accent, rows) + 12;
  });

  ctx.restore();
}

/* ---------- pause ---------- */
function drawPauseScreen(){
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  uiText("PAUSED", canvas.width / 2, canvas.height / 2, 64, "#fff", "center", "800", true);
  uiText("Press P to resume", canvas.width / 2, canvas.height / 2 + 40, 20, UI_DIM, "center", "600");
}
