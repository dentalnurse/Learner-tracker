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
let activeEditIdx = null; 
let currentCourseView = 'dip'; 
let DIPLOMA_ACS = [], OHE_ACS_NEW = [];
let draggedItemIndex = null;
const STATUSES = ['Not started', 'Requires amendments', 'Completed'];

// ── TIMETABLE MASTER LABELS ───────────────────────
const DIPLOMA_TT_LABELS = [
  {label:'Professional Practice – Unit 1c',reqs:'2 Knowledge evidence questions\nMWT Decontamination'},
  {label:'CPD – Unit 9',reqs:'5 Knowledge evidence questions'},
  {label:'Leading & Teamworking – Unit 2',reqs:'Reflective account'},
  {label:'Communication – Unit 3',reqs:'MWT Professionalism'},
  {label:'Risks & Medical Emergencies – Unit 10',reqs:'Medical emergency certificate'},
  {label:'Inclusive Practice – Unit 4',reqs:'Professional discussion (Teams)'},
  {label:'Clinical Assessment – 5a',reqs:'MWT Clinical assessment Child/Adult'},
  {label:'Radiography – 5b',reqs:'MWT Radiography'},
  {label:'Periodontology – 5c',reqs:'MWT Periodontology'},
  {label:'Restorative – 6a',reqs:'MWT Restorative/Endo'},
  {label:'Prosthesis – 6b',reqs:'MWT Removable/Fixed'},
  {label:'Health & Wellbeing – Unit 8',reqs:'5 Knowledge evidence questions'},
  {label:'Oral Health – Unit 7',reqs:'MWT OHI simulation'},
  {label:'Final Portfolio',reqs:'All work finalised'}
];

const OHE_TT_LABELS = [
  {label:'Phase 1 – Theory',reqs:''}, {label:'Phase 2 – PCAs 1–3',reqs:''},
  {label:'Phase 3 – PCAs 4–6',reqs:''}, {label:'Phase 4 – PCAs 7–9',reqs:''},
  {label:'Phase 5 – PCAs 10–11',reqs:''}, {label:'Phase 6 – SOs',reqs:''},
  {label:'Exam',reqs:''}
];

// ── SYNC & LOAD ───────────────────────
function save() { return database.ref('backups/latest_sync').set(DB); }

function syncLearnerToMaster(learner) {
  const master = learner.type === 'ohe' ? OHE_ACS_NEW : DIPLOMA_ACS;
  if (!master || master.length === 0) return;
  const progressMap = {};
  if (learner.acs && learner.progress) {
    learner.acs.forEach((ac, i) => { if (ac.ref) progressMap[ac.ref] = learner.progress[i]; });
  }
  learner.acs = master.map(mItem => ({ ...mItem }));
  learner.progress = master.map(mItem => progressMap[mItem.ref] || 'Not started');
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
      DB.learners.forEach(l => {
        if(!l.timetable || l.timetable.length === 0) {
            const tl = l.type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;
            l.timetable = tl.map(t => ({ label: t.label, reqs: t.reqs, date: '' }));
        }
        syncLearnerToMaster(l);
      });
    }
    renderDashboard();
  }).catch(err => console.error("Init Error:", err));
}

// ── UI HELPERS ───────────────────────
function isMarkedThisWeek(ts) { return ts > (Date.now() - (7 * 24 * 60 * 60 * 1000)); }
function ubdgClass(u){ return ['SO','CS','PCA'].includes(String(u).toUpperCase()) ? `ubdg ubdg-${u.toLowerCase()}` : 'ubdg ubdg-d'; }
function ubdgLabel(u){ return ['SO','CS','PCA'].includes(String(u).toUpperCase()) ? u : `Unit ${u}`; }
function badge(s) {
  const cls = s === 'Completed' ? 's-done' : (s === 'Requires amendments' ? 's-amend' : 's-none');
  return `<span class="sbdg ${cls}">${s}</span>`;
}
function initials(n){ return n ? n.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '??'; }

function learnerBar(id, curr, fn) {
  const el = document.getElementById(id);
  if(!el || !DB.learners) return;
  el.innerHTML = DB.learners.map((l, i) => `
    <button class="lpill ${i===curr?'active':''} ${isMarkedThisWeek(l.lastMarked)?'marked-done':''}" onclick="${fn}(${i})">
      <span class="lpill-dot"></span>${l.name}
    </button>`).join('');
}

// ── VIEWS ───────────────────────
function renderDashboard() {
  const el = document.getElementById('tab-dashboard');
  if (!el || !DB.learners || !DB.learners[cDash]) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const l = DB.learners[cDash];
  const done = l.progress.filter(s => s === 'Completed').length;
  const pct = l.acs.length > 0 ? Math.round((done / l.acs.length) * 100) : 0;
  const rows = l.acs.map((ac, i) => `<tr><td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td><td class="ac-ref">${ac.ref}</td><td style="text-align:center">${ac.n||1}</td><td>${badge(l.progress[i])}</td></tr>`).join('');

  el.innerHTML = `
    <div class="page-header"><div class="page-title">Dashboard</div></div>
    <div class="learner-bar" id="dash-btns"></div>
    <div class="profile-card">
      <div class="avatar">${initials(l.name)}</div>
      <div class="profile-info">
        <div class="profile-name">${l.name} ${!isMarkedThisWeek(l.lastMarked) ? '<span class="sbdg s-amend" style="margin-left:8px;font-size:10px">⚠️ MARKING REQUIRED</span>':'<span class="sbdg s-done" style="margin-left:8px;font-size:10px">✅ UP TO DATE</span>'}</div>
        <div class="profile-meta"><span>${l.cohort}</span></div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-label">Progress</div><div class="stat-value">${pct}%</div></div>
      <div class="stat-card"><div class="stat-label">Done</div><div class="stat-value">${done}/${l.acs.length}</div></div>
    </div>
    <div class="table-card"><table class="tbl"><thead><tr><th>Unit</th><th>Ref</th><th style="text-align:center">Qty</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  learnerBar('dash-btns', cDash, 'selectDash');
}

function renderMarking() {
  const el = document.getElementById('tab-marking');
  const l = DB.learners[cMark];
  if(!l) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const isDone = isMarkedThisWeek(l.lastMarked);
  const rows = l.acs.map((ac, i) => `<tr><td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td><td>${ac.ref}</td><td><select class="tt-edit-input" style="width:100%" onchange="updateMarking(${i}, this.value)">${STATUSES.map(s=>`<option ${s===(l.progress[i]||'Not started')?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('');

  el.innerHTML = `<div class="page-header"><div class="page-title">Weekly Marking</div></div><div class="learner-bar" id="mark-btns"></div>
    <div class="table-card" style="padding:20px; border-left:5px solid ${isDone?'var(--teal)':'var(--amber)'}">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <div style="font-weight:600;">Status: ${isDone ? '✅ Marked for this week':'⏳ Pending review'}</div>
        <button class="btn-save" style="background:${isDone?'var(--ink3)':'var(--blue)'}" onclick="markNothingToSubmit(${cMark})">${isDone?'Reset Week':'Nothing to mark this week'}</button>
      </div>
      <table class="tbl"><tbody>${rows}</tbody></table>
    </div>`;
  learnerBar('mark-btns', cMark, 'selectMark');
}
function updateMarking(idx, val) { DB.learners[cMark].progress[idx]=val; DB.learners[cMark].lastMarked=Date.now(); save().then(()=>renderMarking()); }
function markNothingToSubmit(i) { DB.learners[i].lastMarked = isMarkedThisWeek(DB.learners[i].lastMarked) ? 0 : Date.now(); save().then(()=>renderMarking()); }

function renderTimetable() {
  const el = document.getElementById('tab-timetable');
  const l = DB.learners[cTT];
  if(!l) { el.innerHTML = '<div class="empty">No learners found.</div>'; return; }
  const rows = l.timetable.map((t, i) => `<tr><td style="text-align:center; font-weight:bold; color:var(--ink3); width:60px;">${i + 1}</td><td style="width:45%"><div style="font-weight:600;">${t.label}</div><div style="font-size:11px; color:var(--ink3); line-height:1.4;">${t.reqs||''}</div></td><td><input type="text" class="tt-edit-input" style="width:100%" value="${t.date||''}" onchange="DB.learners[${cTT}].timetable[${i}].date=this.value;save();"></td></tr>`).join('');
  el.innerHTML = `<div class="page-header"><div class="page-title">Timetable</div></div><div class="learner-bar" id="tt-btns"></div><div class="table-card" style="margin-top:20px;"><table class="tbl"><thead><tr><th style="width:60px; text-align:center;">ID</th><th>Unit</th><th>Deadline</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  learnerBar('tt-btns', cTT, 'selectTT');
}

function renderCourses() {
  const el = document.getElementById('tab-courses');
  const type = currentCourseView;
  const list = type==='dip'?DIPLOMA_ACS:OHE_ACS_NEW;
  const rows = list.map((ac, i) => `<tr class="draggable-row" draggable="true" data-index="${i}" ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" ondrop="handleDrop(event, '${type}')" ondragend="handleDragEnd(event)"><td class="drag-handle">⋮⋮</td><td><input type="text" class="tt-edit-input" style="width:65px" value="${ac.unit||''}" oninput="updateTemplate('${type}',${i},'unit',this.value)" onblur="saveTemplates()"></td><td><input type="text" class="tt-edit-input" style="width:100%" value="${ac.ref||''}" oninput="updateTemplate('${type}',${i},'ref',this.value)" onblur="saveTemplates()"></td><td><input type="number" class="tt-edit-input" style="width:50px" value="${ac.n||1}" oninput="updateTemplate('${type}',${i},'n',this.value)" onblur="saveTemplates()"></td><td><button onclick="deleteMasterAC('${type}',${i})" style="color:var(--red);border:none;background:none;cursor:pointer">✕</button></td></tr>`).join('');
  el.innerHTML = `<div class="page-header"><div class="page-title">Course Templates</div></div><div class="table-card" style="padding:20px;"><div style="margin-bottom:20px"><button class="lpill ${type==='dip'?'active':''}" onclick="currentCourseView='dip';renderCourses()">Diploma</button><button class="lpill ${type==='ohe'?'active':''}" onclick="currentCourseView='ohe';renderCourses()">OHE</button></div><table class="tbl"><thead><tr><th style="width:30px"></th><th>Unit</th><th>Ref</th><th>Qty</th><th></th></tr></thead><tbody>${rows}</tbody></table><button class="btn-save" style="margin-top:20px" onclick="addMasterAC('${type}')">+ Add Row</button></div>`;
}

function saveTemplates() { database.ref('courses').set({ diploma: DIPLOMA_ACS, ohe: OHE_ACS_NEW }).then(() => { DB.learners.forEach(l => syncLearnerToMaster(l)); return save(); }).then(() => renderCourses()); }
function updateTemplate(t, i, f, v) { const arr = t==='dip'?DIPLOMA_ACS:OHE_ACS_NEW; if(arr[i]) arr[i][f] = f==='n'?parseInt(v):v; }
function addMasterAC(t) { (t==='dip'?DIPLOMA_ACS:OHE_ACS_NEW).push({unit:'',ref:'New',n:1}); renderCourses(); }
function deleteMasterAC(t,i) { if(confirm("Delete?")){ (t==='dip'?DIPLOMA_ACS:OHE_ACS_NEW).splice(i,1); saveTemplates(); } }

function renderEdit() {
  const el = document.getElementById('tab-edit');
  if(!DB.learners.length) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const listHTML = DB.learners.map((l, i) => `<div class="table-card" style="padding:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;"><div style="display:flex; align-items:center; gap:15px;"><div class="avatar" style="width:40px; height:40px; font-size:14px;">${initials(l.name)}</div><div><div style="font-weight:600;">${l.name}</div><div style="font-size:12px; color:var(--ink3)">${l.cohort} • ${l.type.toUpperCase()}</div></div></div><div style="display:flex; gap:8px;"><button class="lpill" onclick="openEditForm(${i})">Edit Details</button><button class="lpill" style="color:var(--red); border-color:var(--red);" onclick="deleteLearner(${i})">Delete</button></div></div>`).join('');
  const formHTML = activeEditIdx !== null ? `<div class="table-card" style="padding:25px; margin-top:20px; border-top: 4px solid var(--blue); animation: pagein 0.3s ease;"><h3 style="font-family:'Fraunces',serif; margin-bottom:20px;">Edit Profile: ${DB.learners[activeEditIdx].name}</h3><div class="form-row"><label>Full Name</label><input id="edit-name" class="tt-edit-input" style="width:100%" type="text" value="${DB.learners[activeEditIdx].name}"></div><div class="form-row"><label>Cohort</label><input id="edit-cohort" class="tt-edit-input" style="width:100%" type="text" value="${DB.learners[activeEditIdx].cohort}"></div><div style="margin-top:25px; display:flex; gap:10px;"><button class="btn-save" onclick="saveEditForm()">Save Changes</button><button class="lpill" onclick="activeEditIdx=null; renderEdit()">Cancel</button></div></div>` : '';
  el.innerHTML = `<div class="page-header"><div class="page-title">Manage Learners</div></div><div style="max-width:800px;">${listHTML}${formHTML}</div>`;
}

function openEditForm(i) { activeEditIdx = i; renderEdit(); }
function saveEditForm() {
  const l = DB.learners[activeEditIdx];
  l.name = document.getElementById('edit-name').value;
  l.cohort = document.getElementById('edit-cohort').value;
  save().then(() => { activeEditIdx = null; renderEdit(); });
}
function deleteLearner(i) { if(confirm("Permanently delete this learner?")) { DB.learners.splice(i,1); save().then(() => renderEdit()); } }

// ── ADD LEARNER LOGIC ───────────────────────
async function addLearner() {
  const name = document.getElementById('add-name').value.trim();
  const cohort = document.getElementById('add-cohort').value.trim();
  const type = document.getElementById('add-type').value;
  const rawDates = document.getElementById('add-timetable').value.trim().split('\n');
  if (!name || !cohort) { alert("Enter name and cohort."); return; }
  const masterLabels = type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;
  const timetable = masterLabels.map((m, i) => ({ label: m.label, reqs: m.reqs, date: rawDates[i] ? rawDates[i].trim() : "" }));
  const masterACS = type === 'ohe' ? OHE_ACS_NEW : DIPLOMA_ACS;
  const newLearner = { name, cohort, type, lastMarked: 0, acs: [...masterACS], progress: new Array(masterACS.length).fill('Not started'), timetable: timetable };
  DB.learners.push(newLearner);
  await save();
  document.getElementById('add-msg').innerHTML = "✅ Added!";
  setTimeout(() => { switchTab('dashboard', document.querySelector('.nav-item')); }, 1000);
}

// ── DRAG & DROP ───────────────────────
function handleDragStart(e) { draggedItemIndex = e.target.closest('tr').dataset.index; e.target.closest('tr').classList.add('dragging'); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e, type) {
  e.preventDefault();
  const targetRow = e.target.closest('tr');
  if (!targetRow || draggedItemIndex === null) return;
  const targetIndex = parseInt(targetRow.dataset.index);
  const list = type==='dip'?DIPLOMA_ACS:OHE_ACS_NEW;
  const movedItem = list.splice(draggedItemIndex, 1)[0];
  list.splice(targetIndex, 0, movedItem);
  saveTemplates(); 
}
function handleDragEnd(e) { const row = e.target.closest('tr'); if(row) row.classList.remove('dragging'); draggedItemIndex = null; }

// ── NAVIGATION & BOOTSTRAP ───────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
  if(document.getElementById('tab-' + name)) document.getElementById('tab-' + name).classList.add('active');
  if(btn) btn.classList.add('active');
  activeEditIdx = null; 
  if (name === 'dashboard') renderDashboard();
  if (name === 'marking') renderMarking();
  if (name === 'timetable') renderTimetable();
  if (name === 'courses') renderCourses();
  if (name === 'edit') renderEdit();
}

function selectDash(i){ cDash=i; renderDashboard(); }
function selectMark(i){ cMark=i; renderMarking(); }
function selectTT(i){ cTT=i; renderTimetable(); }

window.onload = initialFirebaseLoad;