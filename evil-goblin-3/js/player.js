"use strict";
/* ===== Player: movement, dash (Space), sword (left click), taking damage ===== */

function swordDamage(){
  const s = player.sword;
  return (SWORD_TIERS[s.tier].dmg + s.extraDmg) * s.dmgMult;
}
function swordRange(){
  const s = player.sword;
  return SWORD_TIERS[s.tier].range + s.extraRange;
}

function hurtPlayer(amount){
  if(player.invuln > 0) return;
  player.hp -= amount * (1 - ARMOR_REDUCTION * player.armor);   // armor cuts ALL damage
  // big hits give a short grace period so stacked attacks aren't instant death
  if(amount >= 15) player.invuln = Math.max(player.invuln, 20);
}

/* ---------- Dash (Space) ---------- */
function tryDash(){
  const d = player.dash;
  if(d.cdTimer > 0 || d.timer > 0) return;

  let dx = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
  let dy = (keys["s"] ? 1 : 0) - (keys["w"] ? 1 : 0);
  if(!dx && !dy){               // standing still: dash toward the mouse
    dx = mouse.x - player.x;
    dy = mouse.y - player.y;
  }
  const len = Math.hypot(dx, dy) || 1;

  d.dx = dx / len;
  d.dy = dy / len;
  d.timer = d.duration;
  d.cdTimer = d.cooldown;
  d.hit = new Set();
  player.invuln = Math.max(player.invuln, d.duration + 6);   // i-frames
}

function dashShockwave(){
  const d = player.dash;
  const dmg = swordDamage() * d.shockMult;
  for(const g of goblins){
    if(d.hit.has(g)) continue;
    if(Math.hypot(player.x - g.x, player.y - g.y) < g.r + player.size){
      d.hit.add(g);
      damageGoblin(g, dmg);
      explode(g.x, g.y, "deepskyblue");
    }
  }
}

/* ---------- Sword (left click) ---------- */
function trySwing(){
  const s = player.sword;
  if(s.cdTimer > 0) return;

  s.cdTimer = s.cooldown;
  s.swing = s.swingTime;
  s.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  s.arc = s.whirlwind ? Math.PI * 2 : SWORD_ARC;

  const range = swordRange();
  const dmg = swordDamage();
  let hits = 0;

  for(const g of goblins){
    const dx = g.x - player.x;
    const dy = g.y - player.y;
    const dist = Math.hypot(dx, dy);
    if(dist > range + g.r) continue;

    // arc check (skip if we're basically touching the enemy)
    if(!s.whirlwind && dist > g.r + player.size){
      if(Math.abs(angleDiff(Math.atan2(dy, dx), s.angle)) > s.arc / 2) continue;
    }

    damageGoblin(g, dmg);
    hits++;
    explode(g.x, g.y, SWORD_TIERS[s.tier].color);

    if(!g.boss && dist > 0){      // knockback
      g.x += dx / dist * 40;
      g.y += dy / dist * 40;
    }
  }

  if(hits > 0 && s.lifesteal > 0){
    player.hp = Math.min(player.maxHp, player.hp + s.lifesteal * Math.min(hits, 5));
  }
  reapDead();
}

/* ---------- Per-frame update ---------- */
function updatePlayer(){
  const p = player, d = p.dash, s = p.sword;

  if(keys[" "]) tryDash();
  if(mouse.left) trySwing();

  const ox = p.x, oy = p.y;

  if(d.timer > 0){
    const steps = Math.ceil(d.speed / 10);      // sub-steps so we can't tunnel through enemies
    const sp = d.speed / steps;
    for(let i = 0; i < steps; i++){
      p.x += d.dx * sp;
      p.y += d.dy * sp;
      if(d.shockwave) dashShockwave();
    }
    d.timer--;
    trailPuff(p.x, p.y, "deepskyblue", p.size, 12);
  }else{
    if(keys["w"]) p.y -= p.speed;
    if(keys["s"]) p.y += p.speed;
    if(keys["a"]) p.x -= p.speed;
    if(keys["d"]) p.x += p.speed;
  }

  p.x = clamp(p.x, 0, canvas.width);
  p.y = clamp(p.y, 0, canvas.height);

  p.vx = p.vx * 0.85 + (p.x - ox) * 0.15;
  p.vy = p.vy * 0.85 + (p.y - oy) * 0.15;

  if(d.cdTimer > 0) d.cdTimer--;
  if(s.cdTimer > 0) s.cdTimer--;
  if(s.swing > 0) s.swing--;
  if(p.invuln > 0) p.invuln--;

  if(p.regen > 0 && p.hp < p.maxHp){
    p.hp = Math.min(p.maxHp, p.hp + p.regen);
  }
}

function updateBullets(){
  for(let i = bullets.length - 1; i >= 0; i--){
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if(b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height){
      bullets.splice(i, 1);
      continue;
    }

    for(const g of goblins){
      if(b.hit.has(g)) continue;
      if(Math.hypot(b.x - g.x, b.y - g.y) < g.r){
        damageGoblin(g, b.damage);
        b.hit.add(g);
        if(b.pierce > 0){
          b.pierce--;
        }else{
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }
  reapDead();
}

function updateCoins(){
  for(let i = coins.length - 1; i >= 0; i--){
    const c = coins[i];
    if(Math.hypot(player.x - c.x, player.y - c.y) < player.magnet){
      player.gold += 10;
      explode(c.x, c.y, "gold");
      coins.splice(i, 1);
    }
  }
}

function updateParticles(){
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if(--p.life <= 0) particles.splice(i, 1);
  }
}
