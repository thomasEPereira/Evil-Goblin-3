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

  drawVignette();
  drawHud();
  drawBossBar();

  if(shopOpen) drawShop();
  else if(statsOpen) drawStatsMenu();
  else if(paused) drawPauseScreen();
}
