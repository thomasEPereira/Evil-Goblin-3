"use strict";
/* ===== Goblin pack AI =====
   POSITIONING (the "trap"):
     flankers  spread into rings around you. The ring is centered slightly AHEAD of where
               you're running, breathes in and out, and gets pushed against walls.
     hunters   (~20%) chase where you're HEADING and herd you toward the ring.

   DASHING (every small goblin, each on its own timer):
     idle -> cooldown ticks (random per goblin, DASH_MIN..DASH_MAX frames, so they never sync up)
          -> WINDUP  flashes orange + shakes (your warning)
          -> DASH    locks onto where you were at the end of the windup and lunges in a line
          -> new random cooldown
*/

const DASH_MIN = 90;          // frames (60 = 1 second)
const DASH_MAX = 240;
const DASH_WINDUP = 30;
const DASH_RANGE = 420;       // only dash when you're this close

const squad = { timer: 0, ringR: 300, lastCount: -1 };
const _t = { x: 0, y: 0 };
const _c = { x: 0, y: 0 };

function nextDashCd(){
  const mult = wave === 1 ? 1.6 : 1;                    // wave 1 is a bit gentler
  return (DASH_MIN + Math.random() * (DASH_MAX - DASH_MIN)) * mult;
}

function squadCenter(lead, out){
  out.x = clamp(player.x + clamp(player.vx * lead, -120, 120), 0, canvas.width);
  out.y = clamp(player.y + clamp(player.vy * lead, -120, 120), 0, canvas.height);
}

function slotTarget(g, out){
  squadCenter(14, _c);
  const R = squad.ringR + g.slotRing * 60;
  out.x = clamp(_c.x + Math.cos(g.slotAngle) * R, 20, canvas.width - 20);
  out.y = clamp(_c.y + Math.sin(g.slotAngle) * R, 20, canvas.height - 20);
}

/* Spread flankers evenly around the player; extra rings when there are lots of them */
function assignSlots(flankers){
  squadCenter(14, _c);
  for(const g of flankers){
    g.dp = Math.hypot(g.x - _c.x, g.y - _c.y);
    g.ang = Math.atan2(g.y - _c.y, g.x - _c.x);
  }
  flankers.sort((a, b) => a.dp - b.dp);

  let idx = 0, ring = 0;
  while(idx < flankers.length){
    const radius = squad.ringR + ring * 60;
    const cap = Math.max(4, Math.floor(Math.PI * 2 * radius / 58));
    const group = flankers.slice(idx, idx + cap);
    group.sort((a, b) => a.ang - b.ang);

    for(let i = 0; i < group.length; i++){
      group[i].slotAngle = group[0].ang + i * Math.PI * 2 / group.length;
      group[i].slotRing = ring;
    }
    idx += cap;
    ring++;
  }
}

function updateSquad(){
  squad.timer++;
  squad.ringR = 150 + 150 * (0.5 + 0.5 * Math.cos(squad.timer * 0.006));   // breathes 150..300

  const flankers = [];
  for(const g of goblins){
    if(!g.boss && g.role !== "hunter") flankers.push(g);
  }

  if(flankers.length !== squad.lastCount || squad.timer % 20 === 0){
    assignSlots(flankers);
    squad.lastCount = flankers.length;
  }
}

function chasePoint(g, tx, ty, speed){
  const dx = tx - g.x, dy = ty - g.y;
  const d = Math.hypot(dx, dy) || 1;
  const step = Math.min(speed, d);
  g.x += dx / d * step;
  g.y += dy / d * step;
}

function moveSquadGoblin(g){

  /* ---- windup: stand still, flash + shake ---- */
  if(g.dashState === "wind"){
    g.x += (Math.random() - 0.5) * 3;
    g.y += (Math.random() - 0.5) * 3;

    if(--g.windLeft <= 0){                       // lock on and go
      const lx = clamp(player.x + player.vx * 8, 0, canvas.width);
      const ly = clamp(player.y + player.vy * 8, 0, canvas.height);
      const dx = lx - g.x, dy = ly - g.y;
      const d = Math.hypot(dx, dy) || 1;
      g.ux = dx / d;
      g.uy = dy / d;
      g.strikeSpeed = Math.max(5, g.speed * 2.2);
      g.strikeLeft = Math.ceil((d + 90) / g.strikeSpeed);
      g.dashState = "dash";
    }
    return;
  }

  /* ---- dashing: straight line, no steering ---- */
  if(g.dashState === "dash"){
    g.x += g.ux * g.strikeSpeed;
    g.y += g.uy * g.strikeSpeed;
    if(particles.length < 300 && g.strikeLeft % 2 === 0) trailPuff(g.x, g.y, "orange", g.r, 8);

    if(--g.strikeLeft <= 0){
      g.dashState = "idle";
      g.dashCd = nextDashCd();
    }
    return;
  }

  /* ---- idle: tick the personal cooldown, start a windup when ready + in range ---- */
  if(g.dashCd > 0){
    g.dashCd--;
  }else if(
    g.x > 0 && g.x < canvas.width && g.y > 0 && g.y < canvas.height &&
    Math.hypot(player.x - g.x, player.y - g.y) < DASH_RANGE
  ){
    g.dashState = "wind";
    g.windLeft = DASH_WINDUP;
    return;
  }

  /* ---- positioning ---- */
  if(g.role === "hunter"){
    chasePoint(g,
      player.x + clamp(player.vx * 20, -150, 150),
      player.y + clamp(player.vy * 20, -150, 150),
      g.speed);
    return;
  }

  if(g.slotAngle === undefined){                // just spawned, no slot yet
    chasePoint(g, player.x, player.y, g.speed);
    return;
  }
  slotTarget(g, _t);
  chasePoint(g, _t.x, _t.y, g.speed * 1.4);
}
