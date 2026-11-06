"use strict";
/* ===== Shop =====
   Every upgrade now scales in BOTH price and power:
     price(level)  - base price of the next purchase (grows linearly with every purchase;
                     after PRICE_KNEE purchases of an item it also compounds exponentially, see itemCost)
     eff(level)    - how strong the next purchase is (also grows with every purchase)
   The shop always shows the effect of the NEXT purchase, so you can see it ramping up.

   Hard caps:  max HP 1000 | armor 40 (each point = -1.75% damage from EVERYTHING, so max -70%)
               speed 20 | dash speed 44 | sword cooldown 8 frames | dash cooldown 15 frames

   Add a new upgrade by adding an object to shopItems:
     tag, eff(lvl), name(eff,lvl), desc(eff,lvl), price(lvl),
     max (number of purchases) and/or maxed() (custom cap), apply(eff,lvl), consumable (optional)
*/

const lin = (base, ramp) => lvl => Math.round(base * (1 + ramp * lvl));   // price: base * (1 + ramp*level)
const r1 = n => Math.round(n * 10) / 10;

const SWORD_MIN_CD = 8;
const DASH_MIN_CD = 15;
const SPEED_CAP = 20;

/* After this many purchases of an item, its price starts compounding by PRICE_GROWTH per extra purchase */
const PRICE_KNEE = 10;
const PRICE_GROWTH = 1.15;
const DASH_SPEED_CAP = 44;

const shopNote = { text: "", until: 0 };
function setShopNote(text){
  shopNote.text = text;
  shopNote.until = performance.now() + 1500;
}

const shopItems = [

  /* ---------------- SWORD (left click) ---------------- */
  {
    tag:"SWORD", level:0, eff:() => 0,
    name:() => {
      const s = player.sword;
      return s.tier >= SWORD_TIERS.length - 1
        ? "Forge Sword: " + SWORD_TIERS[s.tier].name + " (best)"
        : "Forge Sword -> " + SWORD_TIERS[s.tier + 1].name;
    },
    desc:() => {
      const s = player.sword;
      if(s.tier >= SWORD_TIERS.length - 1) return "Your sword is fully reforged.";
      const n = SWORD_TIERS[s.tier + 1];
      return "Next tier: " + n.dmg + " base damage and " + n.range + " range (now " +
        SWORD_TIERS[s.tier].dmg + " / " + SWORD_TIERS[s.tier].range + ").";
    },
    price:() => SWORD_UPGRADE_COSTS[player.sword.tier] || 0,
    max: SWORD_TIERS.length - 1,
    apply(){ player.sword.tier++; }
  },
  {
    tag:"SWORD", level:0,
    eff: lvl => Math.round(25 * (1 + 0.12 * lvl)),
    name: e => "Sharpening Stone +" + e + " Sword Damage",
    desc: () => "Permanent sword damage. Each stone adds more than the last. Price +5g per stone, then exponential after " + PRICE_KNEE + ".",
    price: lin(25, 0.2),
    max: null,
    apply: e => { player.sword.extraDmg += e; }
  },
  {
    tag:"SWORD", level:0,
    eff: lvl => r1(2 * (1 + 0.15 * lvl)),
    name: e => "Quick Hands (-" + e + " frames per swing)",
    desc: () => "Faster swings. Cooldown now " + r1(player.sword.cooldown) + " frames (floor " + SWORD_MIN_CD + ").",
    price: lin(40, 0.35),
    maxed: () => player.sword.cooldown <= SWORD_MIN_CD,
    apply: e => { player.sword.cooldown = Math.max(SWORD_MIN_CD, player.sword.cooldown - e); }
  },
  {
    tag:"SWORD", level:0,
    eff: lvl => Math.round(15 * (1 + 0.1 * lvl)),
    name: e => "Long Reach +" + e + " Sword Range",
    desc: () => "Hit goblins from further away.",
    price: lin(45, 0.35),
    max: 6,
    apply: e => { player.sword.extraRange += e; }
  },
  {
    tag:"SWORD", level:0,
    eff: lvl => lvl === 0 ? 0 : r1(0.12 * (1 + 0.1 * (lvl - 1))),
    name: (e, lvl) => lvl === 0
      ? "Whirlwind Blade (360 degree swing)"
      : "Whirlwind Mastery +" + Math.round(e * 100) + "% Sword Damage",
    desc: (e, lvl) => lvl === 0
      ? "Unlock: your sword hits everything around you. Afterwards it can be mastered for bonus damage."
      : "Permanent sword damage multiplier (now x" + r1(player.sword.dmgMult) + ").",
    price: lin(250, 0.35),
    max: 7,
    apply: (e, lvl) => {
      if(lvl === 0) player.sword.whirlwind = true;
      else player.sword.dmgMult += e;
    }
  },
  {
    tag:"SWORD", level:0,
    eff: lvl => r1(1 * (1 + 0.25 * lvl)),
    name: e => "Vampiric Edge (+" + e + " HP per hit)",
    desc: () => "Heal on every goblin you hit (up to 5 per swing). Now " + r1(player.sword.lifesteal) + " HP per hit.",
    price: lin(60, 0.4),
    max: 8,
    apply: e => { player.sword.lifesteal += e; }
  },

  /* ---------------- DASH (space) ---------------- */
  {
    tag:"DASH", level:0,
    eff: lvl => r1(8 * (1 + 0.15 * lvl)),
    name: e => "Dash Boots (-" + e + " frames cooldown)",
    desc: () => "Dash more often. Cooldown now " + r1(player.dash.cooldown) + " frames (floor " + DASH_MIN_CD + ").",
    price: lin(35, 0.35),
    maxed: () => player.dash.cooldown <= DASH_MIN_CD,
    apply: e => { player.dash.cooldown = Math.max(DASH_MIN_CD, player.dash.cooldown - e); }
  },
  {
    tag:"DASH", level:0,
    eff: lvl => r1(3 * (1 + 0.12 * lvl)),
    name: e => "Long Dash (+" + e + " dash speed)",
    desc: () => "Dash travels further. Now " + r1(player.dash.speed) + " / " + DASH_SPEED_CAP + ".",
    price: lin(35, 0.35),
    maxed: () => player.dash.speed >= DASH_SPEED_CAP,
    apply: e => { player.dash.speed = Math.min(DASH_SPEED_CAP, player.dash.speed + e); }
  },
  {
    tag:"DASH", level:0,
    eff: lvl => 0.3 + 0.2 * (lvl + 1),
    name: (e, lvl) => lvl === 0
      ? "Shockwave Dash (dash damages goblins)"
      : "Shockwave Dash -> " + Math.round(e * 100) + "% sword damage",
    desc: (e, lvl) => lvl === 0
      ? "Unlock: dashing through goblins hurts them. Every level makes it hit harder."
      : "Dash damage is " + Math.round(player.dash.shockMult * 100) + "% of your sword damage; next level " + Math.round(e * 100) + "%.",
    price: lin(120, 0.35),
    max: 8,
    apply: e => { player.dash.shockwave = true; player.dash.shockMult = e; }
  },

  /* ---------------- GUN (right click) ---------------- */
  {
    tag:"GUN", level:0,
    eff: lvl => Math.round(5 * (1 + 0.1 * lvl)),
    name: e => "Iron Ammo +" + e + " Damage",
    desc: () => "Click-shot damage. Now " + player.damage + ".",
    price: lin(20, 0.25),
    max: null,
    apply: e => { player.damage += e; }
  },
  {
    tag:"GUN", level:0,
    eff: lvl => Math.round(15 * (1 + 0.1 * lvl)),
    name: e => "Battle Axe Ammo +" + e + " Damage",
    desc: () => "Click-shot damage. Now " + player.damage + ".",
    price: lin(50, 0.3),
    max: null,
    apply: e => { player.damage += e; }
  },
  {
    tag:"GUN", level:0,
    eff: lvl => Math.round(50 * (1 + 0.1 * lvl)),
    name: e => "Laser Chicken +" + e + " Damage",
    desc: () => "Click-shot damage. Now " + player.damage + ". Bawk.",
    price: lin(150, 0.35),
    max: null,
    apply: e => { player.damage += e; }
  },
  {
    tag:"GUN", level:0, eff: () => 1,
    name: () => "Twin Shot (+1 projectile)",
    desc: () => "Fire an extra bullet in a spread. Now " + player.multishot + ".",
    price: lin(80, 0.6),
    max: 4,
    apply: () => { player.multishot += 1; }
  },
  {
    tag:"GUN", level:0, eff: () => 1,
    name: () => "Piercing Rounds (+1 pierce)",
    desc: () => "Bullets pass through extra goblins. Now " + player.pierce + ".",
    price: lin(90, 0.5),
    max: 3,
    apply: () => { player.pierce += 1; }
  },

  /* ---------------- DEFENSE ---------------- */
  {
    tag:"DEF", level:0,
    eff: lvl => 1 + Math.floor(lvl / 4),                 // 1,1,1,1,2,2,2,2,3...
    name: e => "Armor Plating +" + e + " Armor",
    desc: () => "Armor " + player.armor + "/" + ARMOR_CAP + ": cuts ALL damage by " +
      r1(player.armor * ARMOR_REDUCTION * 100) + "% (max " + r1(ARMOR_CAP * ARMOR_REDUCTION * 100) + "%).",
    price: lin(30, 0.3),
    maxed: () => player.armor >= ARMOR_CAP,
    apply: e => { player.armor = Math.min(ARMOR_CAP, player.armor + e); }
  },
  {
    tag:"DEF", level:0,
    eff: lvl => Math.round(25 * (1 + 0.15 * lvl)),
    name: e => "Heart Container +" + e + " Max HP",
    desc: () => "Max HP " + player.maxHp + "/" + MAX_HP_CAP + ". Also heals what it adds.",
    price: lin(40, 0.3),
    maxed: () => player.maxHp >= MAX_HP_CAP,
    apply: e => {
      const add = Math.min(e, MAX_HP_CAP - player.maxHp);
      player.maxHp += add;
      player.hp += add;
    }
  },
  {
    tag:"DEF", level:0,
    eff: lvl => r1(0.5 * (1 + 0.2 * lvl)),
    name: e => "Regeneration (+" + e + " HP/sec)",
    desc: () => "Heal over time. Now " + r1(player.regen * 60) + " HP/sec.",
    price: lin(60, 0.35),
    max: 8,
    apply: e => { player.regen += e / 60; }
  },
  {
    tag:"DEF", level:0, consumable:true, eff: () => 0,
    name: () => "Healing Potion (full heal)",
    desc: () => "Instantly restore all HP. Price grows with your max HP; buy as many as you like.",
    price: () => Math.round(25 + 0.2 * player.maxHp),
    max: null,
    apply: () => { player.hp = player.maxHp; }
  },

  /* ---------------- UTILITY ---------------- */
  {
    tag:"UTIL", level:0,
    eff: lvl => r1(0.6 * (1 + 0.1 * lvl)),
    name: e => "Boots +" + e + " Speed",
    desc: () => "Move faster. Now " + r1(player.speed) + " / " + SPEED_CAP + ".",
    price: lin(15, 0.4),
    maxed: () => player.speed >= SPEED_CAP,
    apply: e => { player.speed = Math.min(SPEED_CAP, player.speed + e); }
  },
  {
    tag:"UTIL", level:0,
    eff: lvl => Math.round(25 * (1 + 0.1 * lvl)),
    name: e => "Lucky Magnet (+" + e + " pickup range)",
    desc: () => "Coins are collected from further away. Now " + Math.round(player.magnet) + ".",
    price: lin(25, 0.35),
    max: 6,
    apply: e => { player.magnet += e; }
  },
  {
    tag:"UTIL", level:0,
    eff: lvl => r1(0.2 * (1 + 0.1 * lvl)),
    name: e => "Goblin Greed (+" + Math.round(e * 100) + "% kill gold)",
    desc: () => "Goblins drop more gold. Now x" + r1(player.goldMult) + ".",
    price: lin(100, 0.45),
    max: 8,
    apply: e => { player.goldMult += e; }
  },
  {
    tag:"UTIL", level:0, consumable:true,
    eff: () => Math.round(300 * (1 + 0.25 * (wave - 1))),      // scales with the wave you're on
    name: e => "Thunder Scroll (" + e + " dmg to ALL)",
    desc: () => "One-use: zaps every goblin on screen (the boss too). Gets stronger and pricier as waves go on.",
    price: () => 75 + 15 * wave,
    max: null,
    apply: e => {
      for(const g of goblins){
        damageGoblin(g, e);
        explode(g.x, g.y, "#ffff66");
      }
      reapDead();
    }
  }
];

/* ---------- helpers used by the shop UI ---------- */
function itemMaxed(it){
  if(it.maxed) return it.maxed();
  return it.max !== null && it.max !== undefined && it.level >= it.max;
}
function itemEff(it){ return it.eff(it.level); }
function itemCost(it){
  const over = Math.max(0, it.level - PRICE_KNEE);          // purchases past the knee
  return Math.round(it.price(it.level) * Math.pow(PRICE_GROWTH, over));
}
function itemName(it){ return it.name(itemEff(it), it.level); }
function itemDesc(it){ return it.desc(itemEff(it), it.level); }
function itemLevelText(it){
  if(it.consumable) return "";
  if(it.max !== null && it.max !== undefined) return it.max > 1 ? it.level + "/" + it.max : "";
  return "Lv " + it.level;
}

function buySelected(){
  const it = shopItems[selected];
  if(itemMaxed(it)){ setShopNote("Already maxed!"); return; }

  const cost = itemCost(it);
  if(player.gold < cost){ setShopNote("Not enough gold!"); return; }

  const e = itemEff(it);
  player.gold -= cost;
  it.apply(e, it.level);
  it.level++;
  setShopNote("Bought!");
}

function shopLayout(){
  const w = Math.min(800, canvas.width - 40);
  const h = Math.min(660, canvas.height - 40);
  const listTop = 100, footer = 120, rowH = 34;
  return {
    x: (canvas.width - w) / 2,
    y: (canvas.height - h) / 2,
    w, h, listTop, rowH,
    visible: Math.max(3, Math.floor((h - listTop - footer) / rowH))
  };
}

function clampShopScroll(){
  const v = shopLayout().visible;
  if(selected < shopScroll) shopScroll = selected;
  else if(selected >= shopScroll + v) shopScroll = selected - v + 1;
  shopScroll = clamp(shopScroll, 0, Math.max(0, shopItems.length - v));
}

function handleShopKey(e){
  if(e.key === "ArrowUp"){
    selected = (selected - 1 + shopItems.length) % shopItems.length;
    clampShopScroll();
  }
  if(e.key === "ArrowDown"){
    selected = (selected + 1) % shopItems.length;
    clampShopScroll();
  }
  if(e.key === "Enter") buySelected();
  if(e.key === "Escape"){
    shopOpen = false;
    paused = false;
  }
}
