'use strict';

/* ============================================================
   FOLLOWING DAVE - Main Game Script
   Arcade game: find Dave among decoys.
   Press Start 2P typographic styling.
   Rounds 0-9 allowed; 11th attempt triggers gameover.
   ============================================================ */

const CANVAS_W = 640;
const CANVAS_H = 480;
const CARD_W = 176;
const CARD_H = 200;
const CARDS_PER_ROW = 3;
const TOTAL_CARDS = CARDS_PER_ROW * 2; // 3x2 grid
const ROUND_LIMIT = 10; // 0..9 playable; round 10 = gameover
const DIFFICULTIES = {
  easy:   { label: 'EASY',   timeMs: 12000 },
  medium: { label: 'MEDIUM', timeMs: 8000  },
  hard:   { label: 'HARD',   timeMs: 5000  }
};

let G = {
  difficulty: 'easy',
  round: 0,
  score: 0,
  state: 'start', // start | playing | result | gameover
  cards: [],
  daveIndex: 0,
  timerAt: 0,
  timerHandle: null,
  selected: -1,
  log: [],
  lastResult: null // 'hit' | 'miss'
};

const $=id=>document.getElementById(id);
const canvas=$('game-canvas');
const ctx=canvas.getContext('2d');
canvas.width=CANVAS_W; canvas.height=CANVAS_H;

/* ---------- DOM ---------- */
const elScore=$('score');
const elRound=$('round');
const elLog=$('round-log');
const elMsg=$('message-area');
const elMsgTxt=$('message-text');
const elStart=$('start-screen');
const elOver=$('gameover-screen');
const elOverTitle=$('gameover-title');
const elOverTippy=$('gameover-tippy');
const elFinal=$('final-score');
const diffBtns=document.querySelectorAll('.diff-btn');

/* ============================================================
   PIXEL SPRITESHEETS (16x16)
   Each sprite: Array(16) of Array(16); null=transparent, [r,g,b]=color
   ============================================================ */

const C=(r,g,b)=>[r,g,b];
const T=C(0,0,0);

// ---- DAVE ----
// light skin, short brown hair, blue eyes, smirk, dark blue shirt
const DAVE_SPRITE=()=>{
  const s=Array.from({length:16},()=>Array(16).fill(null));
  const skin=C(255,210,180), skinShadow=C(235,190,160);
  const hair=C(101,67,33), hairDark=C(65,42,20);
  const eyeWhite=C(255,255,255), eyeBlue=C(65,130,200);
  const shirt=C(25,25,110), shirtLight=C(55,55,150), shirtShadow=C(15,15,80);
  const brow=T, smirk=C(210,110,90);

  // hair top
  for(let x=2;x<14;x++){ s[0][x]=hair; }
  for(let x=3;x<13;x++){ s[1][x]=hair; }
  // hair sides bangs
  s[2][2]=hair; s[2][13]=hair;
  // face region rows 3..12
  for(let y=3;y<13;y++){
    for(let x=2;x<14;x++){
      s[y][x]=skin;
    }
  }
  // hair fringe shadow over forehead
  s[3][2]=hairDark; s[3][13]=hairDark;
  s[4][2]=hairDark; s[4][13]=hairDark;
  // ears
  s[6][2]=skinShadow; s[6][13]=skinShadow;
  s[7][2]=skinShadow; s[7][13]=skinShadow;
  // eyes
  for(let y=6;y<9;y++){
    s[y][5]=eyeWhite; s[y][6]=eyeBlue; s[y][7]=eyeBlue; s[y][8]=eyeWhite;
    s[y][11]=eyeWhite; s[y][12]=eyeBlue; s[y][13]=eyeBlue; s[y][14]=eyeWhite;
  }
  // pupils centered
  s[7][6]=T; s[7][7]=T; s[7][12]=T; s[7][13]=T;
  // eyebrows (expressive)
  for(let x=4;x<9;x++){ s[4][x]=brow; }
  for(let x=10;x<15;x++){ s[4][x]=brow; }
  // nose
  s[9][7]=skinShadow; s[9][8]=skinShadow;
  // smirk mouth (right-biased)
  s[11][7]=smirk; s[11][8]=smirk; s[11][9]=smirk; s[11][10]=smirk; s[11][11]=smirk; s[11][12]=smirk; s[11][13]=smirk;
  s[12][9]=smirk; s[12][10]=smirk; s[12][11]=smirk; s[12][12]=smirk;
  // shirt starts row 12..15
  for(let y=12;y<16;y++){
    for(let x=2;x<14;x++){
      if(y===12) s[y][x]=shirt;
      else s[y][x]=shirtLight;
    }
  }
  // shirt shadow fold
  s[13][2]=shirtShadow; s[13][13]=shirtShadow;
  s[14][2]=shirtShadow; s[14][13]=shirtShadow;
  s[15][2]=shirtShadow; s[15][13]=shirtShadow;
  // center collar
  s[12][6]=shirtShadow; s[12][9]=shirtShadow;
  return s;
};

// ---- SAM (decoy) ----
// darker skin, black hair with red streak, orange shirt
const SAM_SPRITE=()=>{
  const s=Array.from({length:16},()=>Array(16).fill(null));
  const skin=C(190,150,110), skinShadow=C(170,130,90);
  const hair=C(20,20,20), hairRed=C(190,50,50);
  const eyeWhite=C(255,255,255), pupil=T;
  const shirt=C(200,120,50), shirtShadow=C(140,80,20);
  for(let x=2;x<14;x++){ s[0][x]=hair; s[1][x]=hair; }
  for(let y=3;y<13;y++){ for(let x=2;x<14;x++){ s[y][x]=skin; } }
  s[3][2]=hair; s[3][13]=hair;
  // red streak
  s[0][8]=hairRed; s[1][8]=hairRed; s[2][8]=hairRed;
  // eyes
  for(let y=6;y<9;y++){ s[y][5]=eyeWhite; s[y][6]=pupil; s[y][7]=eyeWhite; s[y][11]=eyeWhite; s[y][12]=pupil; s[y][13]=eyeWhite; }
  // frown
  s[11][7]=C(120,60,40); s[11][8]=C(120,60,40); s[11][9]=C(120,60,40); s[11][10]=C(120,60,40); s[11][11]=C(120,60,40); s[11][12]=C(120,60,40);
  // shirt
  for(let y=12;y<16;y++){ for(let x=2;x<14;x++){ s[y][x]=shirt; } }
  s[13][2]=shirtShadow; s[13][13]=shirtShadow;
  return s;
};

// ---- FALCON (decoy) ----
// humanoid falcon-like figure, grey feathers, beak, red eye
const FALCON_SPRITE=()=>{
  const s=Array.from({length:16},()=>Array(16).fill(null));
  const feather=C(90,90,105), featherLight=C(130,130,150), featherDark=C(40,40,55);
  const beak=C(255,210,70), beakDark=C(180,150,30);
  const eyeRed=C(255,40,40);
  // head crest
  for(let x=4;x<12;x++){ s[0][x]=featherDark; }
  s[1][5]=featherDark; s[1][10]=featherDark;
  // face
  for(let y=2;y<9;y++){ for(let x=3;x<13;x++){ s[y][x]=feather; } }
  // beak
  s[5][6]=beak; s[5][7]=beak; s[5][8]=beak; s[5][9]=beak; s[5][10]=beak;
  s[6][7]=beakDark; s[6][8]=beakDark; s[6][9]=beakDark;
  // eye
  s[4][6]=eyeRed; s[4][9]=eyeRed;
  s[5][6]=C(40,10,10); s[5][9]=C(40,10,10);
  // feather texture
  for(let y=7;y<9;y++){ for(let x=4;x<12;x+=2){ s[y][x]=featherLight; } }
  // body / wings
  for(let y=9;y<16;y++){ for(let x=2;x<14;x++){ s[y][x]=feather; } }
  s[10][2]=featherDark; s[10][13]=featherDark;
  s[11][2]=featherDark; s[11][13]=featherDark;
  s[12][2]=featherDark; s[12][13]=featherDark;
  // wing detail
  s[13][4]=featherLight; s[13][11]=featherLight;
  return s;
};

// ---- TIPPY HAPPY ----
// small boxy creature celebrating (green shirt, bounce)
const TIPPY_HAPPY=()=>{
  const s=Array.from({length:16},()=>Array(16).fill(null));
  const skin=C(245,210,175), skinShadow=C(220,180,150);
  const hair=C(150,100,50);
  const shirt=C(100,200,110), shirtShadow=C(60,150,70);
  // body
  for(let y=6;y<16;y++){ for(let x=3;x<13;x++){ s[y][x]=shirt; } }
  s[7][3]=shirtShadow; s[7][12]=shirtShadow;
  // head
  for(let y=1;y<6;y++){ for(let x=4;x<12;x++){ s[y][x]=skin; } }
  // hair tuft
  s[0][7]=hair; s[0][8]=hair; s[1][6]=hair; s[1][9]=hair;
  // eyes
  s[3][5]=C(30,20,10); s[3][6]=C(30,20,10);
  s[3][9]=C(30,20,10); s[3][10]=C(30,20,10);
  // big smile
  for(let x=5;x<11;x++){ s[4][x]=T; }
  for(let x=6;x<10;x++){ s[5][x]=T; }
  // arms up
  s[7][0]=skin; s[7][1]=skin; s[7][2]=skin;
  s[7][13]=skin; s[7][14]=skin; s[7][15]=skin;
  s[8][0]=skin; s[8][15]=skin;
  // stars (yellow dots)
  s[2][2]=C(255,255,0); s[2][13]=C(255,255,0);
  s[1][3]=C(255,255,0); s[1][12]=C(255,255,0);
  return s;
};

// ---- TIPPY SAD ----
// small boxy creature slouched with tears
const TIPPY_SAD=()=>{
  const s=Array.from({length:16},()=>Array(16).fill(null));
  const skin=C(240,200,170), skinShadow=C(215,170,140);
  const hair=C(150,100,50);
  const shirt=C(180,90,100), shirtShadow=C(120,50,60);
  // body slouched
  for(let y=6;y<16;y++){ for(let x=3;x<13;x++){ s[y][x]=shirt; } }
  s[9][3]=shirtShadow; s[9][12]=shirtShadow;
  // head lower
  for(let y=3;y<7;y++){ for(let x=4;x<12;x++){ s[y][x]=skin; } }
  // droopy hair
  s[1][6]=hair; s[1][9]=hair; s[2][5]=hair; s[2][10]=hair;
  // eyes downcast
  s[4][5]=C(30,20,10); s[4][6]=C(30,20,10);
  s[4][9]=C(30,20,10); s[4][10]=C(30,20,10);
  // tears
  s[5][6]=C(150,200,255); s[5][7]=C(150,200,255);
  s[5][9]=C(150,200,255); s[5][10]=C(150,200,255);
  s[6][6]=C(150,200,255); s[6][9]=C(150,200,255);
  // frown
  s[5][6]=T; s[5][7]=T; s[5][8]=T; s[5][9]=T;
  // arms down
  s[8][2]=skin; s[8][3]=skin;
  s[8][12]=skin; s[8][13]=skin;
  s[9][2]=skin; s[9][13]=skin;
  return s;
};

const SPRITES={
  dave: DAVE_SPRITE(),
  sam: SAM_SPRITE(),
  falcon: FALCON_SPRITE(),
  tippyHappy: TIPPY_HAPPY(),
  tippySad: TIPPY_SAD()
};

/* ============================================================
   RENDER HELPERS
   ============================================================ */

function drawPixelSprite(sprite, px, py, scale, colorTint){
  for(let y=0;y<16;y++){
    for(let x=0;x<16;x++){
      const c=sprite[y][x];
      if(!c) continue;
      let r=c[0], g=c[1], b=c[2];
      if(colorTint){
        r=Math.round(r*tint[0]); g=Math.round(g*tint[1]); b=Math.round(b*tint[2]);
      }
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.fillRect(px+x*scale, py+y*scale, scale, scale);
    }
  }
}

function getSprite(name){
  return SPRITES[name] || SPRITES.dave;
}

function easeInOut(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }

/* ---------- Card back (player sees before selection) ---------- */
function drawCardBack(x,y,w,h, idx){
  ctx.save();
  // visible card background
  ctx.fillStyle='#1a1a3a';
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#00ffff';
  ctx.lineWidth=3;
  ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);
  // hatch pattern
  ctx.fillStyle='#2a2a5a';
  const step=12;
  for(let i=0;i<w;i+=step){ ctx.fillRect(x+i,y+6,2,h-12); }
  for(let j=0;j<h;j+=step){ ctx.fillRect(x+6,y+j,w-12,2); }
  // index label
  ctx.fillStyle='#ffffff';
  ctx.font='10px "Press Start 2P"';
  ctx.textAlign='center';
  ctx.fillText('#'+String(idx+1), x+w/2, y+h/2+4);
  ctx.restore();
}

/* ---------- Card face (revealed sprite) ---------- */
function drawCardFace(card, scale){
  ctx.save();
  ctx.fillStyle='#0a0a15';
  ctx.fillRect(card.x, card.y, card.w, card.h);
  // subtle inner shadow
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fillRect(card.x, card.y, card.w, 6);
  ctx.fillRect(card.x, card.y, 6, card.h);
  // sprite
  drawPixelSprite(card.sprite, card.x+ (card.w-16*scale)/2, card.y+(card.h-16*scale)/2, scale);
  ctx.restore();
}

/* ---------- Tippy overlay (happy/sad) ---------- */
function drawTippy(emotion, cx, cy, scale){
  const sprite= emotion==='happy' ? SPRITES.tippyHappy : SPRITES.tippySad;
  const tint= emotion==='happy' ? [1,1,1] : [1.2,0.6,0.6];
  // background glow
  ctx.save();
  const glowColor= emotion==='happy' ? 'rgba(0,255,120,0.35)' : 'rgba(255,40,80,0.35)';
  ctx.fillStyle=glowColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 16*scale+18, 0, Math.PI*2);
  ctx.fill();
  // tint overlay
  ctx.globalCompositeOperation='multiply';
  drawPixelSprite(sprite, cx-8*scale, cy-8*scale, scale, tint);
  ctx.restore();
}

/* ============================================================
   LAYOUT
   ============================================================ */
function computeLayout(){
  const cols=CARDS_PER_ROW;
  const rows=Math.ceil(TOTAL_CARDS/cols);
  const gapX=CARD_GAP, gapY=CARD_GAP;
  const totalW=cols*CARD_W+(cols-1)*gapX;
  const totalH=rows*CARD_H+(rows-1)*gapY;
  // Keep the grid fully inside the canvas instead of centering off-edge.
  const startX=Math.max(8, (CANVAS_W-totalW)/2);
  const startY=Math.max(8, (CANVAS_H-totalH)/2);
  const cards=[];
  for(let i=0;i<TOTAL_CARDS;i++){
    const col=i%cols, row=Math.floor(i/cols);
    cards.push({
      id:i,
      x: startX+col*(CARD_W+gapX),
      y: startY+row*(CARD_H+gapY),
      w: CARD_W, h: CARD_H,
      spriteName: 'dave',
      sprite: null,
      revealed: false,
      scale: 8,
      chosen:false
    });
  }
  return cards;
}

/* ============================================================
   ROUND LOGIC
   ============================================================ */
function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function buildRound(roundIndex){
  G.cards=computeLayout();
  // assign sprites: 1 dave, rest decoys alternating sam/falcon
  const sprites=[];
  for(let i=0;i<TOTAL_CARDS;i++){
    if(i===0) sprites.push('dave');
    else sprites.push(i%2===0 ? 'sam' : 'falcon');
  }
  shuffleArray(sprites);
  G.daveIndex=-1;
  G.cards.forEach((c,i)=>{
    c.spriteName=sprites[i];
    c.sprite=SPRITES[sprites[i]];
    c.revealed=false;
    c.chosen=false;
  });
  // place dave
  G.daveIndex=G.cards.findIndex(c=>c.spriteName==='dave');
}

function logEntry(text, type='info'){
  G.log.unshift({text, type, t:Date.now()});
  if(G.log.length>8) G.log.length=8;
  renderLog();
}

function renderLog(){
  elLog.innerHTML=G.log.slice(0,5).map(e=>
    `<div class="log-entry ${e.type}">${e.text}</div>`
  ).join('');
}

function updateHUD(){
  elScore.textContent=String(G.score).padStart(4,'0');
  elRound.textContent=String(G.round+1).padStart(2,'0');
}

function showMessage(text, isGood){
  elMsgTxt.textContent=text;
  elMsg.classList.remove('hidden');
  elMsg.style.borderColor = isGood ? '#00ff00' : '#ff0040';
  elMsg.style.color = isGood ? '#00ff00' : '#ff0040';
  clearTimeout(showMessage._t);
  showMessage._t=setTimeout(()=>{ elMsg.classList.add('hidden'); }, 1600);
}

/* ============================================================
   TIMER
   ============================================================ */
function startTimer(){
  stopTimer();
  const cfg=DIFFICULTIES[G.difficulty];
  G.timerAt=Date.now();
  G.timerHandle=setInterval(()=>{
    const left=cfg.timeMs-(Date.now()-G.timerAt);
    if(left<=0){
      stopTimer();
      onTimeout();
    }
  }, 50);
}

function stopTimer(){ if(G.timerHandle){ clearInterval(G.timerHandle); G.timerHandle=null; } }

function onTimeout(){
  if(G.state!=='playing') return;
  // reveal all, no selection = miss
  revealAll();
  applyResult(false);
}

function onCardClick(idx){
  if(G.state==='start'){
    startGame();
    return;
  }
  if(G.state!=='playing') return;
  if(G.cards[idx].revealed || G.cards[idx].chosen) return;
  G.selected=idx;
  G.cards[idx].chosen=true;
  revealAll();
  const hit = (idx===G.daveIndex);
  applyResult(hit);
}

function revealAll(){
  G.cards.forEach(c=>{ c.revealed=true; });
}

function applyResult(hit){
  stopTimer();
  G.lastResult=hit;
  if(hit){
    G.score += (G.difficulty==='hard' ? 300 : G.difficulty==='medium' ? 200 : 100);
    logEntry(`ROUND ${G.round+1} - HIT DAVE! +${hit?'':''}`, 'hit');
    showMessage('DAVE FOUND!', true);
  } else {
    G.score = Math.max(0, G.score - (G.difficulty==='hard' ? 150 : G.difficulty==='medium' ? 100 : 50));
    logEntry(`ROUND ${G.round+1} - WRONG TARGET`, 'miss');
    showMessage('NOT DAVE!', false);
  }
  updateHUD();
  G.state='result';
  scheduleNext(hit);
}

function scheduleNext(hit){
  const delay = hit ? 1000 : 2200;
  setTimeout(()=>{
    advanceRound();
  }, delay);
}

function advanceRound(){
  if(G.round+1 >= ROUND_LIMIT){
    // finished 10 rounds => next index (10) triggers gameover
    G.round = ROUND_LIMIT-1; // ensure 10 rounds shown
    endGame(true);
    return;
  }
  G.round++;
  G.state='playing';
  buildRound(G.round);
  updateHUD();
  logEntry(`--- ROUND ${G.round+1} ---`, 'info');
  startTimer();
}

/* ============================================================
   START / END
   ============================================================ */
function startGame(){
  G.round=0;
  G.score=0;
  G.state='playing';
  G.log=[];
  G.selected=-1;
  elStart.classList.add('hidden');
  elOver.classList.add('hidden');
  elMsg.classList.add('hidden');
  updateHUD();
  // Build round then confirm cards are on canvas
  buildRound(0);
  if(!G.cards.length || G.cards[0].x<0 || G.cards[0].y<0){
    G.cards=computeLayout();
    const sprites=[];
    for(let i=0;i<TOTAL_CARDS;i++){
      if(i===0) sprites.push('dave');
      else sprites.push(i%2===0 ? 'sam' : 'falcon');
    }
    shuffleArray(sprites);
    G.daveIndex=-1;
    G.cards.forEach((c,i)=>{
      c.spriteName=sprites[i];
      c.sprite=SPRITES[sprites[i]];
      c.revealed=false;
      c.chosen=false;
    });
    G.daveIndex=G.cards.findIndex(c=>c.spriteName==='dave');
  }
  logEntry('PRESS START - ROUND 1', 'info');
  logEntry('FIND DAVE!', 'info');
  startTimer();
  render();
}

function endGame(completed){
  stopTimer();
  G.state='gameover';
  elOver.classList.remove('hidden');
  // title depends on score quality
  const goodScore = G.score >= 1500;
  elOverTitle.textContent = goodScore ? 'DAVE SAVED YOU' : 'DRIFTED FROM DAVE';
  // tippy: happy if good score, sad if poor
  const emotion = goodScore ? 'happy' : 'sad';
  // render tippy into gameover tippy element via canvas? We'll render into an inline SVG-ish via CSS bg is fine.
  // But spec wants Tippy Sad/Good visual. We'll render tippy onto a small canvas in DOM.
  renderTippyForGameover(emotion);
  elFinal.textContent=String(G.score).padStart(4,'0');
  logEntry('--- GAME OVER ---', 'info');
  logEntry(`FINAL SCORE ${G.score}`, 'info');
  render();
}

function renderTippyForGameover(emotion){
  // Create a tiny canvas inside the gameover tippy div
  let c=$('gameover-tippy-canvas');
  if(!c){
    c=document.createElement('canvas');
    c.id='gameover-tippy-canvas';
    c.width=128; c.height=128;
    $('gameover-tippy').appendChild(c);
  }
  const cx=c.getContext('2d');
  cx.clearRect(0,0,128,128);
  const scale=8;
  const sprite = emotion==='happy' ? SPRITES.tippyHappy : SPRITES.tippySad;
  drawPixelSprite(sprite, (128-16*scale)/2, (128-16*scale)/2, scale);
}

/* ============================================================
   DIFFICULTY SELECTION -> reset everything to fresh shuffle
   ============================================================ */
function onDifficultyClick(diff){
  G.difficulty=diff;
  G.round=0;
  G.score=0;
  G.state='start';
  G.log=[];
  G.selected=-1;
  stopTimer();
  // update UI
  diffBtns.forEach(b=>{
    const active = b.dataset.diff===diff;
    b.classList.toggle('active', active);
  });
  elStart.classList.remove('hidden');
  elOver.classList.add('hidden');
  elMsg.classList.add('hidden');
  updateHUD();
  renderLog();
  // fresh initial shuffle status on canvas
  render();
}

/* ============================================================
   RENDER LOOP
   ============================================================ */
let animFrame=0;
function render(){
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  // bg
  ctx.fillStyle='#0a0a15';
  ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  // subtle vignette grid
  ctx.strokeStyle='rgba(0,255,255,0.04)';
  ctx.lineWidth=1;
  for(let x=0;x<=CANVAS_W;x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_H); ctx.stroke(); }
  for(let y=0;y<=CANVAS_H;y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_W,y); ctx.stroke(); }

  if(G.state==='start'){
    // initial shuffle display: show full grid of backs
    G.cards=computeLayout();
    G.cards.forEach((c,i)=>{
      drawCardBack(c.x, c.y, c.w, c.h, i);
    });
    drawWatermark();
    return;
  }

  // draw cards
  G.cards.forEach((c,i)=>{
    if(!c.revealed){
      drawCardBack(c.x,c.y,c.w,c.h,i);
    } else {
      drawCardFace(c, c.scale);
    }
  });

  // selection pulse
  if(G.selected>=0 && G.cards[G.selected] && !G.cards[G.selected].revealed){
    // nothing
  }

  drawWatermark();

  // Tippy overlay only after round 10 reached results
  // We hide reward/loss visuals until counter hits 10 (rounds 0..9). Round log can still show.
  if(G.state==='gameover'){
    drawGameoverOverlay();
  }
}

function drawWatermark(){
  ctx.save();
  ctx.fillStyle='rgba(128,128,160,0.08)';
  ctx.font='10px "Press Start 2P"';
  ctx.textAlign='right';
  ctx.fillText('FOLLOWING DAVE', CANVAS_W-12, CANVAS_H-12);
  ctx.restore();
}

function drawGameoverOverlay(){
  // dim
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  // show tippy in center based on last result if round>=10? Actually reward/loss hidden until round 10.
  // We draw tippy only on gameover screen already. So here we leave canvas clean.
}

/* ============================================================
   ANIMATION LOOP (gentle card hover/breathing)
   ============================================================ */
function loop(){
  animFrame++;
  if(G.state==='playing' && G.cards.length){
    // subtle scale pulse on unrevealed cards
    render();
  } else if(G.state==='start'){
    render();
  } else {
    render();
  }
  requestAnimationFrame(loop);
}

/* ============================================================
   INPUT
   ============================================================ */
canvas.addEventListener('click', e=>{
  const rect=canvas.getBoundingClientRect();
  const scaleX=CANVAS_W/rect.width, scaleY=CANVAS_H/rect.height;
  const mx=(e.clientX-rect.left)*scaleX;
  const my=(e.clientY-rect.top)*scaleY;
  // find card
  for(let i=0;i<G.cards.length;i++){
    const c=G.cards[i];
    if(mx>=c.x && mx<=c.x+c.w && my>=c.y && my<=c.y+c.h){
      onCardClick(i);
      return;
    }
  }
});

window.addEventListener('keydown', e=>{
  if(e.code==='Space'){
    e.preventDefault();
    if(G.state==='start') startGame();
  }
  if(e.code==='Enter' && G.state==='gameover'){
    resetToStart();
  }
});

function resetToStart(){
  G.round=0; G.score=0; G.state='start'; G.log=[]; G.selected=-1;
  stopTimer();
  elOver.classList.add('hidden');
  elStart.classList.remove('hidden');
  updateHUD();
  render();
}

/* difficulty buttons */
diffBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    onDifficultyClick(btn.dataset.diff);
  });
});

/* ============================================================
   INIT
   ============================================================ */
function init(){
  onDifficultyClick('easy');
  loop();
}
init();
