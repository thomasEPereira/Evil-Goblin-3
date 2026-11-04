"use strict";
/* ===== Goblin King: 3 phases + meteors + telegraphed dashes ===== */

function spawnMeteor(x, y, timer, dmg){
  meteors.push({ x, y, timer, max: timer, dmg });
}

function randomMeteors(count, timer, dmg){
  for(let i = 0; i < count; i++){
    spawnMeteor(Math.random() * canvas.width, Math.random() * canvas.height, timer, dmg);
  }
}

function startPhase2(g){
  g.phase = 2;
  g.speed *= 2;

  showMessage("GOBLIN KING<br>PHASE 2", 2000);

  for(let i = 0; i < 40; i++) spawnGoblin();
  randomMeteors(20, 90, 75);
}

function startPhase3(g){
  g.phase = 3;
  g.hp = g.maxHp;               // full heal
  g.dashA = null;
  g.chainLeft = 0;
  g.chainTimer = 0;
  g.dashCooldown = 90;
  g.streamTimer = 30;
  g.targetTimer = 60;

  showMessage("GOBLIN KING<br>FINAL PHASE", 2500);

  for(let i = 0; i < 20; i++) spawnGoblin();
  for(let i = 0; i < 6; i++) explode(g.x, g.y, "#a020f0");
}

/* ---------- Dash: windup (flash + shake, faster than the small goblins) -> quick slide ---------- */
function beginBossDash(g, dmg, wind){
  g.dashA = { wind, dmg, n: 5, slide: 0, sx: 0, sy: 0, ex: 0, ey: 0 };
  g.moveLock = true;
}

function runBossDash(g){
  const a = g.dashA;
  g.moveLock = true;

  if(a.wind > 0){
    g.windup = true;
    if(--a.wind === 0){                       // lock the target at the end of the windup
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      a.sx = g.x;
      a.sy = g.y;
      a.ex = clamp(g.x + dx / d * 250, 0, canvas.width);
      a.ey = clamp(g.y + dy / d * 250, 0, canvas.height);
      a.slide = a.n;
    }
    return;
  }

  g.x += (a.ex - a.sx) / a.n;
  g.y += (a.ey - a.sy) / a.n;
  trailPuff(g.x, g.y, g.phase === 3 ? "#a020f0" : "orange", 26, 18);

  if(Math.hypot(player.x - g.x, player.y - g.y) < g.r + 30) hurtPlayer(a.dmg);

  if(--a.slide <= 0) g.dashA = null;
}

function updateBossAttacks(g){
  g.windup = false;
  g.moveLock = false;
  if(g.dashA) runBossDash(g);

  /* ---- Phase 3: constant meteors + chain dashes ---- */
  if(g.phase === 3){
    if(--g.streamTimer <= 0){
      g.streamTimer = 14;
      spawnMeteor(Math.random() * canvas.width, Math.random() * canvas.height, 70, 50);
    }

    if(--g.targetTimer <= 0){          // one lands right next to you
      g.targetTimer = 60;
      spawnMeteor(
        player.x + (Math.random() - 0.5) * 120,
        player.y + (Math.random() - 0.5) * 120,
        60, 50
      );
    }

    if(g.chainLeft > 0){
      if(!g.dashA && --g.chainTimer <= 0){
        beginBossDash(g, 50, 12);       // quick windup, then the slide
        g.chainLeft--;
        g.chainTimer = 6;
        if(g.chainLeft === 0) g.dashCooldown = 150;
      }
    }else if(!g.dashA && --g.dashCooldown <= 0){
      g.chainLeft = 5;                 // 5 dashes in a row
      g.chainTimer = 0;
    }
    return;
  }

  /* ---- Phase 1 & 2 ---- */
  if(--g.meteorCooldown <= 0){
    g.meteorCooldown = g.phase === 1 ? 300 : 150;
    randomMeteors(6, 120, g.phase === 2 ? 75 : 40);
    if(g.phase === 2){
      for(let i = 0; i < 5; i++) spawnGoblin();
    }
  }

  if(!g.dashA && --g.dashCooldown <= 0){
    g.dashCooldown = g.phase === 1 ? 300 : 120;
    beginBossDash(g, 35, 20);
  }
}

function updateMeteors(){
  for(let i = meteors.length - 1; i >= 0; i--){
    const m = meteors[i];
    if(--m.timer > 0) continue;

    if(Math.hypot(player.x - m.x, player.y - m.y) < 80) hurtPlayer(m.dmg);
    explode(m.x, m.y, "orange");
    meteors.splice(i, 1);
  }
}
