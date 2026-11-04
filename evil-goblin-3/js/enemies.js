"use strict";
/* ===== Goblins: spawning, damage, death, waves, Emperor^2 challenge ===== */

function goblinStats(){
  // fixed speeds - the pack AI (squad.js) is what makes them dangerous
  if(wave === 1) return { hp: 20, speed: 1.2, r: 18 };
  const lv = challenge ? emperorKills : 0;            // minions get beefier in the challenge
  return {
    hp: Math.round((200 + wave * 100) * (1 + 0.5 * lv)),
    speed: Math.min(4.2, 2.2 + wave * 0.12),
    r: 28
  };
}

function spawnGoblin(x, y){
  if(x === undefined){
    const side = Math.floor(Math.random() * 4);
    if(side === 0){ x = Math.random() * canvas.width; y = -50; }
    if(side === 1){ x = canvas.width + 50; y = Math.random() * canvas.height; }
    if(side === 2){ x = Math.random() * canvas.width; y = canvas.height + 50; }
    if(side === 3){ x = -50; y = Math.random() * canvas.height; }
  }

  const st = goblinStats();
  const hunter = Math.random() < 0.2;

  goblins.push({
    x, y,
    hp: st.hp,
    speed: st.speed * (hunter ? 1.15 : 1),
    r: st.r,
    role: hunter ? "hunter" : "flanker",
    slotAngle: undefined, slotRing: 0,
    ux: 0, uy: 0, strikeSpeed: 0, strikeLeft: 0,
    dashState: "idle", windLeft: 0,
    dashCd: nextDashCd()            // each goblin gets its own random cooldown
  });
}

function spawnKing(){
  const maxHp = 15000 * (wave / 5);
  goblins.push({
    x: canvas.width / 2,
    y: -100,
    hp: maxHp,
    maxHp,
    speed: 4 + wave * 0.4,
    r: 90,
    boss: true,
    kind: "king",
    title: "GOBLIN KING",
    reward: 500,
    phase: 1,
    meteorCooldown: 180,
    dashCooldown: 300,
    streamTimer: 0,
    targetTimer: 0,
    chainLeft: 0,
    chainTimer: 0
  });
}

/* Emperor + his escort (used by wave 10, wave 20 and every challenge round) */
function spawnChallengeWave(){
  spawnEmperor();
  for(let i = 0; i < 15 + wave; i++) spawnGoblin();
}

function spawnWave(){
  if(wave % 10 === 0){
    if(wave >= 20) challenge = true;       // wave 20: Emperor^2 starts automatically
    spawnChallengeWave();
    return;
  }

  if(wave % 5 === 0){
    spawnKing();
    for(let i = 0; i < 15 + wave; i++) spawnGoblin();
    return;
  }

  const amount = wave === 1 ? 5 : 15 + wave * 5;
  for(let i = 0; i < amount; i++) spawnGoblin();
}

function clearField(){
  goblins.length = 0;
  meteors.length = 0;
  eBullets.length = 0;
  bullets.length = 0;
  squad.lastCount = -1;
}

/* G key: jump straight into the Emperor^2 challenge */
function tryStartChallenge(){
  if(challenge || gameOver) return;
  if(emperorKills < 1){
    showMessage("Beat the Goblin Emperor first!", 1500);
    return;
  }
  if(goblins.some(g => g.boss)){
    showMessage("Finish the boss fight first!", 1500);
    return;
  }

  challenge = true;
  clearField();
  showMessage("EMPEROR\u00B2 CHALLENGE<br><span style='font-size:28px'>Each kill doubles his power</span>", 2000);
  spawnDelay = 90;
}

/* All damage to goblins goes through here so boss phases can't be skipped */
function damageGoblin(g, amount){
  g.hp -= amount;
  if(!g.boss) return;

  if(g.kind === "emperor"){
    // Each Emperor phase is a full health bar: "dying" starts the next phase (no reward)
    if(g.hp <= 0 && g.phase < EMP_PHASES) emperorNextPhase(g);
  }else{
    if(g.phase === 1 && g.hp <= g.maxHp * 0.5) startPhase2(g);
    if(g.phase === 2 && g.hp <= g.maxHp * 0.1) startPhase3(g);
  }
}

/* Removes dead goblins, drops loot, starts the next wave when the field is clear */
function reapDead(){
  let killed = false;
  let emperorDown = false;

  for(let j = goblins.length - 1; j >= 0; j--){
    const g = goblins[j];
    if(g.hp > 0) continue;

    coins.push({ x: g.x, y: g.y, r: 10 });
    explode(g.x, g.y, "lime");
    goblins.splice(j, 1);

    player.kills++;
    player.gold += Math.round((g.boss ? (g.reward || 500) : 5) * player.goldMult);
    if(g.boss) eBullets.length = 0;
    if(g.kind === "emperor") emperorDown = true;
    killed = true;
  }

  if(emperorDown){
    emperorKills++;
    if(challenge){
      showMessage("EMPEROR DEFEATED<br><span style='font-size:28px'>Next: \u00D7" + Math.pow(2, emperorKills) + " power</span>", 2500);
    }else{
      showMessage(
        "THE GOBLIN EMPEROR<br>HAS FALLEN!<br>" +
        "<span style='font-size:26px'>Keep playing to wave 20, or press G for the EMPEROR\u00B2 challenge</span>", 7000);
    }
  }

  if(killed && goblins.length === 0){
    eBullets.length = 0;
    squad.lastCount = -1;

    if(challenge){
      spawnDelay = 150;                    // same wave, bigger Emperor
    }else{
      wave++;
      player.gold += 10;
      spawnWave();
    }
  }
}

function updateGoblins(){
  for(const g of goblins){

    if(g.boss){
      if(g.kind === "emperor") updateEmperor(g);
      else updateBossAttacks(g);

      if(!g.moveLock){
        const dx = player.x - g.x;
        const dy = player.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        g.x += dx / d * g.speed;
        g.y += dy / d * g.speed;
      }
    }else{
      moveSquadGoblin(g);
    }

    const d = Math.hypot(player.x - g.x, player.y - g.y);
    if(d < g.r + player.size){
      const damage = 0.25;                       // armor is applied inside hurtPlayer()

      if(wave === 1){
        hurtPlayer(damage);
      }else{
        hurtPlayer(damage * 4);
        if(Math.random() < 0.01) hurtPlayer(20);
      }
    }
  }
}
