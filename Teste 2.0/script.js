/* ==========================================================
   GRIMÓRIO — script.js
   ========================================================== */

const STORAGE = {
  players: 'grimorio_players',
  npcs: 'grimorio_npcs',
  monsters: 'grimorio_monsters',
};

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function saveJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* ignore quota errors */ }
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function mod(score){ return Math.floor((score - 10) / 2); }
function fmtMod(m){ return (m >= 0 ? '+' : '') + m; }
function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

const ABILITIES = [
  {key:'str', label:'FOR'},
  {key:'dex', label:'DES'},
  {key:'con', label:'CON'},
  {key:'int', label:'INT'},
  {key:'wis', label:'SAB'},
  {key:'cha', label:'CAR'},
];

/* ==========================================================
   TOP-LEVEL VIEW ROUTING (home / player / master)
   ========================================================== */
const topViews = {
  home: document.getElementById('view-home'),
  player: document.getElementById('view-player'),
  master: document.getElementById('view-master'),
};

function showTopView(name){
  Object.values(topViews).forEach(v => v.classList.remove('active'));
  topViews[name].classList.add('active');

  if(name === 'player'){
    showPlayerList();
  }
  if(name === 'master'){
    showMasterTab(currentMasterTab);
  }
}

document.getElementById('btn-goto-player').addEventListener('click', ()=> showTopView('player'));
document.getElementById('btn-goto-master').addEventListener('click', ()=> showTopView('master'));

document.addEventListener('click', (e)=>{
  const backBtn = e.target.closest('[data-back]');
  if(!backBtn) return;
  const target = backBtn.dataset.back;
  if(target === 'home') showTopView('home');
  else if(target === 'player-list') showPlayerList();
  else if(target === 'npc-list') showNpcList();
  else if(target === 'monster-list') showMonsterList();
});

/* ==========================================================
   PLAYER: gallery + editor
   ========================================================== */
let players = loadJSON(STORAGE.players, []);
let editingPlayerId = null;

function defaultPlayer(){
  const abilities = {};
  ABILITIES.forEach(a => abilities[a.key] = 10);
  return {
    id: uid(),
    name:'', class:'', level:1, species:'', background:'', alignment:'',
    ac:10, init:0, speed:'9m', hpCurrent:10, hpMax:10,
    abilities, equipment:'', traits:'',
  };
}

function buildAbilitiesRow(containerId, idPrefix, modClass){
  const row = document.getElementById(containerId);
  row.innerHTML = '';
  ABILITIES.forEach(a=>{
    const box = document.createElement('div');
    box.className = 'ability-box';
    box.innerHTML = `
      <span class="ab-name">${a.label}</span>
      <input type="number" min="1" max="30" value="10" id="${idPrefix}-${a.key}">
      <span class="ab-mod ${modClass}" id="${idPrefix}-mod-${a.key}">+0</span>
    `;
    row.appendChild(box);
  });
}
buildAbilitiesRow('p-abilities-row', 'p-ab', 'mod-green');
buildAbilitiesRow('mon-abilities-row', 'mon-ab', 'mod-purple');

function recomputePlayerMods(){
  ABILITIES.forEach(a=>{
    const el = document.getElementById(`p-ab-${a.key}`);
    const score = parseInt(el.value) || 10;
    document.getElementById(`p-ab-mod-${a.key}`).textContent = fmtMod(mod(score));
  });
}
document.getElementById('p-abilities-row').addEventListener('input', recomputePlayerMods);

function recomputeMonsterMods(){
  ABILITIES.forEach(a=>{
    const el = document.getElementById(`mon-ab-${a.key}`);
    const score = parseInt(el.value) || 10;
    const modEl = document.getElementById(`mon-ab-mod-${a.key}`);
    if(modEl) modEl.textContent = fmtMod(mod(score));
  });
}
// monster abilities row currently has no visible mod span (kept minimal); safe no-op if absent
document.getElementById('mon-abilities-row').addEventListener('input', recomputeMonsterMods);

function showPlayerList(){
  document.getElementById('player-editor').classList.add('hidden');
  document.getElementById('player-gallery').classList.remove('hidden');
  renderPlayerGrid();
}
function renderPlayerGrid(){
  const grid = document.getElementById('player-grid');
  grid.innerHTML = '';

  const addCard = document.createElement('button');
  addCard.type = 'button';
  addCard.className = 'add-card';
  addCard.innerHTML = `<span class="plus">+</span><span>Novo personagem</span>`;
  addCard.addEventListener('click', ()=> openPlayerEditor(null));
  grid.appendChild(addCard);

  players.forEach(p=>{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'entity-card';
    card.innerHTML = `
      <div>
        <h4>${escapeHTML(p.name || '(sem nome)')}</h4>
        <p class="card-sub">${escapeHTML(p.class || 'Classe indefinida')}${p.species ? ' · ' + escapeHTML(p.species) : ''}</p>
      </div>
      <div class="card-badges">
        <span class="badge badge-green">Nível ${escapeHTML(p.level || 1)}</span>
        <span class="badge">PV ${escapeHTML(p.hpCurrent ?? '?')}/${escapeHTML(p.hpMax ?? '?')}</span>
        <span class="badge">CA ${escapeHTML(p.ac ?? '?')}</span>
      </div>
    `;
    card.addEventListener('click', ()=> openPlayerEditor(p.id));
    grid.appendChild(card);
  });
}

function openPlayerEditor(id){
  editingPlayerId = id;
  const p = id ? players.find(pl => pl.id === id) : defaultPlayer();

  document.getElementById('p-name').value = p.name || '';
  document.getElementById('p-class').value = p.class || '';
  document.getElementById('p-level').value = p.level || 1;
  document.getElementById('p-species').value = p.species || '';
  document.getElementById('p-background').value = p.background || '';
  document.getElementById('p-alignment').value = p.alignment || '';
  document.getElementById('p-ac').value = p.ac ?? 10;
  document.getElementById('p-init').value = p.init ?? 0;
  document.getElementById('p-speed').value = p.speed || '9m';
  document.getElementById('p-hp-current').value = p.hpCurrent ?? 10;
  document.getElementById('p-hp-max').value = p.hpMax ?? 10;
  ABILITIES.forEach(a => document.getElementById(`p-ab-${a.key}`).value = p.abilities?.[a.key] ?? 10);
  document.getElementById('p-equipment').value = p.equipment || '';
  document.getElementById('p-traits').value = p.traits || '';
  recomputePlayerMods();

  document.getElementById('player-gallery').classList.add('hidden');
  document.getElementById('player-editor').classList.remove('hidden');
}

document.getElementById('player-save').addEventListener('click', ()=>{
  const name = document.getElementById('p-name').value.trim();
  if(!name){ alert('Dê um nome ao personagem antes de salvar.'); return; }

  const abilities = {};
  ABILITIES.forEach(a => abilities[a.key] = parseInt(document.getElementById(`p-ab-${a.key}`).value) || 10);

  const data = {
    id: editingPlayerId || uid(),
    name,
    class: document.getElementById('p-class').value,
    level: parseInt(document.getElementById('p-level').value) || 1,
    species: document.getElementById('p-species').value,
    background: document.getElementById('p-background').value,
    alignment: document.getElementById('p-alignment').value,
    ac: parseInt(document.getElementById('p-ac').value) || 10,
    init: parseInt(document.getElementById('p-init').value) || 0,
    speed: document.getElementById('p-speed').value,
    hpCurrent: parseInt(document.getElementById('p-hp-current').value) || 0,
    hpMax: parseInt(document.getElementById('p-hp-max').value) || 0,
    abilities,
    equipment: document.getElementById('p-equipment').value,
    traits: document.getElementById('p-traits').value,
  };

  if(editingPlayerId){
    const idx = players.findIndex(pl => pl.id === editingPlayerId);
    players[idx] = data;
  }else{
    players.push(data);
  }
  saveJSON(STORAGE.players, players);
  showPlayerList();
});

document.getElementById('player-delete').addEventListener('click', ()=>{
  if(!editingPlayerId) { showPlayerList(); return; }
  const p = players.find(pl => pl.id === editingPlayerId);
  if(!confirm(`Excluir "${p?.name || 'este personagem'}"? Essa ação não pode ser desfeita.`)) return;
  players = players.filter(pl => pl.id !== editingPlayerId);
  saveJSON(STORAGE.players, players);
  showPlayerList();
});

/* ==========================================================
   MASTER: tabs (NPC / Monster)
   ========================================================== */
let currentMasterTab = 'npc';

document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMasterTab = btn.dataset.tab;
    showMasterTab(currentMasterTab);
  });
});

function showMasterTab(tab){
  const isNpc = tab === 'npc';
  document.getElementById('npc-gallery').classList.toggle('hidden', !isNpc);
  document.getElementById('npc-editor').classList.add('hidden');
  document.getElementById('monster-gallery').classList.toggle('hidden', isNpc);
  document.getElementById('monster-editor').classList.add('hidden');

  if(isNpc){
    document.getElementById('npc-gallery').classList.remove('hidden');
    renderNpcGrid();
  }else{
    document.getElementById('monster-gallery').classList.remove('hidden');
    renderMonsterGrid();
  }
}

/* --- NPCs --- */
let npcs = loadJSON(STORAGE.npcs, []);
let editingNpcId = null;

function showNpcList(){
  document.getElementById('npc-editor').classList.add('hidden');
  document.getElementById('npc-gallery').classList.remove('hidden');
  renderNpcGrid();
}
function renderNpcGrid(){
  const grid = document.getElementById('npc-grid');
  grid.innerHTML = '';

  const addCard = document.createElement('button');
  addCard.type = 'button';
  addCard.className = 'add-card';
  addCard.innerHTML = `<span class="plus">+</span><span>Novo NPC</span>`;
  addCard.addEventListener('click', ()=> openNpcEditor(null));
  grid.appendChild(addCard);

  if(!npcs.length){
    // still show add-card; no extra empty state needed since add-card is visible
  }

  npcs.forEach(n=>{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'entity-card';
    card.innerHTML = `
      <div>
        <h4>${escapeHTML(n.name || '(sem nome)')}</h4>
        <p class="card-sub">${escapeHTML(n.race || 'Raça/ocupação indefinida')}${n.location ? ' · ' + escapeHTML(n.location) : ''}</p>
      </div>
      <div class="card-badges">
        <span class="badge badge-purple">${escapeHTML(n.attitude || 'Neutro')}</span>
      </div>
    `;
    card.addEventListener('click', ()=> openNpcEditor(n.id));
    grid.appendChild(card);
  });
}
function openNpcEditor(id){
  editingNpcId = id;
  const n = id ? npcs.find(x => x.id === id) : {name:'', race:'', location:'', attitude:'Amigável', appearance:'', personality:'', notes:''};

  document.getElementById('npc-name').value = n.name || '';
  document.getElementById('npc-race').value = n.race || '';
  document.getElementById('npc-location').value = n.location || '';
  document.getElementById('npc-attitude').value = n.attitude || 'Amigável';
  document.getElementById('npc-appearance').value = n.appearance || '';
  document.getElementById('npc-personality').value = n.personality || '';
  document.getElementById('npc-notes').value = n.notes || '';

  document.getElementById('npc-gallery').classList.add('hidden');
  document.getElementById('npc-editor').classList.remove('hidden');
}
document.getElementById('npc-save').addEventListener('click', ()=>{
  const name = document.getElementById('npc-name').value.trim();
  if(!name){ alert('Dê um nome ao NPC antes de salvar.'); return; }
  const data = {
    id: editingNpcId || uid(),
    name,
    race: document.getElementById('npc-race').value,
    location: document.getElementById('npc-location').value,
    attitude: document.getElementById('npc-attitude').value,
    appearance: document.getElementById('npc-appearance').value,
    personality: document.getElementById('npc-personality').value,
    notes: document.getElementById('npc-notes').value,
  };
  if(editingNpcId){
    const idx = npcs.findIndex(x => x.id === editingNpcId);
    npcs[idx] = data;
  }else{
    npcs.push(data);
  }
  saveJSON(STORAGE.npcs, npcs);
  showNpcList();
});
document.getElementById('npc-delete').addEventListener('click', ()=>{
  if(!editingNpcId){ showNpcList(); return; }
  const n = npcs.find(x => x.id === editingNpcId);
  if(!confirm(`Excluir "${n?.name || 'este NPC'}"?`)) return;
  npcs = npcs.filter(x => x.id !== editingNpcId);
  saveJSON(STORAGE.npcs, npcs);
  showNpcList();
});

/* --- Monsters --- */
let monsters = loadJSON(STORAGE.monsters, []);
let editingMonsterId = null;

function showMonsterList(){
  document.getElementById('monster-editor').classList.add('hidden');
  document.getElementById('monster-gallery').classList.remove('hidden');
  renderMonsterGrid();
}
function renderMonsterGrid(){
  const grid = document.getElementById('monster-grid');
  grid.innerHTML = '';

  const addCard = document.createElement('button');
  addCard.type = 'button';
  addCard.className = 'add-card';
  addCard.innerHTML = `<span class="plus">+</span><span>Novo monstro</span>`;
  addCard.addEventListener('click', ()=> openMonsterEditor(null));
  grid.appendChild(addCard);

  monsters.forEach(m=>{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'entity-card';
    card.innerHTML = `
      <div>
        <h4>${escapeHTML(m.name || '(sem nome)')}</h4>
        <p class="card-sub">${escapeHTML(m.type || 'Tipo indefinido')}</p>
      </div>
      <div class="card-badges">
        <span class="badge badge-purple">ND ${escapeHTML(m.cr || '?')}</span>
        <span class="badge">CA ${escapeHTML(m.ac ?? '?')}</span>
        <span class="badge">PV ${escapeHTML(m.hp || '?')}</span>
      </div>
    `;
    card.addEventListener('click', ()=> openMonsterEditor(m.id));
    grid.appendChild(card);
  });
}
function defaultMonsterAbilities(){
  const abilities = {};
  ABILITIES.forEach(a => abilities[a.key] = 10);
  return abilities;
}
function openMonsterEditor(id){
  editingMonsterId = id;
  const m = id ? monsters.find(x => x.id === id) : {name:'', type:'', cr:'', ac:12, hp:'', speed:'12m', abilities:defaultMonsterAbilities(), actions:'', traits:'', notes:''};

  document.getElementById('mon-name').value = m.name || '';
  document.getElementById('mon-type').value = m.type || '';
  document.getElementById('mon-cr').value = m.cr || '';
  document.getElementById('mon-ac').value = m.ac ?? 12;
  document.getElementById('mon-hp').value = m.hp || '';
  document.getElementById('mon-speed').value = m.speed || '12m';
  ABILITIES.forEach(a => document.getElementById(`mon-ab-${a.key}`).value = m.abilities?.[a.key] ?? 10);
  document.getElementById('mon-actions').value = m.actions || '';
  document.getElementById('mon-traits').value = m.traits || '';
  document.getElementById('mon-notes').value = m.notes || '';
  recomputeMonsterMods();

  document.getElementById('monster-gallery').classList.add('hidden');
  document.getElementById('monster-editor').classList.remove('hidden');
}
document.getElementById('monster-save').addEventListener('click', ()=>{
  const name = document.getElementById('mon-name').value.trim();
  if(!name){ alert('Dê um nome ao monstro antes de salvar.'); return; }
  const abilities = {};
  ABILITIES.forEach(a => abilities[a.key] = parseInt(document.getElementById(`mon-ab-${a.key}`).value) || 10);
  const data = {
    id: editingMonsterId || uid(),
    name,
    type: document.getElementById('mon-type').value,
    cr: document.getElementById('mon-cr').value,
    ac: parseInt(document.getElementById('mon-ac').value) || 10,
    hp: document.getElementById('mon-hp').value,
    speed: document.getElementById('mon-speed').value,
    abilities,
    actions: document.getElementById('mon-actions').value,
    traits: document.getElementById('mon-traits').value,
    notes: document.getElementById('mon-notes').value,
  };
  if(editingMonsterId){
    const idx = monsters.findIndex(x => x.id === editingMonsterId);
    monsters[idx] = data;
  }else{
    monsters.push(data);
  }
  saveJSON(STORAGE.monsters, monsters);
  showMonsterList();
});
document.getElementById('monster-delete').addEventListener('click', ()=>{
  if(!editingMonsterId){ showMonsterList(); return; }
  const m = monsters.find(x => x.id === editingMonsterId);
  if(!confirm(`Excluir "${m?.name || 'este monstro'}"?`)) return;
  monsters = monsters.filter(x => x.id !== editingMonsterId);
  saveJSON(STORAGE.monsters, monsters);
  showMonsterList();
});
