"use strict";
/* ===== Drawing for the Emperor, enemy shots and the pack's strike warning ===== */

function drawEmperor(g){
  const ghost = g.atk && g.atk.name === "slam" && g.atk.t >= 50 && g.atk.t < 75;   // mid-leap

  ctx.save();
  if(ghost) ctx.globalAlpha = 0.35;

  const flash = g.windup && Math.floor(performance.now() / 50) % 2 === 0;
  if(g.windup) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

  const body = g.phase === 7 ? "hsl(" + (Math.floor(performance.now() / 8) % 360) + ",85%,60%)" : EMP_BODY[g.phase];
  ctx.shadowColor = g.phase >= 6 ? "#c020ff" : (g.phase === 3 ? "#ffe27a" : "#ffd700");
  ctx.shadowBlur = g.phase >= 3 ? 45 : 25;
  ctx.fillStyle = flash ? "orange" : body;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffd700";
  ctx.stroke();

  // crown
  ctx.fillStyle = "#ffd700";
  const by = g.y - g.r * 0.88;
  for(let i = 0; i < 5; i++){
    const cx = g.x + (i - 2) * g.r * 0.34;
    const h = (i % 2 === 0) ? g.r * 0.4 : g.r * 0.28;
    ctx.beginPath();
    ctx.moveTo(cx - g.r * 0.14, by);
    ctx.lineTo(cx, by - h);
    ctx.lineTo(cx + g.r * 0.14, by);
    ctx.closePath();
    ctx.fill();
  }

  // eyes
  const s = g.r / 20;
  ctx.fillStyle = EMP_EYES[g.phase];
  ctx.fillRect(g.x - 8 * s, g.y - 4 * s, 4 * s, 4 * s);
  ctx.fillRect(g.x + 4 * s, g.y - 4 * s, 4 * s, 4 * s);
  ctx.restore();

  // shield orbs
  for(let k = 0; k < g.orbCount; k++){
    emperorOrbPos(g, k, _orb);
    ctx.save();
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#6ff";
    ctx.beginPath();
    ctx.arc(_orb.x, _orb.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(_orb.x, _orb.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Beam + slam telegraphs (drawn under the goblins) */
function drawBossEffects(){
  const boss = goblins.find(g => g.kind === "emperor");
  if(!boss || !boss.atk) return;
  const a = boss.atk;

  if(a.name === "rays"){
    ctx.save();
    for(let k = 0; k < a.count; k++){
      const ang = emperorBeamAngle(a, k);
      const ex = boss.x + Math.cos(ang) * 2500;
      const ey = boss.y + Math.sin(ang) * 2500;

      if(a.t <= a.tele){
        ctx.strokeStyle = "rgba(255,220,80," + (0.35 + 0.35 * Math.sin(a.t * 0.4)) + ")";
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(ex, ey); ctx.stroke();
      }else{
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(120,255,255,.35)";
        ctx.lineWidth = 56;
        ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 20;
        ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(ex, ey); ctx.stroke();
      }
    }
    ctx.restore();
  }

  if(a.name === "gravity" && a.t > 0){
    ctx.save();
    ctx.strokeStyle = "rgba(190,60,255,.5)";
    ctx.lineWidth = 3;
    for(let i = 0; i < 4; i++){                         // rings collapsing inward
      const r = 520 - ((a.t * 5 + i * 130) % 520);
      ctx.beginPath(); ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    if(a.t > a.dur - 40){                               // detonation zone
      ctx.fillStyle = "rgba(255,0,60,.15)";
      ctx.beginPath(); ctx.arc(boss.x, boss.y, 260, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "red";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }

  if(a.name === "slam" && a.t <= 75){
    const prog = clamp(a.t / 75, 0, 1);
    ctx.fillStyle = "rgba(255,40,40," + (0.1 + 0.3 * prog) + ")";
    ctx.beginPath(); ctx.arc(a.tx, a.ty, 220, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(a.tx, a.ty, 220, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#ffd700";
    ctx.beginPath(); ctx.arc(a.tx, a.ty, 220 * prog, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawEBullets(){
  for(const b of eBullets){
    ctx.fillStyle = "#ff3df0";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Thin aim lines from every goblin that is currently winding up a dash */
function drawSquadTelegraph(){
  ctx.save();
  ctx.strokeStyle = "rgba(255,120,0,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let any = false;
  for(const g of goblins){
    if(g.dashState !== "wind") continue;
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(player.x, player.y);
    any = true;
  }
  if(any) ctx.stroke();
  ctx.restore();
}
