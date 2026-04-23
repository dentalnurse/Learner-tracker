// ── FIREBASE INITIALIZATION ───────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBxEVBFLgPs_vkLya-zZ0bWunJoiLDGKI8",
  authDomain: "learner-tracker-b52e9.firebaseapp.com",
  projectId: "learner-tracker-b52e9",
  databaseURL: "https://learner-tracker-b52e9-default-rtdb.firebaseio.com/", 
  storageBucket: "learner-tracker-b52e9.firebasestorage.app",
  messagingSenderId: "113394990899",
  appId: "1:113394990899:web:26c769cce4605c95224846",
  measurementId: "G-T1X5ST3CE7"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ── DATA CORE ───────────────────────
let DB = { learners: [] };
let cDash=0, cMark=0, cTT=0;
let currentCourseView = 'dip'; 
let DIPLOMA_ACS = [], OHE_ACS_NEW = [];
let draggedItemIndex = null;
const STATUSES = ['Not started', 'Requires amendments', 'Completed'];

// ── SYNC & LOAD ───────────────────────
function save() { 
  return database.ref('backups/latest_sync').set(DB); 
}

/** * MIRROR SYNC: Rebuilds learner data based on Master Template order 
 * while preserving progress via the unique 'ref' key.
 */
function syncLearnerToMaster(learner) {
  const master = learner.type === 'ohe' ? OHE_ACS_NEW : DIPLOMA_ACS;
  if (!master || master.length === 0) return;

  const progressMap = {};
  if (learner.acs && learner.progress) {
    learner.acs.forEach((ac, i) => {
      if (ac.ref) progressMap[ac.ref] = learner.progress[i];
    });
  }

  const updatedAcs = [];
  const updatedProgress = [];

  master.forEach(mItem => {
    updatedAcs.push({ ...mItem });
    updatedProgress.push(progressMap[mItem.ref] || 'Not started');
  });

  learner.acs = updatedAcs;
  learner.progress = updatedProgress;
}

function initialFirebaseLoad() {
  database.ref('courses').once('value').then(cS => {
    const d = cS.val();
    if (d) { DIPLOMA_ACS = d.diploma || []; OHE_ACS_NEW = d.ohe || []; }
    return database.ref('backups/latest_sync').once('value');
  }).then(lS => {
    const lData = lS.val();
    if (lData && lData.learners) { 
      DB = lData; 
      DB.learners.forEach(l => syncLearnerToMaster(l));
    }
    renderDashboard();
  }).catch(err => console.error("Initialization Error:", err));
}

// ── UI HELPERS ───────────────────────
function ubdgClass(u){
  const v = String(u||'').toUpperCase();
  if (v === 'SO') return 'ubdg ubdg-so';
  if (v === 'CS') return 'ubdg ubdg-cs';
  if (v === 'PCA') return 'ubdg ubdg-pca';
  return 'ubdg ubdg-d';
}
function ubdgLabel(u){ return !u ? '??' : (['SO','CS','PCA'].includes(String(u).toUpperCase()) ? u : `Unit ${u}`); }

function badge(s) {
  let cls = 's-none';
  if (s === 'Completed') cls = 's-done';
  if (s === 'Requires amendments') cls = 's-amend';
  return `<span class="sbdg ${cls}">${s}</span>`;
}

function initials(n){ return n ? n.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '??'; }

function learnerBar(id, curr, fn) {
  const el = document.getElementById(id);
  if(!el || !DB.learners) return;
  el.innerHTML = DB.learners.map((l, i) => `
    <button class="lpill ${i===curr?'active':''}" onclick="${fn}(${i})">
      <span class="lpill-dot"></span>${l.name}
    </button>`).join('');
}

// ── NAVIGATION ───────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
  const target = document.getElementById('tab-' + name);
  if(target) target.classList.add('active');
  if(btn) btn.classList.add('active');
  
  if (name === 'dashboard') renderDashboard();
  if (name === 'marking') renderMarking();
  if (name === 'timetable') renderTimetable();
  if (name === 'courses') renderCourses();
  if (name === 'edit') renderEdit();
}

// ── VIEWS ───────────────────────
function renderDashboard() {
  const el = document.getElementById('tab-dashboard');
  const l = DB.learners[cDash];
  if (!l) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }

  // 1. Calculate Progress
  const total = l.acs.length;
  const done = l.progress.filter(s => s === 'Completed').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // 2. Generate Table Rows
  const rows = l.acs.map((ac, i) => `
    <tr>
      <td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td>
      <td class="ac-ref">${ac.ref}</td>
      <td style="text-align:center">${ac.n||1}</td>
      <td>${badge(l.progress[i])}</td>
    </tr>`).join('');

  // 3. Render HTML with Stat Cards
  el.innerHTML = `
    <div class="page-header"><div class="page-title">Dashboard</div></div>
    <div class="learner-bar" id="dash-btns"></div>
    
    <div class="profile-card">
      <div class="avatar">${initials(l.name)}</div>
      <div class="profile-info">
        <div class="profile-name">${l.name}</div>
        <div class="profile-meta"><span>${l.cohort}</span></div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Progress</div>
        <div class="stat-value">${percent}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Done</div>
        <div class="stat-value">${done}/${total}</div>
      </div>
    </div>

    <div class="table-card">
      <table class="tbl">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Ref</th>
            <th style="text-align:center">Qty</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  learnerBar('dash-btns', cDash, 'selectDash');
}

function renderMarking() {
  const el = document.getElementById('tab-marking');
  const l = DB.learners[cMark];
  if(!l) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const rows = l.acs.map((ac, i) => `<tr><td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td><td>${ac.ref}</td><td><select class="tt-edit-input" style="width:100%" onchange="DB.learners[${cMark}].progress[${i}]=this.value;save();">${STATUSES.map(s=>`<option ${s===(l.progress[i]||'Not started')?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('');
  el.innerHTML = `<div class="page-header"><div class="page-title">Marking</div></div><div class="learner-bar" id="mark-btns"></div><div class="table-card"><table class="tbl"><tbody>${rows}</tbody></table></div>`;
  learnerBar('mark-btns', cMark, 'selectMark');
}

function renderTimetable() {
  const el = document.getElementById('tab-timetable');
  const l = DB.learners[cTT];
  if(!l) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const rows = l.timetable.map((t, i) => `<tr><td style="text-align:center; font-weight:bold; color:var(--ink3);">${i + 1}</td><td style="width:45%"><div style="font-weight:600;">${t.label}</div><div style="font-size:11px; color:var(--ink3); white-space:pre-line;">${t.reqs||''}</div></td><td><input type="text" class="tt-edit-input" style="width:100%" value="${t.date||''}" onchange="DB.learners[${cTT}].timetable[${i}].date=this.value;save();" placeholder="Set Date..."></td></tr>`).join('');
  el.innerHTML = `<div class="page-header"><div class="page-title">Timetable</div></div><div class="learner-bar" id="tt-btns"></div><div style="display:grid; grid-template-columns:1fr 320px; gap:20px; margin-top:20px;"><div class="table-card"><table class="tbl"><thead><tr><th style="width:40px">ID</th><th>Unit</th><th>Deadline</th></tr></thead><tbody>${rows}</tbody></table></div><div class="table-card" style="padding:20px;"><h3 style="font-family:'Fraunces',serif; margin-bottom:10px;">Bulk ID Import</h3><textarea id="bulk-id-input" rows="12" style="width:100%; padding:12px; border:1.5px solid var(--border); border-radius:10px; font-size:13px;"></textarea><button class="btn-save" style="width:100%; margin-top:15px;" onclick="applyIDBulkImport(${cTT})">Sync Dates</button></div></div>`;
  learnerBar('tt-btns', cTT, 'selectTT');
}

function renderCourses() {
  const el = document.getElementById('tab-courses');
  const type = currentCourseView;
  const list = type === 'dip' ? DIPLOMA_ACS : OHE_ACS_NEW;
  const rows = list.map((ac, i) => `
    <tr class="draggable-row" draggable="true" data-index="${i}" 
        ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" 
        ondrop="handleDrop(event, '${type}')" ondragend="handleDragEnd(event)">
      <td class="drag-handle">⋮⋮</td>
      <td><input type="text" class="tt-edit-input" style="width:65px" value="${ac.unit||''}" oninput="updateTemplate('${type}',${i},'unit',this.value)" onblur="saveTemplates()"></td>
      <td><input type="text" class="tt-edit-input" style="width:100%" value="${ac.ref||''}" oninput="updateTemplate('${type}',${i},'ref',this.value)" onblur="saveTemplates()"></td>
      <td><input type="number" class="tt-edit-input" style="width:50px" value="${ac.n||1}" oninput="updateTemplate('${type}',${i},'n',this.value)" onblur="saveTemplates()"></td>
      <td><button onclick="deleteMasterAC('${type}',${i})" style="color:var(--red); border:none; background:none; cursor:pointer;">✕</button></td>
    </tr>`).join('');
  el.innerHTML = `<div class="page-header"><div class="page-title">Course Templates</div></div><div class="table-card" style="padding:20px;"><div style="margin-bottom:20px; display:flex; gap:10px;"><button class="lpill ${type==='dip'?'active':''}" onclick="currentCourseView='dip';renderCourses()">Diploma</button><button class="lpill ${type==='ohe'?'active':''}" onclick="currentCourseView='ohe';renderCourses()">OHE</button></div><table class="tbl"><thead><tr><th style="width:30px"></th><th>Unit</th><th>Ref</th><th>Qty</th><th></th></tr></thead><tbody id="course-template-body">${rows}</tbody></table><button class="btn-save" style="margin-top:20px;" onclick="addMasterAC('${type}')">+ Add Requirement</button></div>`;
}

// ── TEMPLATE & LEARNER MANAGEMENT ───────────────────────
function saveTemplates() {
  database.ref('courses').set({ diploma: DIPLOMA_ACS, ohe: OHE_ACS_NEW })
    .then(() => {
      DB.learners.forEach(l => syncLearnerToMaster(l));
      return save();
    })
    .then(() => {
      renderCourses();
    });
}

function updateTemplate(t, i, f, v) { 
  const arr = (t==='dip'?DIPLOMA_ACS:OHE_ACS_NEW);
  if(arr[i]) arr[i][f] = f==='n' ? parseInt(v) : v; 
}
function addMasterAC(t) { (t==='dip'?DIPLOMA_ACS:OHE_ACS_NEW).push({unit:'',ref:'New',n:1}); renderCourses(); }
function deleteMasterAC(t,i) { if(confirm("Delete?")){ (t==='dip'?DIPLOMA_ACS:OHE_ACS_NEW).splice(i,1); saveTemplates(); } }

function renderEdit() {
  const el = document.getElementById('tab-edit');
  if(!DB.learners.length) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  el.innerHTML = `<div class="page-header"><div class="page-title">Manage Learners</div></div><div style="max-width:850px;">
    ${DB.learners.map((l, i) => `
      <div class="table-card" style="padding:20px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
        <div><b>${l.name}</b><br><small>${l.cohort} (${l.type.toUpperCase()})</small></div>
        <button class="lpill" onclick="deleteLearner(${i})" style="color:var(--red); border-color:var(--red);">Delete</button>
      </div>`).join('')}</div>`;
}

function deleteLearner(i) { if(confirm("Delete Profile?")) { DB.learners.splice(i,1); save().then(() => renderEdit()); } }

// ── DRAG & DROP HANDLERS ───────────────────────
function handleDragStart(e) { draggedItemIndex = e.target.closest('tr').dataset.index; e.target.closest('tr').classList.add('dragging'); }
function handleDragOver(e) { 
  e.preventDefault(); 
  if (e.clientY < 100) window.scrollBy(0, -10);
  else if (window.innerHeight - e.clientY < 100) window.scrollBy(0, 10);
}
function handleDrop(e, type) {
  e.preventDefault();
  const targetRow = e.target.closest('tr');
  if (!targetRow || draggedItemIndex === null) return;
  const targetIndex = parseInt(targetRow.dataset.index);
  const list = type === 'dip' ? DIPLOMA_ACS : OHE_ACS_NEW;
  const movedItem = list.splice(draggedItemIndex, 1)[0];
  list.splice(targetIndex, 0, movedItem);
  saveTemplates(); 
}
function handleDragEnd(e) { 
  const row = e.target.closest('tr');
  if(row) row.classList.remove('dragging'); 
  draggedItemIndex = null; 
}

function applyIDBulkImport(li) {
  const input = document.getElementById('bulk-id-input').value.trim();
  if (!input) return;
  input.split('\n').forEach(line => {
    const match = line.match(/^(\d+)[\s\-:]+(.*)$/);
    if (match && DB.learners[li].timetable[match[1]-1]) DB.learners[li].timetable[match[1]-1].date = match[2].trim();
  });
  save().then(() => renderTimetable());
}

function selectDash(i){ cDash=i; renderDashboard(); }
function selectMark(i){ cMark=i; renderMarking(); }
function selectTT(i){ cTT=i; renderTimetable(); }

window.onload = initialFirebaseLoad;
