"use strict";
/* ===== THE GOBLIN EMPEROR (wave 10 boss, and the Emperor^2 challenge) =====

   7 phases. Each phase is a FULL health bar: when it hits 0 he heals to full and starts the
   next phase (no reward - you only get paid for the 7th). Mechanics stack as phases go up:

   1  Throne        3 orbs. Rays, Starfall, Legion Call, Throne Slam
   2  Phase 2       5 orbs. + Spiral Barrage
   3  Ascended      8 orbs, 4 rays, much faster attacks
   4  Warlord       + Imperial Charge (chain dashes with windups)
   5  Tempest       + constant meteor drizzle, 5 rays, 4-arm spirals
   6  The Void      + Gravity Well (drags you in, then detonates)
   7  Final Form    + passive spiral shots, 12 orbs, 6 rays, 5-dash charges, fastest everything

   Emperor^2: every Emperor kill doubles the next one's power:
     HP x2^k, damage +40% per doubling (all of it: attacks, orbs, shards, dashes, contact),
     shorter cooldowns, tougher escorts, bigger reward.
*/

const EMP_PHASES = 7;
const EMP_BASE_HP = 15000;                                   // phase 1 bar (grows 20% per phase)
const EMP_NAMES    = ["", "", "", "ASCENDED", "WARLORD", "TEMPEST", "THE VOID", "FINAL FORM"];
const EMP_SPEED    = [0, 1.3, 1.7, 2.2, 2.5, 2.8, 3.0, 3.4];
const EMP_ORBS     = [0, 3, 5, 8, 8, 10, 10, 12];
const EMP_COOLDOWN = [0, 150, 110, 70, 60, 55, 50, 40];     // frames between attacks
const EMP_RAYS     = [0, 2, 3, 4, 4, 5, 5, 6];
const EMP_BODY     = ["", "#5b1a9a", "#a01530", "#f5f0d0", "#1f6f8b", "#27308f", "#0a0a0a", "#ffffff"];
const EMP_EYES     = ["", "#ffd700", "#ff9a00", "#1a1a1a", "#ffe27a", "#99ccff", "#ff2bd6", "#000000"];
const EMP_BAR      = ["", "#9b30ff", "#e0203a", "#ffe27a", "#2fb4d6", "#4a5cff", "#c020ff", "#ff7a00"];

function empPhaseHp(level, phase){
  return Math.round(EMP_BASE_HP * (1 + 0.2 * (phase - 1)) * Math.pow(2, level));
}

/* Boss damage: +40% per challenge doubling, +8% per phase */
const EMP_LEVEL_DMG = 0.4;
function empMult(g){
  return (1 + EMP_LEVEL_DMG * g.level) * (1 + 0.08 * (g.phase - 1));
}
function empDmg(g, base){
  return Math.round(base * empMult(g));
}

function spawnEmperor(){
  const level = emperorKills;              // 0 for the first fight, then 1, 2, 3...
  const power = Math.pow(2, level);
  const maxHp = empPhaseHp(level, 1);

  goblins.push({
    x: canvas.width / 2,
    y: -150,
    hp: maxHp,
    maxHp,
    speed: EMP_SPEED[1],
    r: 110,
    boss: true,
    kind: "emperor",
    title: level > 0 ? "GOBLIN EMPEROR \u00D7" + power : "THE GOBLIN EMPEROR",
    reward: 1500 * power,
    level,
    phase: 1,
    attackTimer: 120,
    atk: null,
    lastAtk: "",
    orbAngle: 0,
    orbCount: EMP_ORBS[1],
    moveLock: false,
    windup: false,
    dashA: null,
    drizzleT: 60,
    passT: 0,
    passAngle: 0
  });

  showMessage(level > 0
    ? "EMPEROR\u00B2 \u00D7" + power + "<br>HAS ARRIVED"
    : "THE GOBLIN EMPEROR<br>HAS ARRIVED", 2500);
}

/* ---------- enemy projectiles ---------- */
function fireShard(x, y, angle, speed, dmg){
  if(eBullets.length > 500) return;
  eBullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 7, dmg, life: 300
  });
}

function emperorNova(g, count, speed){
  const off = Math.random() * Math.PI * 2;
  const dmg = empDmg(g, 18);
  for(let i = 0; i < count; i++){
    fireShard(g.x, g.y, off + i * Math.PI * 2 / count, speed, dmg);
  }
}

function updateEBullets(){
  for(let i = eBullets.length - 1; i >= 0; i--){
    const b = eBullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if(--b.life <= 0 || b.x < -60 || b.x > canvas.width + 60 || b.y < -60 || b.y > canvas.height + 60){
      eBullets.splice(i, 1);
      continue;
    }

    // shards pass harmlessly through you while you have i-frames (dash through them!)
    if(player.invuln === 0 && Math.hypot(player.x - b.x, player.y - b.y) < b.r + player.size / 2){
      hurtPlayer(b.dmg);
      eBullets.splice(i, 1);
    }
  }
}

/* ---------- phase change: called when a health bar hits 0 ---------- */
function emperorNextPhase(g){
  g.phase++;
  g.maxHp = empPhaseHp(g.level, g.phase);
  g.hp = g.maxHp;                          // full heal, no death reward
  g.atk = null;
  g.dashA = null;
  g.attackTimer = 60;
  g.orbCount = EMP_ORBS[g.phase];
  g.speed = EMP_SPEED[g.phase];

  player.invuln = Math.max(player.invuln, 30);
  eBullets.length = 0;

  showMessage(
    "THE GOBLIN EMPEROR<br>PHASE " + g.phase + "/" + EMP_PHASES +
    "<br><span style='font-size:30px'>" + (EMP_NAMES[g.phase] || "") + "</span>", 2500);

  emperorNova(g, 18 + g.phase * 4, 4 + g.phase * 0.2);
  for(let i = 0; i < 8 + g.phase * 2 && goblins.length < 120; i++) spawnGoblin();
  for(let i = 0; i < 8; i++){
    explode(g.x + (Math.random() - 0.5) * 160, g.y + (Math.random() - 0.5) * 160, "#ffd700");
  }
}

/* ---------- orbs ---------- */
function emperorOrbPos(g, k, out){
  const a = g.orbAngle + k * Math.PI * 2 / g.orbCount;
  const R = g.r + 55;
  out.x = g.x + Math.cos(a) * R;
  out.y = g.y + Math.sin(a) * R;
}

const _orb = { x: 0, y: 0 };

/* ---------- attacks ---------- */
function emperorBeamAngle(a, k){
  return a.a0 + (a.t > a.tele ? a.rot * (a.t - a.tele) : 0) + k * Math.PI * 2 / a.count;
}

function emperorStarfall(g){
  const lines = Math.min(4, 1 + Math.ceil(g.phase / 2));
  const sp = 110;
  const dmg = empDmg(g, 45);

  for(let l = 0; l < lines; l++){
    const horiz = l % 2 === 0;
    const len = horiz ? canvas.width : canvas.height;
    const across = horiz ? canvas.height : canvas.width;
    const n = Math.ceil(len / sp) + 1;
    const gap = Math.floor(Math.random() * Math.max(1, n - 2));

    // first two lines are aimed near you, the rest are random
    let pos = Math.random() * (across - 80) + 40;
    if(l < 2) pos = clamp((horiz ? player.y : player.x) + (Math.random() - 0.5) * 100, 40, across - 40);

    for(let i = 0; i < n; i++){
      if(i === gap || i === gap + 1) continue;      // the safe gap
      const a = i * sp;
      spawnMeteor(horiz ? a : pos, horiz ? pos : a, 70 + i * 3, dmg);
    }
  }
}

function emperorLegion(g){
  const count = Math.min(30, 10 + g.phase * 4);
  for(let i = 0; i < count && goblins.length < 120; i++){
    const a = Math.random() * Math.PI * 2;
    const d = 130 + Math.random() * 100;
    const x = clamp(g.x + Math.cos(a) * d, 30, canvas.width - 30);
    const y = clamp(g.y + Math.sin(a) * d, 30, canvas.height - 30);
    spawnGoblin(x, y);
    explode(x, y, "#a020f0");
  }
}

function emperorStartAttack(g){
  const pool = ["rays", "starfall", "legion", "slam"];
  if(g.phase >= 2) pool.push("spiral");
  if(g.phase >= 4) pool.push("charge");
  if(g.phase >= 6) pool.push("gravity");

  let name;
  do{ name = pool[Math.floor(Math.random() * pool.length)]; }
  while(name === g.lastAtk);
  g.lastAtk = name;

  const a = { name, t: 0 };

  if(name === "rays"){
    a.tele = Math.max(40, 70 - (g.phase - 1) * 4);
    a.active = 100;
    a.count = EMP_RAYS[g.phase];
    a.a0 = Math.atan2(player.y - g.y, player.x - g.x);
    a.rot = (Math.random() < 0.5 ? 1 : -1) * 0.01 * (1 + 0.12 * (g.phase - 1));
  }
  else if(name === "starfall"){
    a.name = "wait"; a.dur = 100;
    a.pre = 22; a.fire = () => emperorStarfall(g);
  }
  else if(name === "legion"){
    a.name = "wait"; a.dur = 40;
    a.pre = 22; a.fire = () => emperorLegion(g);
  }
  else if(name === "slam"){
    a.tx = player.x;
    a.ty = player.y;
  }
  else if(name === "spiral"){
    a.dur = 130;
    a.pre = 22;
    a.base = Math.random() * Math.PI * 2;
  }
  else if(name === "charge"){            // chain of windup-dashes (uses the King's dash code)
    a.left = g.phase >= 7 ? 5 : 3;
    a.gap = 0;
  }
  else if(name === "gravity"){
    a.dur = 150;
    a.pre = 20;
  }

  g.atk = a;
}

function emperorEndAttack(g){
  g.atk = null;
  const mult = Math.max(0.4, 1 - 0.08 * g.level);        // challenge: shorter downtime
  g.attackTimer = Math.round(EMP_COOLDOWN[g.phase] * mult);
}

function emperorRunAttack(g){
  const a = g.atk;

  // quick windup (flash + shake) before attacks that have no other warning
  if(a.pre > 0){
    g.moveLock = true;
    g.windup = true;
    if(--a.pre === 0 && a.fire) a.fire();
    return;
  }

  a.t++;

  if(a.name === "wait"){
    if(a.t >= a.dur) emperorEndAttack(g);
  }
  else if(a.name === "rays"){
    g.moveLock = true;
    if(a.t > a.tele){
      const dmg = empDmg(g, 25);
      for(let k = 0; k < a.count; k++){
        const ang = emperorBeamAngle(a, k);
        const c = Math.cos(ang), s = Math.sin(ang);
        const dx = player.x - g.x, dy = player.y - g.y;
        const along = dx * c + dy * s;
        if(along > 0 && Math.abs(-dx * s + dy * c) < 16 + player.size / 2) hurtPlayer(dmg);
      }
    }
    if(a.t >= a.tele + a.active) emperorEndAttack(g);
  }
  else if(a.name === "slam"){
    g.moveLock = true;
    if(a.t <= 50){ a.tx = player.x; a.ty = player.y; }     // tracks you, then locks
    if(a.t === 75){
      g.x = clamp(a.tx, 0, canvas.width);
      g.y = clamp(a.ty, 0, canvas.height);
      if(Math.hypot(player.x - g.x, player.y - g.y) < 220) hurtPlayer(empDmg(g, 60));
      for(let i = 0; i < 4; i++){
        explode(g.x + (Math.random() - 0.5) * 200, g.y + (Math.random() - 0.5) * 200, "#ffd700");
      }
      emperorNova(g, 12 + g.phase * 4, 4.2);
    }
    if(a.t >= 85) emperorEndAttack(g);
  }
  else if(a.name === "spiral"){
    if(a.t % 3 === 0){
      const arms = Math.min(5, g.phase === 2 ? 2 : (g.phase <= 4 ? 3 : (g.phase <= 6 ? 4 : 5)));
      const dmg = empDmg(g, 18);
      for(let k = 0; k < arms; k++){
        fireShard(g.x, g.y, a.base + a.t * 0.09 + k * Math.PI * 2 / arms, 4.2, dmg);
      }
    }
    if(a.t >= a.dur) emperorEndAttack(g);
  }
  else if(a.name === "charge"){
    if(!g.dashA){
      if(a.left > 0){
        if(--a.gap <= 0){
          beginBossDash(g, empDmg(g, 45), 14);
          a.left--;
          a.gap = 8;
        }
      }else{
        emperorEndAttack(g);
      }
    }
  }
  else if(a.name === "gravity"){
    g.moveLock = true;
    g.orbAngle += 0.03;                                    // orbs whip around faster

    const dx = g.x - player.x, dy = g.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    player.x = clamp(player.x + dx / d * 2.4, 0, canvas.width);   // the pull (you can outrun it, or dash)
    player.y = clamp(player.y + dy / d * 2.4, 0, canvas.height);

    if(a.t >= a.dur){
      if(d < 260) hurtPlayer(empDmg(g, 55));
      emperorNova(g, 24, 4.5);
      for(let i = 0; i < 6; i++){
        explode(g.x + (Math.random() - 0.5) * 220, g.y + (Math.random() - 0.5) * 220, "#c020ff");
      }
      emperorEndAttack(g);
    }
  }
}

function updateEmperor(g){
  g.moveLock = false;
  g.windup = false;
  if(g.dashA) runBossDash(g);

  g.orbAngle += 0.025 + g.phase * 0.01;

  const orbDmg = empDmg(g, 20);
  for(let k = 0; k < g.orbCount; k++){
    emperorOrbPos(g, k, _orb);
    if(Math.hypot(player.x - _orb.x, player.y - _orb.y) < 16 + player.size / 2) hurtPlayer(orbDmg);
  }

  // phase 5+: constant meteor drizzle
  if(g.phase >= 5 && --g.drizzleT <= 0){
    g.drizzleT = g.phase >= 7 ? 18 : 28;
    spawnMeteor(Math.random() * canvas.width, Math.random() * canvas.height, 70, empDmg(g, 45));
  }

  // phase 7: a slow passive spiral on top of everything else
  if(g.phase >= 7 && --g.passT <= 0){
    g.passT = 12;
    g.passAngle += 0.55;
    const dmg = empDmg(g, 18);
    fireShard(g.x, g.y, g.passAngle, 3.5, dmg);
    fireShard(g.x, g.y, g.passAngle + Math.PI, 3.5, dmg);
  }

  if(g.atk) emperorRunAttack(g);
  else if(--g.attackTimer <= 0 && !g.dashA) emperorStartAttack(g);
}
