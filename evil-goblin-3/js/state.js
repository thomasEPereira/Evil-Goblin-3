"use strict";
/* ===== Shared game state, constants and small helpers ===== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const msgEl = document.getElementById("message");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

function angleDiff(a, b){
  let d = a - b;
  while(d > Math.PI) d -= Math.PI * 2;
  while(d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* Sword tiers: buy "Forge Sword" in the shop to climb them */
const SWORD_TIERS = [
  { name:"Wooden Sword",     color:"#c8a165", dmg:60,   range:85  },
  { name:"Iron Sword",       color:"#c0c7d1", dmg:120,  range:95  },
  { name:"Steel Sword",      color:"#9fd4ff", dmg:220,  range:110 },
  { name:"Mythril Sword",    color:"#5cf2c4", dmg:400,  range:125 },
  { name:"Dragonfang Blade", color:"#ff6a3d", dmg:700,  range:140 },
  { name:"Excalibur",        color:"#ffe14d", dmg:1200, range:160 }
];
const SWORD_UPGRADE_COSTS = [60, 120, 250, 500, 1000];
const SWORD_ARC = Math.PI * 0.9;

/* Hard caps */
const MAX_HP_CAP = 1000;
const ARMOR_CAP = 40;
const ARMOR_REDUCTION = 0.0175;   // each armor point = -1.75% damage taken from everything (40 armor = -70%)

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 25,
  hp: 100,
  maxHp: 100,
  gold: 0,
  damage: 10,        // ranged (click) damage
  armor: 0,
  speed: 4,
  kills: 0,
  level: 1,
  regen: 0,          // hp per frame
  magnet: 35,        // coin pickup radius
  goldMult: 1,
  multishot: 1,
  pierce: 0,
  invuln: 0,         // i-frames (frames left)
  vx: 0, vy: 0,      // smoothed velocity (the goblin pack uses it to predict you)

  dash: {            // Space
    cooldown: 70,
    cdTimer: 0,
    speed: 20,       // px per frame while dashing
    duration: 8,     // frames
    timer: 0,
    dx: 1, dy: 0,
    shockwave: false,
    shockMult: 0.5,        // dash damage as a fraction of sword damage
    hit: null
  },

  sword: {           // Left click
    tier: 0,
    extraDmg: 0,
    extraRange: 0,
    cooldown: 28,
    cdTimer: 0,
    swingTime: 10,
    swing: 0,
    angle: 0,
    arc: SWORD_ARC,
    whirlwind: false,
    dmgMult: 1,
    lifesteal: 0
  }
};

const goblins = [];
const bullets = [];
const coins = [];
const particles = [];
const meteors = [];
const eBullets = [];      // enemy projectiles (Emperor)

let wave = 1;
let gameOver = false;
let paused = false;
let shopOpen = false;
let selected = 0;
let shopScroll = 0;
let statsOpen = false;   // Stats menu (Tab / I)

/* Emperor^2 challenge */
let emperorKills = 0;    // total Emperor kills (the next Emperor's power = 2^kills)
let challenge = false;   // true once Emperor^2 mode is active (G key, or automatically at wave 20)
let spawnDelay = 0;      // frames until the next challenge Emperor appears

/* Centered big message (phase announcements, game over) */
let msgTimer = null;
function showMessage(html, ms){
  clearTimeout(msgTimer);
  msgEl.innerHTML = html;
  msgEl.style.display = "block";
  if(ms){
    msgTimer = setTimeout(() => {
      if(!gameOver) msgEl.style.display = "none";
    }, ms);
  }
}

/* Particles (capped so big fights stay smooth) */
function explode(x, y, color){
  if(particles.length > 700) return;
  for(let i = 0; i < 10; i++){
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 30, max: 30, size: 3,
      color
    });
  }
}

function trailPuff(x, y, color, size, life){
  if(particles.length > 700) return;
  particles.push({ x, y, vx:0, vy:0, life, max:life, size, color });
}
