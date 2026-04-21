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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ── DATA CORE ───────────────────────
let DB = { learners: [] };
let cDash=0, cMark=0, cTT=0, cEdit=0;

// ── SYNC LOGIC ───────────────────────

/**
 * SAVE: Writes current DB state to Firebase backups/latest_sync
 */
function save() {
  database.ref('backups/latest_sync').set(DB)
    .then(() => console.log("Cloud Sync Successful"))
    .catch((error) => console.error("Cloud Sync Failed:", error));
}

/**
 * INITIAL LOAD: Pulls data from Cloud on startup
 */
function initialFirebaseLoad() {
  const dashEl = document.getElementById('tab-dashboard');
  if(dashEl) dashEl.innerHTML = '<div class="empty">Connecting to Firebase...</div>';

  database.ref('backups/latest_sync').once('value')
    .then((snapshot) => {
      const data = snapshot.val();
      if (data && data.learners) {
        DB = data;
        console.log("Data loaded from Firebase.");
      } else {
        console.log("No cloud data found. Loading defaults.");
        DB = getDefault();
        save(); 
      }
      renderDashboard(); 
    })
    .catch((error) => {
      console.error("Firebase Error:", error);
      DB = getDefault();
      renderDashboard();
    });
}

// ── LEARNER MANAGEMENT (FIXES YOUR ERROR) ───────────────────────

/**
 * ADD LEARNER: Triggered by the button in your index.html
 */
function addLearner() {
  const name = document.getElementById('add-name').value.trim();
  const cohort = document.getElementById('add-cohort').value.trim();
  const type = document.getElementById('add-type').value;
  const start = document.getElementById('add-start').value;
  const end = document.getElementById('add-end').value;
  const ttRaw = document.getElementById('add-timetable').value.trim();
  
  if(!name) { alert("Please enter a name"); return; }

  const acVersion = type === 'ohe' ? 'ohe_new' : 'diploma';
  const al = type === 'ohe' ? OHE_ACS_NEW : DIPLOMA_ACS;
  const tl = type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;
  
  // Prepare timetable dates
  const timetable = tl.map(() => '');
  if(ttRaw) {
    ttRaw.split('\n').forEach((line, i) => {
      if(i < timetable.length) timetable[i] = line.trim();
    });
  }

  const newLearner = {
    id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name, cohort, type, acVersion, start, end, timetable,
    progress: al.map(() => 'Not started'),
    acs: al.map(ac => ({...ac})),
    ttRows: tl.map((t, i) => ({ label: t.label, reqs: t.reqs || '', deadline: timetable[i] || '' }))
  };

  DB.learners.push(newLearner);
  
  // Automatic Sync
  save(); 
  
  // Reset form and UI
  document.getElementById('add-name').value = '';
  alert(name + " added and synced to Cloud!");
  renderDashboard();
}

function deleteLearner(index) {
  if(confirm("Are you sure you want to delete " + DB.learners[index].name + "?")) {
    DB.learners.splice(index, 1);
    save();
    cDash = 0;
    renderDashboard();
    renderEdit();
  }
}

// ── UTILITIES & DATA STRUCTURES ───────────────────────

const DIPLOMA_ACS = [
  {unit:1, ref:'1.1.1',n:1},{unit:1, ref:'1.1.4',n:1},{unit:1, ref:'1.1.5',n:1},
  {unit:1, ref:'1.1.7',n:1},{unit:1, ref:'1.1.8',n:1},{unit:1, ref:'1.1.9, 1.2.10',n:2},
  {unit:1, ref:'1.3.2',n:1},{unit:1, ref:'1.2.2, 1.3.4',n:2},{unit:1, ref:'1.3.1, 1.3.3',n:2},
  {unit:1, ref:'1.2.1',n:1},{unit:1, ref:'5.1.8, 5.1.9',n:2},{unit:1, ref:'5.1.10',n:1},
  {unit:9, ref:'9.1.2',n:1},{unit:9, ref:'9.1.4',n:1},{unit:9, ref:'9.1.5',n:1},
  {unit:9, ref:'9.1.7',n:1},{unit:9, ref:'9.1.8',n:1},{unit:9, ref:'9.2.1, 9.2.4',n:2},
  {unit:9, ref:'9.2.2, 9.2.3, 9.3.2, 9.3.3',n:4},{unit:9, ref:'9.2.5',n:1},
  {unit:9, ref:'9.2.6, 9.2.7',n:2},{unit:9, ref:'9.2.8',n:1},{unit:9, ref:'9.2.9',n:1},
  {unit:2, ref:'2.1.1, 2.2.2, 2.2.3',n:3},{unit:2, ref:'2.1.1',n:1},{unit:2, ref:'2.1.7',n:1},
  {unit:2, ref:'2.2.4',n:1},{unit:2, ref:'2.3.1, 2.3.2, 2.3.3, 2.3.5, 2.3.7',n:5},
  {unit:3, ref:'1.1.6, 3.1.3',n:2},{unit:3, ref:'3.1.2, 3.1.4',n:2},{unit:3, ref:'6.1.7',n:1},
  {unit:10,ref:'10.1.2',n:1},{unit:10,ref:'10.1.3, 10.1.4',n:2},{unit:10,ref:'10.1.5',n:1},
  {unit:10,ref:'10.2.2',n:1},{unit:10,ref:'10.2.3',n:1},
  {unit:4, ref:'4.1.2',n:1},{unit:4, ref:'4.1.3',n:1},{unit:4, ref:'4.1.4',n:1},
  {unit:4, ref:'4.2.1, 4.2.3, 4.2.4, 4.2.5, 4.2.6',n:5},
  {unit:5, ref:'5.1.6',n:1},{unit:5, ref:'5.2.1, 5.1.5',n:2},{unit:5, ref:'5.1.3',n:1},
  {unit:5, ref:'5.1.7',n:1},{unit:5, ref:'5.1.12',n:1},{unit:5, ref:'5.1.14',n:1},
  {unit:5, ref:'5.1.1',n:1},{unit:5, ref:'5.1.2',n:1},{unit:5, ref:'5.1.4',n:1},
  {unit:5, ref:'5.2.15',n:1},{unit:5, ref:'5.2.6',n:1}
];

const OHE_ACS_NEW = [
  {unit:'SO', ref:'SO1 – Exhibition/Display/Presentation',n:1},
  {unit:'SO', ref:'SO2 – Reflective Account (Part 1)',n:1},
  {unit:'SO', ref:'SO3 – PDP/CPD Log',n:1},
  {unit:'PCA',ref:'PCA 1',n:1},{unit:'PCA',ref:'PCA 2',n:1},{unit:'PCA',ref:'PCA 3',n:1},
  {unit:'PCA',ref:'PCA 4',n:1},{unit:'PCA',ref:'PCA 5',n:1},{unit:'PCA',ref:'PCA 6',n:1},
  {unit:'PCA',ref:'PCA 7',n:1},{unit:'PCA',ref:'PCA 8',n:1},{unit:'PCA',ref:'PCA 9',n:1},
  {unit:'PCA',ref:'PCA 10',n:1},{unit:'PCA',ref:'PCA 11',n:1},
  {unit:'CS', ref:'Case Study – Visit 1',n:1},
  {unit:'CS', ref:'Case Study – Visit 2',n:1},
  {unit:'CS', ref:'Case Study – Visit 3 + Report',n:1},
  {unit:'SO', ref:'SO2 – Reflective Account (Part 2)',n:1}
];

const DIPLOMA_TT_LABELS = [
  {label:'Professional Practice – Unit 1c',reqs:'2 Knowledge evidence questions\nMWT Decontamination\nMWT Clinical Environment'},
  {label:'CPD – Unit 9',reqs:'5 Knowledge evidence questions\n5 PE submissions (spaced over course)'},
  {label:'Leading, Managing & Teamworking – Unit 2',reqs:'3 Knowledge evidence questions\nReflective account\nObservation'},
  {label:'Communication – Unit 3',reqs:'3 Knowledge evidence questions\nMWT Professionalism'},
  {label:'Respond to Risks & Medical Emergencies – Unit 10',reqs:'2 Knowledge evidence questions\n2 Tables\n1 PE assignment\nMedical emergency certificate'},
  {label:'Inclusive Practice – Unit 4',reqs:'3 Knowledge evidence questions\nProfessional discussion (Teams)'},
  {label:'Clinical Practice – Assessment & Diagnosis 5a',reqs:'1 Knowledge evidence question\n1 Workbook\nMWT Clinical assessment Child\nMWT Clinical assessment Adult'},
  {label:'Clinical Practice – Assessment & Diagnosis 5b',reqs:'2 Knowledge evidence questions\nMWT Radiography'},
  {label:'Clinical Practice – Assessment & Diagnosis 5c',reqs:'3 Knowledge evidence questions\nMWT Periodontology'},
  {label:'Treatment Planning – Unit 6a',reqs:'5 Knowledge evidence questions (split 6a/6b)\n2 PE\nMWT Restorative\nMWT Endodontics x2\nMWT Non-Surgical Extraction'},
  {label:'Treatment Planning – Unit 6b',reqs:'5 Knowledge evidence questions (split 6a/6b)\n2 PE\nMWT Fixed Prosthesis x2\nMWT Removable Prosthesis x2'},
  {label:'Health & Wellbeing – Unit 8',reqs:'5 Knowledge evidence questions\n1 PE'},
  {label:'Promoting Oral Health – Unit 7',reqs:'10 Knowledge evidence questions\n2 PE\nMWT OHI simulation'},
  {label:'Final Consolidation & Portfolio',reqs:'All outstanding work finalised\nPortfolio complete'}
];

const OHE_TT_LABELS = [
  {label:'Phase 1 – Theory & SO1',reqs:''},{label:'Phase 2 – PCAs 1–3',reqs:''},
  {label:'Phase 3 – PCAs 4–6',reqs:''},{label:'Phase 4 – PCAs 7–9',reqs:''},
  {label:'Phase 5 – PCAs 10–11 + Case Study',reqs:''},{label:'Phase 6 – SOs complete + ROC',reqs:''},
  {label:'Exam',reqs:''}
];

const STATUSES = ['Not started','Requires amendments','Completed'];

function badge(s){
  if(s==='Completed')           return '<span class="sbdg s-done">Completed</span>';
  if(s==='Requires amendments') return '<span class="sbdg s-amend">Requires amendments</span>';
  if(s==='In Progress')         return '<span class="sbdg s-prog">In progress</span>';
  return '<span class="sbdg s-none">Not started</span>';
}

function initials(n){return n.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
function fmtDate(d){if(!d)return'—';try{return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d}}
function acList(l){return l.type==='ohe'?OHE_ACS_NEW:DIPLOMA_ACS}
function ttLabels(l){return l.type==='ohe'?OHE_TT_LABELS:DIPLOMA_TT_LABELS}

function ubdgClass(u){
  if(u==='SO') return 'ubdg ubdg-so';
  if(u==='CS') return 'ubdg ubdg-cs';
  if(u==='PCA') return 'ubdg ubdg-pca';
  return 'ubdg ubdg-d';
}

function ubdgLabel(u){return typeof u==='number'?`Unit ${u}`:u}

function getDefault(){
  return { learners: [] };
}

// ── DASHBOARD RENDERING ───────────────────────

function getStats(l){
  const al=acList(l);
  const completedN=al.reduce((a,ac,i)=>a+(l.progress[i]==='Completed'?(ac.n||1):0),0);
  const totalN=al.reduce((a,ac)=>a+(ac.n||1),0);
  const amend=l.progress.filter(s=>s==='Requires amendments').length;
  const pct=Math.round((completedN/totalN)*100) || 0;
  return{completedN,totalN,amend,pct};
}

function learnerBar(id,curr,fn){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=DB.learners.map((l,i)=>`
    <button class="lpill${i===curr?' active':''}" onclick="${fn}(${i})">
      <span class="lpill-dot"></span>${l.name}
    </button>`).join('');
}

function renderDashboard(){
  const el=document.getElementById('tab-dashboard');
  if(!DB.learners.length){el.innerHTML='<div class="empty">No learners yet. Add one in the Settings tab.</div>';return;}
  const l=DB.learners[cDash];
  const al=acList(l);
  const s=getStats(l);
  const pbClass=s.pct>=50?'':s.pct>=25?'amber':'red';

  const rows=al.map((ac,i)=>{
    const st=l.progress[i]||'Not started';
    return`<tr>
      <td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td>
      <td class="ac-ref">${ac.ref}</td>
      <td style="text-align:center">${ac.n||1}</td>
      <td>${badge(st)}</td>
    </tr>`;
  }).join('');

  el.innerHTML=`
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
      <div class="stat-card"><div class="stat-label">Progress</div><div class="stat-value">${s.pct}%</div></div>
      <div class="stat-card"><div class="stat-label">Done</div><div class="stat-value">${s.completedN}/${s.totalN}</div></div>
    </div>
    <div class="table-card">
      <table class="tbl">
        <thead><tr><th>Unit</th><th>Reference</th><th>Qty</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  learnerBar('dash-btns',cDash,'selectDash');
}
function selectDash(i){cDash=i;renderDashboard()}

// ── MARKING VIEW ───────────────────────

function renderMarking(){
  const el=document.getElementById('tab-marking');
  if(!DB.learners.length){el.innerHTML='<div class="empty">No learners yet.</div>';return;}
  const l=DB.learners[cMark];
  const al=acList(l);
  const rows=al.map((ac,i)=>{
    const curr=l.progress[i]||'Not started';
    const opts=STATUSES.map(s=>`<option${s===curr?' selected':''}>${s}</option>`).join('');
    return`<tr>
      <td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td>
      <td>${ac.ref}</td>
      <td><select onchange="updateStatus(${cMark},${i},this.value)">${opts}</select></td>
    </tr>`;
  }).join('');
  el.innerHTML=`
    <div class="page-header"><div class="page-title">Marking</div></div>
    <div class="learner-bar" id="mark-btns"></div>
    <div class="table-card">
      <table class="tbl"><tbody>${rows}</tbody></table>
      <div class="save-row">
        <button class="btn-save" onclick="saveProgress()">Save Changes</button>
        <span id="mark-saved" class="saved-msg" style="display:none">✓ Cloud Synced</span>
      </div>
    </div>`;
  learnerBar('mark-btns',cMark,'selectMark');
}
function selectMark(i){cMark=i;renderMarking()}
function updateStatus(li,ui,val){DB.learners[li].progress[ui]=val}
function saveProgress(){ save(); document.getElementById('mark-saved').style.display='inline'; setTimeout(()=>document.getElementById('mark-saved').style.display='none',2000); }

// ── NAVIGATION & BOOTSTRAP ───────────────────────

function switchTab(name, btn) {
  // 1. Reset all views and buttons
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
  
  // 2. Activate the clicked one
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('active');
  btn.classList.add('active');

  // 3. Trigger the specific render logic
  if (name === 'dashboard') renderDashboard();
  if (name === 'marking') renderMarking();
  if (name === 'timetable') renderTimetable();
  if (name === 'edit') renderEdit();
}

function renderTimetable() {
  const el = document.getElementById('tab-timetable');
  if (!DB.learners.length) { el.innerHTML = '<div class="empty">No learners found.</div>'; return; }
  
  const l = DB.learners[cTT]; // cTT is your current Timetable learner index
  const labels = l.type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;

  // Build the table rows
  const rows = labels.map((t, i) => `
    <tr>
      <td style="width:50%">
        <div style="font-weight:600; color:var(--ink)">${t.label}</div>
        <div style="font-size:11px; color:var(--ink3)">${t.reqs || ''}</div>
      </td>
      <td>
        <input type="text" class="tt-input" 
               value="${l.timetable ? l.timetable[i] : ''}" 
               onchange="updateTTDate(${cTT}, ${i}, this.value)"
               placeholder="e.g. 12 May 26">
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Timetable</div>
      <div class="page-sub">Set deadlines for ${l.name}</div>
    </div>
    <div class="learner-bar" id="tt-btns"></div>
    <div class="table-card">
      <table class="tbl">
        <thead><tr><th>Unit / Phase</th><th>Deadline Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="padding:16px; border-top:1px solid var(--border)">
         <button class="btn-save" onclick="save()">Save Timetable to Cloud</button>
      </div>
    </div>`;
    
  renderBar('tt-btns', cTT, 'selectTT');
}

function updateTTDate(li, index, val) {
  if (!DB.learners[li].timetable) DB.learners[li].timetable = [];
  DB.learners[li].timetable[index] = val;
  // We don't save() here to avoid lag; user clicks the Save button
}

function selectTT(i) { cTT = i; renderTimetable(); }

function renderEdit() {
  const el = document.getElementById('tab-edit');
  if (!DB.learners.length) { 
    el.innerHTML = '<div class="empty">No learners to edit.</div>'; 
    return; 
  }

  const cards = DB.learners.map((l, i) => `
    <div class="table-card" id="edit-card-${i}" style="padding:16px; margin-bottom:12px;">
      <div id="view-mode-${i}" style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-weight:700; color:var(--ink); font-size:16px;">${l.name}</div>
          <div style="font-size:12px; color:var(--ink3)">${l.cohort} • ${l.type.toUpperCase()}</div>
        </div>
        <div>
          <button class="btn-save" onclick="toggleEditForm(${i}, true)" style="margin-right:8px; background:#e2e8f0; color:#475569;">Edit</button>
          <button class="btn-red" onclick="deleteLearner(${i})" style="background:var(--red-light); color:var(--red); border:none; padding:8px 12px; border-radius:6px; font-weight:600; cursor:pointer;">
            Delete
          </button>
        </div>
      </div>

      <div id="edit-mode-${i}" style="display:none; flex-direction:column; gap:10px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:11px; font-weight:700;">NAME</label>
            <input type="text" id="edit-name-${i}" value="${l.name}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700;">COHORT</label>
            <input type="text" id="edit-cohort-${i}" value="${l.cohort}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:11px; font-weight:700;">START DATE</label>
            <input type="date" id="edit-start-${i}" value="${l.start || ''}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700;">END DATE</label>
            <input type="date" id="edit-end-${i}" value="${l.end || ''}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="btn-save" onclick="updateLearner(${i})">Save Changes</button>
          <button class="btn-save" onclick="toggleEditForm(${i}, false)" style="background:#f1f5f9; color:#64748b;">Cancel</button>
        </div>
      </div>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Manage Learners</div>
      <div class="page-sub">Update learner profiles or remove them</div>
    </div>
    <div style="max-width:600px">${cards}</div>`;
}

/**
 * Toggles between the display view and the edit form
 */
function toggleEditForm(index, isEditing) {
  document.getElementById(`view-mode-${index}`).style.display = isEditing ? 'none' : 'flex';
  document.getElementById(`edit-mode-${index}`).style.display = isEditing ? 'flex' : 'none';
}

/**
 * Saves updated details back to the DB object and Firebase
 */
function updateLearner(i) {
  const newName = document.getElementById(`edit-name-${i}`).value.trim();
  const newCohort = document.getElementById(`edit-cohort-${i}`).value.trim();
  const newStart = document.getElementById(`edit-start-${i}`).value;
  const newEnd = document.getElementById(`edit-end-${i}`).value;

  if (!newName) { alert("Name cannot be empty"); return; }

  // Update local DB object
  DB.learners[i].name = newName;
  DB.learners[i].cohort = newCohort;
  DB.learners[i].start = newStart;
  DB.learners[i].end = newEnd;

  // Sync to Firebase
  save(); 
  
  // Refresh UI
  renderEdit();
  renderDashboard();
  alert("Learner updated successfully!");
}

/**
 * Toggles between the display view and the edit form
 */
function toggleEditForm(index, isEditing) {
  document.getElementById(`view-mode-${index}`).style.display = isEditing ? 'none' : 'flex';
  document.getElementById(`edit-mode-${index}`).style.display = isEditing ? 'flex' : 'none';
}

/**
 * Saves updated details back to the DB object and Firebase
 */
function updateLearner(i) {
  const newName = document.getElementById(`edit-name-${i}`).value.trim();
  const newCohort = document.getElementById(`edit-cohort-${i}`).value.trim();
  const newStart = document.getElementById(`edit-start-${i}`).value;
  const newEnd = document.getElementById(`edit-end-${i}`).value;

  if (!newName) { alert("Name cannot be empty"); return; }

  // Update local DB object
  DB.learners[i].name = newName;
  DB.learners[i].cohort = newCohort;
  DB.learners[i].start = newStart;
  DB.learners[i].end = newEnd;

  // Sync to Firebase
  save(); 
  
  // Refresh UI
  renderEdit();
  renderDashboard();
  alert("Learner updated successfully!");
}

/**
 * Toggles between the display view and the edit form
 */
function toggleEditForm(index, isEditing) {
  document.getElementById(`view-mode-${index}`).style.display = isEditing ? 'none' : 'flex';
  document.getElementById(`edit-mode-${index}`).style.display = isEditing ? 'flex' : 'none';
}

/**
 * Saves updated details back to the DB object and Firebase
 */
function updateLearner(i) {
  const newName = document.getElementById(`edit-name-${i}`).value.trim();
  const newCohort = document.getElementById(`edit-cohort-${i}`).value.trim();
  const newStart = document.getElementById(`edit-start-${i}`).value;
  const newEnd = document.getElementById(`edit-end-${i}`).value;

  if (!newName) { alert("Name cannot be empty"); return; }

  // Update local DB object
  DB.learners[i].name = newName;
  DB.learners[i].cohort = newCohort;
  DB.learners[i].start = newStart;
  DB.learners[i].end = newEnd;

  // Sync to Firebase
  save(); 
  
  // Refresh UI
  renderEdit();
  renderDashboard();
  alert("Learner updated successfully!");
}

function deleteLearner(i) {
  if (confirm(`Are you sure you want to delete ${DB.learners[i].name}? This cannot be undone.`)) {
    DB.learners.splice(i, 1);
    save(); // Sync to Firebase
    renderEdit();
    renderDashboard();
  }
}

window.onload = () => { initialFirebaseLoad(); };
script.js
