"use strict";
/* ===== Game loop ===== */

function update(){
  if(gameOver || paused) return;

  if(spawnDelay > 0 && --spawnDelay === 0) spawnChallengeWave();

  updatePlayer();
  updateBullets();
  updateSquad();
  updateGoblins();
  reapDead();
  updateCoins();
  updateParticles();
  updateMeteors();
  updateEBullets();

  player.level = 1 + Math.floor(player.kills / 10);

  if(player.hp <= 0){
    gameOver = true;
    showMessage(
      "EVIL GOBLIN 3<br><br>GAME OVER<br><br>Wave " + wave +
      "<br>Kills " + player.kills +
      "<br><br><span style='font-size:24px'>Press R to restart</span>"
    );
  }
}

/* Fixed 60 updates/sec so the game runs at the same speed on 60Hz and 144Hz screens */
const STEP = 1000 / 60;
let lastTime = performance.now();
let acc = 0;

function frame(now){
  acc += Math.min(now - lastTime, 250);
  lastTime = now;

  while(acc >= STEP){
    update();
    acc -= STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

spawnWave();
requestAnimationFrame(frame);
