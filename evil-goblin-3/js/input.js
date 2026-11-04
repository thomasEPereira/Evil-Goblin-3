"use strict";
/* ===== Controls =====
   Left click  = sword (hold to keep swinging)
   Right click = shoot
   Space       = dash
   WASD        = move,  B = shop,  P = pause
*/

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, left: false };

addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

addEventListener("mousedown", e => {
  if(e.button === 0) mouse.left = true;                       // sword is polled in updatePlayer()
  if(e.button === 2 && !gameOver && !paused && !shopOpen) shoot();
});

addEventListener("mouseup", e => {
  if(e.button === 0) mouse.left = false;
});

addEventListener("contextmenu", e => e.preventDefault());     // no browser menu on right click

addEventListener("blur", () => {
  for(const k in keys) keys[k] = false;
  mouse.left = false;
});

addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if(k === " ") e.preventDefault();

  if(gameOver){
    if(k === "r") location.reload();
    return;
  }

  if(k === "p" && !shopOpen){
    paused = !paused;
  }

  if(k === "g" && !e.repeat && !shopOpen && !paused) tryStartChallenge();

  if(k === "b"){
    shopOpen = !shopOpen;
    paused = shopOpen;
    if(shopOpen) clampShopScroll();
  }

  if(shopOpen){
    if(e.key.startsWith("Arrow")) e.preventDefault();
    handleShopKey(e);
  }
});

addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

function shoot(){
  const base = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  const n = player.multishot;
  const spread = 0.12;

  for(let i = 0; i < n; i++){
    const a = base + (i - (n - 1) / 2) * spread;
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(a) * 10,
      vy: Math.sin(a) * 10,
      damage: player.damage,
      pierce: player.pierce,
      hit: new Set()
    });
  }
}
