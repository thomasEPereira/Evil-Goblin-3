"use strict";
/* ===== Drawing + HUD ===== */

function drawGoblin(g){
  if(g.kind === "emperor"){ drawEmperor(g); return; }

  const hunter = g.role === "hunter";
  const flash = g.windup && Math.floor(performance.now() / 50) % 2 === 0;   // boss windup flicker
  const gx = g.x + (g.windup ? (Math.random() - 0.5) * 8 : 0);
  const gy = g.y + (g.windup ? (Math.random() - 0.5) * 8 : 0);

  if(g.boss && g.phase === 3){
    ctx.shadowColor = "#b000ff";
    ctx.shadowBlur = 30;
    ctx.fillStyle = flash ? "#a020f0" : "black";
  }else if(g.boss){
    ctx.fillStyle = flash ? "orange" : (g.phase === 2 ? "red" : "gold");
  }else{
    let c = hunter ? "#7fff00" : "lime";
    if(g.dashState === "wind") c = "orange";            // about to dash!
    else if(g.dashState === "dash") c = "#ff6a2a";
    ctx.fillStyle = c;
  }

  ctx.beginPath();
  ctx.arc(gx, gy, g.r, 0, Math.PI * 2);
  ctx.fill();

  if(g.boss && g.phase === 3){
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#7a00cc";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const s = g.r / 20;
  ctx.fillStyle = ((g.boss && g.phase === 3) || hunter) ? "red" : "black";
  ctx.fillRect(gx - 8 * s, gy - 4 * s, 4 * s, 4 * s);
  ctx.fillRect(gx + 4 * s, gy - 4 * s, 4 * s, 4 * s);
}

function drawSword(){
  const s = player.sword;
  const tier = SWORD_TIERS[s.tier];
  const range = swordRange();

  if(s.swing > 0){
    const progress = 1 - s.swing / s.swingTime;
    const start = s.angle - s.arc / 2;
    const end = start + s.arc * progress;

    ctx.save();
    ctx.globalAlpha = 0.25 + 0.5 * (s.swing / s.swingTime);
    ctx.fillStyle = tier.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, range, start, end);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(player.x, player.y, range, start, end);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(end) * range, player.y + Math.sin(end) * range);
    ctx.stroke();
    ctx.restore();
  }else{
    // little sword held toward the mouse
    const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(a) * 14, player.y + Math.sin(a) * 14);
    ctx.lineTo(player.x + Math.cos(a) * 34, player.y + Math.sin(a) * 34);
    ctx.stroke();
  }
}

function drawCooldownBar(x, y, frac, color){
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(x, y, 34, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 34 * frac, 4);
}

function drawPlayer(){
  const p = player;

  drawSword();

  if(p.invuln > 0 && Math.floor(p.invuln / 3) % 2 === 0) ctx.globalAlpha = 0.4;
  ctx.fillStyle = "deepskyblue";
  ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  ctx.globalAlpha = 1;

  // cooldown bars under the player (only while recharging)
  const bx = p.x - 17;
  let by = p.y + p.size / 2 + 6;
  if(p.dash.cdTimer > 0){
    drawCooldownBar(bx, by, 1 - p.dash.cdTimer / p.dash.cooldown, "deepskyblue");
    by += 6;
  }
  if(p.sword.cdTimer > 0){
    drawCooldownBar(bx, by, 1 - p.sword.cdTimer / p.sword.cooldown, SWORD_TIERS[p.sword.tier].color);
  }
}

function drawMeteors(){
  for(const m of meteors){
    const prog = 1 - m.timer / m.max;

    ctx.fillStyle = "rgba(255,0,0,.15)";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,120,0,.35)";      // fills up as impact nears
    ctx.beginPath();
    ctx.arc(m.x, m.y, 80 * prog, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 80, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBossBar(){
  const boss = goblins.find(g => g.boss);
  if(!boss) return;

  const w = Math.min(600, canvas.width - 40);
  const x = (canvas.width - w) / 2;
  const emp = boss.kind === "emperor";

  let color = "red";
  if(emp) color = EMP_BAR[boss.phase];
  else if(boss.phase === 3) color = "#8a2be2";

  ctx.fillStyle = "black";
  ctx.fillRect(x, 20, w, 30);
  ctx.fillStyle = color;
  ctx.fillRect(x, 20, w * clamp(boss.hp / boss.maxHp, 0, 1), 30);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, 20, w, 30);

  let label = boss.title;
  if(emp){
    label += " - PHASE " + boss.phase + "/" + EMP_PHASES;
    if(EMP_NAMES[boss.phase]) label += " (" + EMP_NAMES[boss.phase] + ")";

    // one pip per phase: filled = reached
    const pw = 22, gap = 6;
    const total = EMP_PHASES * pw + (EMP_PHASES - 1) * gap;
    for(let p = 1; p <= EMP_PHASES; p++){
      const px = (canvas.width - total) / 2 + (p - 1) * (pw + gap);
      ctx.fillStyle = p <= boss.phase ? EMP_BAR[p] : "rgba(0,0,0,.6)";
      ctx.fillRect(px, 56, pw, 8);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(px, 56, pw, 8);
    }
  }else if(boss.phase === 3){
    label += " - FINAL PHASE";
  }

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, canvas.width / 2, 42);
  ctx.textAlign = "left";
}

function drawShop(){
  const L = shopLayout();
  clampShopScroll();

  ctx.fillStyle = "rgba(0,0,0,.92)";
  ctx.fillRect(L.x, L.y, L.w, L.h);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.strokeRect(L.x, L.y, L.w, L.h);

  ctx.textAlign = "left";
  ctx.fillStyle = "white";
  ctx.font = "36px Arial";
  ctx.fillText("GOBLIN SHOP", L.x + 30, L.y + 55);

  ctx.textAlign = "right";
  ctx.fillStyle = "gold";
  ctx.font = "24px Arial";
  ctx.fillText("Gold: " + player.gold, L.x + L.w - 30, L.y + 52);

  ctx.font = "19px Arial";
  for(let i = 0; i < L.visible; i++){
    const idx = shopScroll + i;
    if(idx >= shopItems.length) break;

    const it = shopItems[idx];
    const y = L.y + L.listTop + i * L.rowH;
    const maxed = itemMaxed(it);
    const cost = itemCost(it);

    let color = "white";
    if(maxed) color = "#666";
    else if(player.gold < cost) color = "#999";
    if(idx === selected) color = maxed ? "#aa9" : "yellow";

    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText((idx === selected ? "> " : "   ") + "[" + it.tag + "] " + itemName(it), L.x + 30, y);

    ctx.textAlign = "right";
    const lvText = itemLevelText(it);
    if(lvText) ctx.fillText(lvText, L.x + L.w - 130, y);
    ctx.fillText(maxed ? "MAXED" : cost + "g", L.x + L.w - 30, y);
  }

  ctx.fillStyle = "#888";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  if(shopScroll > 0) ctx.fillText("^ more ^", L.x + L.w / 2, L.y + L.listTop - 26);
  if(shopScroll + L.visible < shopItems.length){
    ctx.fillText("v more v", L.x + L.w / 2, L.y + L.listTop + L.visible * L.rowH - 8);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#ccc";
  ctx.font = "18px Arial";
  ctx.fillText(itemDesc(shopItems[selected]), L.x + 30, L.y + L.h - 80);

  if(performance.now() < shopNote.until){
    ctx.fillStyle = shopNote.text === "Bought!" ? "lime" : "tomato";
    ctx.fillText(shopNote.text, L.x + 30, L.y + L.h - 52);
  }

  ctx.fillStyle = "#aaa";
  ctx.font = "16px Arial";
  ctx.fillText("UP/DOWN = SELECT   ENTER = BUY   ESC or B = CLOSE", L.x + 30, L.y + L.h - 22);
}

let lastHud = "";
function updateHud(){
  const p = player;
  const dashStatus = p.dash.cdTimer > 0
    ? Math.round((1 - p.dash.cdTimer / p.dash.cooldown) * 100) + "%"
    : "READY";

  const text =
    "\u2764\uFE0F " + Math.floor(p.hp) + "/" + p.maxHp +
    " | \uD83D\uDCB0 " + p.gold +
    " | \uD83D\uDD2B " + p.damage +
    " | \uD83D\uDDE1\uFE0F " + SWORD_TIERS[p.sword.tier].name + " (" + swordDamage() + ")" +
    " | \uD83D\uDEE1\uFE0F " + p.armor + " (-" + Math.round(p.armor * ARMOR_REDUCTION * 100) + "%)" +
    " | \uD83C\uDFC3 " + (Math.round(p.speed * 10) / 10) +
    " | \uD83D\uDCA8 " + dashStatus +
    " | \uD83C\uDF0A Wave " + wave +
    " | \u2B50 " + p.level +
    " | \uD83D\uDC7A " + goblins.length +
    (challenge ? " | \uD83D\uDC51 EMPEROR\u00B2 next: \u00D7" + Math.pow(2, emperorKills) : "") +
    "\n[Left Click] Sword  [Right Click] Shoot  [Space] Dash  [B] Shop  [P] Pause" +
    (emperorKills > 0 && !challenge ? "  [G] EMPEROR\u00B2 CHALLENGE" : "");

  if(text !== lastHud){      // only touch the DOM when something changed
    uiEl.textContent = text;
    lastHud = text;
  }
}

function draw(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for(const c of coins){
    ctx.fillStyle = "gold";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // warnings under everything else
  drawMeteors();
  drawBossEffects();
  drawSquadTelegraph();

  for(const g of goblins) drawGoblin(g);
  drawEBullets();

  drawPlayer();

  ctx.fillStyle = "white";
  for(const b of bullets){
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for(const p of particles){
    ctx.globalAlpha = p.life / p.max;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  drawBossBar();

  if(paused && !shopOpen){
    ctx.fillStyle = "rgba(0,0,0,.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "60px Arial";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    ctx.font = "24px Arial";
    ctx.fillText("Press P To Resume", canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = "left";
  }

  if(shopOpen) drawShop();

  updateHud();
}
