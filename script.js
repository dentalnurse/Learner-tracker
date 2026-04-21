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

function save() {
  database.ref('backups/latest_sync').set(DB)
    .then(() => console.log("Cloud Sync Successful"))
    .catch((error) => console.error("Cloud Sync Failed:", error));
}

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
        DB = { learners: [] };
        save(); 
      }
      renderDashboard(); 
    })
    .catch((error) => {
      console.error("Firebase Error:", error);
      renderDashboard();
    });
}

// ── LEARNER MANAGEMENT ───────────────────────

function addLearner() {
  const name = document.getElementById('add-name').value.trim();
  const cohort = document.getElementById('add-cohort').value.trim();
  const type = document.getElementById('add-type').value;
  const start = document.getElementById('add-start').value;
  const end = document.getElementById('add-end').value;
  const ttRaw = document.getElementById('add-timetable').value.trim();
  
  if(!name) { alert("Please enter a name"); return; }

  const al = type === 'ohe' ? OHE_ACS_NEW : DIPLOMA_ACS;
  const tl = type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;
  
  // Initialize timetable as an array of objects immediately
  const timetable = tl.map((t) => ({ 
    label: t.label, 
    reqs: t.reqs || '', 
    date: '' 
  }));

  if(ttRaw) {
    ttRaw.split('\n').forEach((line, i) => {
      if(i < timetable.length) {
        // Support "ID - Date" or just "Date" during initial add
        const parts = line.split('-');
        timetable[i].date = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      }
    });
  }

  const newLearner = {
    id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name, cohort, type, start, end, 
    timetable, // This is now an array of objects
    progress: al.map(() => 'Not started'),
    acs: al.map(ac => ({...ac}))
  };

  DB.learners.push(newLearner);
  save(); 
  
  document.getElementById('add-name').value = '';
  alert(name + " added!");
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

// ── DATA STRUCTURES ───────────────────────

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
  {label:'Phase 1 – Theory',reqs:''},{label:'Phase 2 – PCAs 1–3',reqs:''},
  {label:'Phase 3 – PCAs 4–6',reqs:''},{label:'Phase 4 – PCAs 7–9',reqs:''},
  {label:'Phase 5 – PCAs 10–11',reqs:''},{label:'Phase 6 – SOs',reqs:''},
  {label:'Exam',reqs:''}
];

const STATUSES = ['Not started','Requires amendments','Completed'];

// ── UI HELPERS ───────────────────────

function badge(s){
  if(s==='Completed') return '<span class="sbdg s-done">Completed</span>';
  if(s==='Requires amendments') return '<span class="sbdg s-amend">Requires amendments</span>';
  return '<span class="sbdg s-none">Not started</span>';
}

function initials(n){return n.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
function acList(l){return l.type==='ohe'?OHE_ACS_NEW:DIPLOMA_ACS}
function ubdgClass(u){
  if(u==='SO') return 'ubdg ubdg-so';
  if(u==='CS') return 'ubdg ubdg-cs';
  if(u==='PCA') return 'ubdg ubdg-pca';
  return 'ubdg ubdg-d';
}
function ubdgLabel(u){return typeof u==='number'?`Unit ${u}`:u}

function learnerBar(id,curr,fn){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=DB.learners.map((l,i)=>`
    <button class="lpill${i===curr?' active':''}" onclick="${fn}(${i})">
      <span class="lpill-dot"></span>${l.name}
    </button>`).join('');
}

// ── NAVIGATION ───────────────────────

function switchTab(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('active');
  btn.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'marking') renderMarking();
  if (name === 'timetable') renderTimetable();
  if (name === 'edit') renderEdit();
}

// ── DASHBOARD ───────────────────────

function getStats(l){
  const al=acList(l);
  const completedN=al.reduce((a,ac,i)=>a+(l.progress[i]==='Completed'?(ac.n||1):0),0);
  const totalN=al.reduce((a,ac)=>a+(ac.n||1),0);
  const pct=Math.round((completedN/totalN)*100) || 0;
  return{completedN,totalN,pct};
}

function renderDashboard(){
  const el = document.getElementById('tab-dashboard');
  if(!DB.learners.length){ el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const l = DB.learners[cDash];
  const al = acList(l);
  const s = getStats(l);

  const rows = al.map((ac, idx) => `
    <tr>
      <td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td>
      <td class="ac-ref">${ac.ref}</td>
      <td style="text-align:center">${ac.n||1}</td>
      <td>${badge(l.progress[idx])}</td>
    </tr>`).join('');

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
      <div class="stat-card"><div class="stat-label">Progress</div><div class="stat-value">${s.pct}%</div></div>
      <div class="stat-card"><div class="stat-label">Done</div><div class="stat-value">${s.completedN}/${s.totalN}</div></div>
    </div>
    <div class="table-card"><table class="tbl"><tbody>${rows}</tbody></table></div>`;
    
  learnerBar('dash-btns', cDash, 'selectDash');
}
function selectDash(i){cDash=i;renderDashboard()}

// ── MARKING ───────────────────────

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
      <td><select onchange="DB.learners[${cMark}].progress[${i}]=this.value">${opts}</select></td>
    </tr>`;
  }).join('');
  el.innerHTML=`
    <div class="page-header"><div class="page-title">Marking</div></div>
    <div class="learner-bar" id="mark-btns"></div>
    <div class="table-card">
      <table class="tbl"><tbody>${rows}</tbody></table>
      <div class="save-row"><button class="btn-save" onclick="save()">Save to Cloud</button></div>
    </div>`;
  learnerBar('mark-btns',cMark,'selectMark');
}
function selectMark(i){cMark=i;renderMarking()}

// ── DYNAMIC TIMETABLE ───────────────────────

/**
 * Renders the Timetable view with visible IDs for bulk mapping
 */
function renderTimetable() {
  const el = document.getElementById('tab-timetable');
  if (!DB.learners.length) { el.innerHTML = '<div class="empty">No learners found.</div>'; return; }
  
  const l = DB.learners[cTT]; 
  const labels = l.type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;

  // Build the table rows with an ID column (index + 1)
  const rows = labels.map((t, i) => `
    <tr>
      <td style="width:10%; text-align:center; font-weight:bold; color:var(--ink3)">${i + 1}</td>
      <td style="width:45%">
        <div style="font-weight:600; color:var(--ink)">${t.label}</div>
        <div style="font-size:11px; color:var(--ink3)">${t.reqs || ''}</div>
      </td>
      <td>
        <input type="text" class="tt-input" 
        value="${l.timetable[i].date || ''}" 
        onchange="updateTTDate(${cTT}, ${i}, this.value)"
        placeholder="e.g. 12 May 26">
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Timetable Management</div>
      <div class="page-sub">Set deadlines for <strong>${l.name}</strong></div>
    </div>
    
    <div class="learner-bar" id="tt-btns"></div>

    <div style="display: grid; grid-template-columns: 1fr 320px; gap: 20px; margin-top:20px;">
      <div class="table-card">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:40px">ID</th>
              <th>Unit / Phase</th>
              <th>Deadline Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="padding:16px; border-top:1px solid var(--border)">
           <button class="btn-save" onclick="save()">Save Timetable to Cloud</button>
        </div>
      </div>

      <div class="table-card" style="padding:15px; background:#f8fafc;">
        <h4 style="margin:0 0 10px 0;">Bulk ID Import</h4>
        <p style="font-size:11px; color:#666; margin-bottom:10px;">
          Paste list as: <strong>ID - Date</strong><br>
          Example:<br>
          1 - 01/01/2026<br>
          2 - 02/02/2026
        </p>
        <textarea id="bulk-id-input" style="width:100%; height:250px; padding:10px; border:1px solid #ccc; border-radius:4px; font-family:monospace; font-size:12px;"></textarea>
        <button class="btn-save" style="width:100%; margin-top:10px;" onclick="applyIDBulkImport(${cTT})">Process Bulk List</button>
      </div>
    </div>`;
    
  learnerBar('tt-btns', cTT, 'selectTT');
}

/**
 * Processes the "ID - Date" bulk format
 */
function applyIDBulkImport(li) {
  const input = document.getElementById('bulk-id-input').value.trim();
  if (!input) return;

  const lines = input.split('\n');
  let updateCount = 0;
  const learner = DB.learners[li];

  if (!learner.timetable) {
    const tl = learner.type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;
    learner.timetable = tl.map(t => ({ label: t.label, date: '', reqs: t.reqs || '' }));
  }

  lines.forEach(line => {
    const match = line.match(/^(\d+)[\s\-:]+(.*)$/);
    if (match) {
      const inputID = parseInt(match[1]);
      const dateVal = match[2].trim();
      const arrayIndex = inputID - 1;

      if (arrayIndex >= 0 && arrayIndex < learner.timetable.length) {
        learner.timetable[arrayIndex].date = dateVal;
        updateCount++;
      }
    }
  });

  if (updateCount > 0) {
    renderTimetable();
    save(); // <--- This triggers the auto-sync for the whole list
    alert(`Successfully synced ${updateCount} dates to the cloud!`);
  } else {
    alert("No valid IDs found. Use format: 1 - Date");
  }
}

function updateTTDate(li, index, val) {
  if (!DB.learners[li].timetable) return;

  // Update the local data
  if (typeof DB.learners[li].timetable[index] === 'object') {
    DB.learners[li].timetable[index].date = val;
  } else {
    DB.learners[li].timetable[index] = { label: "Target", date: val, reqs: "" };
  }

  // Auto-Sync to Cloud
  save(); 
  console.log(`Auto-synced date for ${DB.learners[li].name}`);
}

function selectTT(i) { cTT = i; renderTimetable(); }
function addTTRow() { DB.learners[cTT].timetable.push({ label: "New Target", date: "", reqs: "" }); renderTimetable(); }
function removeTTRow(i) { DB.learners[cTT].timetable.splice(i, 1); renderTimetable(); }

function applyBulkTimetable(idx) {
  const text = document.getElementById('bulk-tt-input').value.trim();
  if(!text) return;
  DB.learners[idx].timetable = text.split('\n').map(line => {
    const [name, date] = line.split('|');
    return { label: name ? name.trim() : "Target", date: date ? date.trim() : "", reqs: "" };
  });
  save(); renderTimetable();
}

// ── EDIT / SETTINGS ───────────────────────

function renderEdit() {
  const el = document.getElementById('tab-edit');
  if (!DB.learners.length) { el.innerHTML = '<div class="empty">No learners to manage.</div>'; return; }

  el.innerHTML = `
    <div class="page-header"><div class="page-title">Manage Learners</div></div>
    <div style="max-width: 850px;">
    ${DB.learners.map((l, i) => {
      
      // --- SORTING LOGIC START ---
      // We sort the indices based on the Unit and Reference
      const sortedIndices = l.acs.map((_, index) => index).sort((a, b) => {
        const acA = l.acs[a];
        const acB = l.acs[b];
        
        const unitA = parseInt(acA.unit) || 0;
        const unitB = parseInt(acB.unit) || 0;
        
        if (unitA !== unitB) return unitA - unitB;
        return acA.ref.localeCompare(acB.ref, undefined, { numeric: true });
      });
      // --- SORTING LOGIC END ---

      const acRows = sortedIndices.map((acIdx) => {
        const ac = l.acs[acIdx];
        const currStatus = l.progress[acIdx] || 'Not started';
        const opts = STATUSES.map(s => `<option value="${s}" ${s === currStatus ? 'selected' : ''}>${s}</option>`).join('');
        
        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:8px 4px;"><input type="text" id="edit-unit-${i}-${acIdx}" value="${ac.unit}" style="width:55px; padding:5px; border:1px solid #cbd5e1; border-radius:4px;"></td>
            <td style="padding:8px 4px;"><input type="text" id="edit-ref-${i}-${acIdx}" value="${ac.ref}" style="width:100%; padding:5px; border:1px solid #cbd5e1; border-radius:4px;"></td>
            <td style="padding:8px 4px;"><input type="number" id="edit-qty-${i}-${acIdx}" value="${ac.n || 1}" style="width:45px; padding:5px; border:1px solid #cbd5e1; border-radius:4px;"></td>
            <td style="padding:8px 4px;">
              <select id="edit-status-${i}-${acIdx}" style="width:100%; padding:5px; border:1px solid #cbd5e1; border-radius:4px;">${opts}</select>
            </td>
            <td style="padding:8px 4px; text-align:center;">
              <button onclick="removeACRow(${i}, ${acIdx})" style="background:none; border:none; color:#dc2626; cursor:pointer; font-weight:bold;">✕</button>
            </td>
          </tr>`;
      }).join('');

      return `
      <div class="table-card" style="padding:20px; margin-bottom:20px; border-left: 5px solid #64748b;">
        <div id="view-mode-${i}" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; font-size:1.1rem; color:var(--ink);">${l.name}</div>
            <div style="font-size:0.85rem; color:#64748b;">${l.cohort} • ${l.type.toUpperCase()}</div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn-save" onclick="toggleEditForm(${i}, true)" style="background:#e2e8f0; color:#475569;">Edit Details & ACs</button>
            <button class="btn-red" onclick="deleteLearner(${i})" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">Delete</button>
          </div>
        </div>

        <div id="edit-mode-${i}" style="display:none; flex-direction:column; gap:15px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:4px;">NAME</label>
              <input type="text" id="edit-name-${i}" value="${l.name}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:4px;">
            </div>
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:4px;">COHORT</label>
              <input type="text" id="edit-cohort-${i}" value="${l.cohort}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:4px;">
            </div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
            <div style="padding:10px; background:#fff; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:800; color:#475569;">UNIT CRITERIA (ACs)</span>
              <button onclick="addACRow(${i})" style="font-size:11px; padding:5px 10px; cursor:pointer; background:#fff; border:1px solid #cbd5e1; border-radius:4px;">+ Add Unit</button>
            </div>
            <table style="width:100%; border-collapse:collapse; background:#fff;">
              <thead style="background:#f1f5f9;">
                <tr style="font-size:10px; text-align:left; color:#64748b;">
                  <th style="padding:8px;">UNIT</th>
                  <th style="padding:8px;">REF</th>
                  <th style="padding:8px;">QTY</th>
                  <th style="padding:8px;">STATUS</th>
                  <th style="width:30px;"></th>
                </tr>
              </thead>
              <tbody>${acRows}</tbody>
            </table>
          </div>

          <div style="display:flex; gap:12px; margin-top:5px; padding-top:15px; border-top:1px solid #eee;">
            <button class="btn-save" onclick="updateLearner(${i})">Save Changes</button>
            <button class="btn-save" style="background:#f1f5f9; color:#64748b;" onclick="toggleEditForm(${i}, false)">Cancel</button>
          </div>
        </div>
      </div>`}).join('')}
    </div>`;
}

function addACRow(li) {
  DB.learners[li].acs.push({ unit: '', ref: '', n: 1 });
  DB.learners[li].progress.push('Not started');
  renderEdit();
}

function removeACRow(li, aci) {
  if (confirm("Remove this unit criteria?")) {
    DB.learners[li].acs.splice(aci, 1);
    DB.learners[li].progress.splice(aci, 1);
    renderEdit();
  }
}

function updateLearner(i) {
  const newName = document.getElementById(`edit-name-${i}`).value.trim();
  const newCohort = document.getElementById(`edit-cohort-${i}`).value.trim();

  if (!newName) { alert("Name is required"); return; }

  // Update Main Details
  DB.learners[i].name = newName;
  DB.learners[i].cohort = newCohort;

  // Update ACs and Statuses by looping through the table inputs
  DB.learners[i].acs.forEach((ac, acIdx) => {
    const u = document.getElementById(`edit-unit-${i}-${acIdx}`).value;
    const r = document.getElementById(`edit-ref-${i}-${acIdx}`).value;
    const q = document.getElementById(`edit-qty-${i}-${acIdx}`).value;
    const s = document.getElementById(`edit-status-${i}-${acIdx}`).value;

    DB.learners[i].acs[acIdx] = { unit: u, ref: r, n: parseInt(q) || 1 };
    DB.learners[i].progress[acIdx] = s;
  });

  save(); // Sync to Firebase
  renderEdit();
  renderDashboard();
  alert("Learner and ACs updated successfully!");
}

function toggleEditForm(i, edit) {
  document.getElementById(`view-mode-${i}`).style.display = edit ? 'none' : 'flex';
  document.getElementById(`edit-mode-${i}`).style.display = edit ? 'flex' : 'none';
}

function updateLearner(i) {
  DB.learners[i].name = document.getElementById(`edit-name-${i}`).value;
  DB.learners[i].cohort = document.getElementById(`edit-cohort-${i}`).value;
  save(); renderEdit(); renderDashboard();
}

window.onload = () => { initialFirebaseLoad(); };
