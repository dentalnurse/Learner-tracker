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

const DIPLOMA_PDP_UNITS = [
  { key:'u1',  label:'Unit 1 – Professional Practice' },
  { key:'u2',  label:'Unit 2 – Leading & Teamworking' },
  { key:'u3',  label:'Unit 3 – Communication' },
  { key:'u4',  label:'Unit 4 – Inclusive Practice' },
  { key:'u5',  label:'Unit 5 – Clinical Assessment, Radiography & Periodontology' },
  { key:'u6',  label:'Unit 6 – Restorative & Prosthetic' },
  { key:'u7',  label:'Unit 7 – Oral Health' },
  { key:'u8',  label:'Unit 8 – Health & Wellbeing' },
  { key:'u9',  label:'Unit 9 – CPD' },
  { key:'u10', label:'Unit 10 – Risks & Medical Emergencies' },
];
const OHE_PDP_UNITS = [
  { key:'p1', label:'Phase 1 – Theory' },
  { key:'p2', label:'Phase 2 – PCAs 1–3' },
  { key:'p3', label:'Phase 3 – PCAs 4–6' },
  { key:'p4', label:'Phase 4 – PCAs 7–9' },
  { key:'p5', label:'Phase 5 – PCAs 10–11' },
  { key:'p6', label:'Phase 6 – SOs' },
];

const OHE_PATIENT_TYPES = [
  { key: 'adolescent',    label: 'Adolescent (12–15)' },
  { key: 'adult',         label: 'Adult Patient (16–64)' },
  { key: 'elderly',       label: 'Elderly Patient (65 and older)' },
  { key: 'pregnant',      label: 'Pregnant / nursing mothers' },
  { key: 'preSchool',     label: 'Parents of pre-school children (4 and under)' },
  { key: 'primarySchool', label: 'Parents of primary school children (5–11)' },
  { key: 'specialNeeds',  label: 'Special Needs / Medically compromised patient' }
];

const OHE_PCAS = [
  { key: 'pca1',  label: 'Prevention of Caries Visit 1' },
  { key: 'pca2',  label: 'Prevention of Caries Visit 2' },
  { key: 'pca3',  label: 'Periodontal Disease Visit 1' },
  { key: 'pca4',  label: 'Periodontal Disease Visit 2' },
  { key: 'pca5',  label: 'Non-Carious Tooth Surface Loss 1' },
  { key: 'pca6',  label: 'Non-Carious Tooth Surface Loss 2' },
  { key: 'pca7',  label: 'Oral Conditions Visit 1' },
  { key: 'pca8',  label: 'Oral Conditions Visit 2' },
  { key: 'pca9',  label: 'Care of Dentures' },
  { key: 'pca10', label: 'Care of Fixed Prosthesis' },
  { key: 'pca11', label: 'Care of Orthodontic Appliances' },
];
const OHE_SOS = [
  { key: 'so1', label: 'SO1 – Exhibition' },
  { key: 'so2', label: 'SO2 – Reflective Account' },
  { key: 'so3', label: 'SO3 – PDP' },
];
// Which PCAs / SOs must be complete by each phase's target date
const OHE_PHASE_REQS = {
  'Phase 2 – PCAs 1–3':   ['pca1','pca2','pca3'],
  'Phase 3 – PCAs 4–6':   ['pca4','pca5','pca6'],
  'Phase 4 – PCAs 7–9':   ['pca7','pca8','pca9'],
  'Phase 5 – PCAs 10–11': ['pca10','pca11'],
  'Phase 6 – SOs':         ['so1','so2','so3'],
};

function parseDate(str) {
  if (!str || !str.trim()) return null;
  const d = new Date(str);
  if (!isNaN(d)) return d;
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const parts = str.trim().split(/[\s\-\/]+/);
  if (parts.length === 3) {
    const m = months[parts[1]];
    if (m !== undefined) return new Date(parseInt(parts[2]), m, parseInt(parts[0]));
  }
  return null;
}

function getWeekStart(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0,10);
}

function recordMarking(learnerIdx, type) {
  const l = DB.learners[learnerIdx];
  if (!l.markingLog) l.markingLog = [];
  const week = getWeekStart();
  l.markingLog = l.markingLog.filter(e => e.week !== week);
  l.markingLog.push({ week, type });
  l.markingLog.sort((a,b) => a.week.localeCompare(b.week));
}

function editMarkingWeek(learnerIdx, week, event) {
  event.stopPropagation();
  document.querySelectorAll('.mw-edit-popup').forEach(p => p.remove());

  const label = new Date(week).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const popup = document.createElement('div');
  popup.className = 'mw-edit-popup';
  popup.innerHTML = `
    <div style="font-size:11px;font-weight:500;color:var(--ink3);margin-bottom:8px;">w/c ${label}</div>
    <button onclick="setMarkingWeek(${learnerIdx},'${week}','marked')">✓ Marked</button>
    <button onclick="setMarkingWeek(${learnerIdx},'${week}','nothing')">– Nothing to submit</button>
    <button onclick="setMarkingWeek(${learnerIdx},'${week}','missed')">✗ Missed</button>
  `;

  // Attach to body so overflow:hidden on card doesn't clip it
  document.body.appendChild(popup);

  const rect = event.currentTarget.getBoundingClientRect();
  const pw = popup.offsetWidth || 180;
  const ph = popup.offsetHeight || 110;
  let top  = rect.top - ph - 8 + window.scrollY;
  let left = rect.left + rect.width / 2 - pw / 2 + window.scrollX;
  if (top < 8) top = rect.bottom + 8 + window.scrollY;
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  popup.style.top  = top + 'px';
  popup.style.left = left + 'px';

  const close = e => { if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function setMarkingWeek(learnerIdx, week, type) {
  document.querySelectorAll('.mw-edit-popup').forEach(p => p.remove());
  const l = DB.learners[learnerIdx];
  if (!l.markingLog) l.markingLog = [];
  l.markingLog = l.markingLog.filter(e => e.week !== week);
  if (type !== 'missed') {
    l.markingLog.push({ week, type });
    l.markingLog.sort((a,b) => a.week.localeCompare(b.week));
  }
  save().then(() => renderDashboard());
}

function getMarkingHistory(l) {
  const log = {};
  (l.markingLog || []).forEach(e => log[e.week] = e.type);

  const ttDates = (l.timetable||[]).map(t=>parseDate(t.date)).filter(Boolean);
  const logDates = (l.markingLog||[]).map(e=>new Date(e.week));
  const allDates = [...ttDates, ...logDates];
  if (!allDates.length) return [];

  const earliest = new Date(Math.min(...allDates.map(d=>d.getTime())));
  const lastWeek = getWeekStart(new Date(Date.now() - 7*24*60*60*1000));

  const weeks = [];
  const d = new Date(getWeekStart(earliest));
  while (d.toISOString().slice(0,10) <= lastWeek) {
    const weekStr = d.toISOString().slice(0,10);
    weeks.push({ week: weekStr, type: log[weekStr] || 'missed' });
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

function unitKeyFromLabel(label) {
  const m = label.match(/(?:unit\s+|–\s*)(\d+[a-c]?)\b/i);
  return m ? m[1].toLowerCase() : null;
}

function getTimetableStatus(l, ttIndex) {
  const label = (l.timetable[ttIndex] || {}).label || '';

  // OHE: map phase labels to required PCAs/SOs
  if (l.type === 'ohe') {
    const reqs = OHE_PHASE_REQS[label];
    if (!reqs || !reqs.length) return null; // Phase 1 Theory, Exam – nothing tracked
    const pcas = l.pcas || {};
    const sos  = l.sos  || {};
    const done = reqs.filter(k => k.startsWith('pca') ? !!pcas[k] : !!sos[k]).length;
    if (done === reqs.length) return 'Complete';
    if (done > 0) return 'In Progress';
    return 'Not Complete';
  }

  // Diploma: match by unit key in AC refs
  const key = unitKeyFromLabel(label);
  if (!key) return null;
  const indices = l.acs.reduce((acc, ac, i) => {
    if (String(ac.unit).toLowerCase() === key) acc.push(i);
    return acc;
  }, []);
  if (!indices.length) return null;
  const done = indices.filter(i => l.progress[i] === 'Completed').length;
  const amend = indices.filter(i => l.progress[i] === 'Requires amendments').length;
  if (done === indices.length) return 'Complete';
  if (done > 0 || amend > 0) return 'In Progress';
  return 'Not Complete';
}

function calculateOnTrack(l) {
  const today = new Date(); today.setHours(0,0,0,0);
  const withDates = l.timetable.filter(t => t.date && t.date.trim());
  if (!withDates.length) return null;

  const pastSessions = withDates.filter(t => { const d = parseDate(t.date); return d && d <= today; });
  if (!pastSessions.length) return null;

  let complete = 0, inProgress = 0, notComplete = 0;
  pastSessions.forEach(t => {
    const i = l.timetable.indexOf(t);
    const status = getTimetableStatus(l, i);
    if (status === null) return; // no tracked items for this session (e.g. Phase 1 Theory, Final Portfolio)
    if (status === 'Complete')      complete++;
    else if (status === 'In Progress') inProgress++;
    else notComplete++;
  });

  const tracked = complete + inProgress + notComplete;
  if (!tracked) return null;

  if (notComplete > 0) return 'at-risk';
  if (inProgress > 0 && complete === 0) return 'at-risk';
  if (inProgress > 0) return 'watch';
  return 'on-track';
}

// ── TIMETABLE MASTER LABELS ───────────────────────
const DIPLOMA_TT_LABELS = [
  {label:'Professional Practice – Unit 1a',reqs:'6 Knowledge evidence questions\nGDC standards, dental legislation, clinical governance'},
  {label:'Professional Practice – Unit 1b',reqs:'Safeguarding assignment\nProfessional conduct observation (patient, colleague, learner)\n1 reflective account'},
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
        // Merge with master labels — master is the source of truth for rows
        const tl = l.type === 'ohe' ? OHE_TT_LABELS : DIPLOMA_TT_LABELS;
        l.timetable = tl.map((master, i) => {
          const existing = l.timetable ? l.timetable[i] : null;
          return {
            label: master.label,
            reqs:  master.reqs,
            date:  (existing && existing.date) || (typeof existing === 'string' ? existing : '')
          };
        });
        if (l.type === 'ohe' && !l.patientTypes) {
          l.patientTypes = { adolescent:false, adult:false, elderly:false, pregnant:false, preSchool:false, primarySchool:false, specialNeeds:false };
        }
        if (l.type === 'ohe' && !l.pcas) {
          l.pcas = {};
          OHE_PCAS.forEach(p => { l.pcas[p.key] = false; });
        }
        if (l.type === 'ohe' && !l.sos) {
          l.sos = {};
          OHE_SOS.forEach(s => { l.sos[s.key] = false; });
        }
        if (!l.pdp) l.pdp = {};
        if (l.type !== 'ohe') syncLearnerToMaster(l);
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

  let done, pct, progressLabel, statsHtml, bottomHtml;
  if (l.type === 'ohe') {
    const op = getOHEProgress(l);
    done = op.pcaDone + op.sosDone;
    pct  = op.pct;
    progressLabel = `${op.pcaDone} of 11 PCAs · ${op.sosDone} of 3 SOs completed`;
    statsHtml = `
      <div class="stat-card"><div class="stat-label">PCAs</div><div class="stat-value">${op.pcaDone}/11</div></div>
      <div class="stat-card"><div class="stat-label">SOs</div><div class="stat-value">${op.sosDone}/3</div></div>`;
    bottomHtml = oheSectionsHtml(l, cDash, false);
  } else {
    done = l.progress.filter(s => s === 'Completed').length;
    pct  = l.acs.length > 0 ? Math.round((done / l.acs.length) * 100) : 0;
    progressLabel = `${done} of ${l.acs.length} assessment criteria completed`;
    const rows = l.acs.map((ac, i) => `<tr><td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td><td class="ac-ref">${ac.ref}</td><td style="text-align:center">${ac.n||1}</td><td>${badge(l.progress[i])}</td></tr>`).join('');
    statsHtml = `
      <div class="stat-card"><div class="stat-label">Progress</div><div class="stat-value">${pct}%</div></div>
      <div class="stat-card"><div class="stat-label">Done</div><div class="stat-value">${done}/${l.acs.length}</div></div>`;
    bottomHtml = `<div class="table-card"><table class="tbl"><thead><tr><th>Unit</th><th>Ref</th><th style="text-align:center">Qty</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const onTrack = calculateOnTrack(l);
  const trackLabels = { 'on-track': ['On Track','risk-on'], 'watch': ['Watch','risk-watch'], 'at-risk': ['At Risk','risk-at'] };
  const [trackText, trackCls] = onTrack ? trackLabels[onTrack] : ['No dates set', ''];
  const onTrackChip = `<span class="risk-chip ${trackCls}" style="${!onTrack?'background:var(--cream2);color:var(--ink3)':''}">${trackText}</span>`;
  const pbColor = pct >= 75 ? '' : pct >= 40 ? 'amber' : 'red';

  const pdpUnitsDash = l.type === 'ohe' ? OHE_PDP_UNITS : DIPLOMA_PDP_UNITS;
  const pdpDash = l.pdp || {};
  const pdpDoneDash = pdpUnitsDash.filter(u => pdpDash[u.key]?.pdp).length;
  const refDoneDash = pdpUnitsDash.filter(u => pdpDash[u.key]?.reflection).length;
  const pdpDashHtml = `<div class="table-card" style="margin-bottom:16px;">
    <div style="padding:16px 20px 12px;border-bottom:1px solid var(--cream2);display:flex;justify-content:space-between;align-items:center;">
      <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">End of Unit PDP &amp; Reflections</div>
      <div style="font-size:12px;color:var(--ink3);">PDP <strong style="color:var(--ink)">${pdpDoneDash}/${pdpUnitsDash.length}</strong> &nbsp;·&nbsp; Reflection <strong style="color:var(--ink)">${refDoneDash}/${pdpUnitsDash.length}</strong></div>
    </div>
    <table class="tbl">
      <thead><tr><th>Unit</th><th style="text-align:center;width:90px">PDP</th><th style="text-align:center;width:90px">Reflection</th></tr></thead>
      <tbody>${pdpUnitsDash.map(u => {
        const e = pdpDash[u.key] || {};
        return `<tr>
          <td style="font-size:12.5px">${u.label}</td>
          <td style="text-align:center"><span class="pdp-dot ${e.pdp?'pdp-done':'pdp-open'}">${e.pdp?'✓':''}</span></td>
          <td style="text-align:center"><span class="pdp-dot ${e.reflection?'pdp-done':'pdp-open'}">${e.reflection?'✓':''}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;

  const history = getMarkingHistory(l);
  const missed = history.filter(h => h.type === 'missed');
  const historyHtml = history.length ? `
    <div class="table-card" style="padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">Marking History</div>
        ${missed.length ? `<span class="risk-chip risk-at">${missed.length} missed week${missed.length!==1?'s':''}</span>` : '<span class="risk-chip risk-on">No missed weeks</span>'}
      </div>
      <div class="marking-dots">
        ${history.map(h => {
          const label = new Date(h.week).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
          const title = `w/c ${label} — ${h.type==='marked'?'Marked':h.type==='nothing'?'Nothing to submit':'Missed'}`;
          return `<div class="mw-dot mw-${h.type}" title="${title}" style="cursor:pointer" onclick="editMarkingWeek(${cDash},'${h.week}',event)"><div class="mw-dot-inner"></div><div class="mw-dot-label">${label}</div></div>`;
        }).join('')}
      </div>
      ${missed.length ? `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--cream2);">
        <div style="font-size:11px;font-weight:500;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Missed weeks</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${missed.map(h=>`<span class="sbdg s-amend">w/c ${new Date(h.week).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>` : '';

  const ptHtml = l.type === 'ohe' ? (() => {
    const pts = l.patientTypes || {};
    const count = Object.values(pts).filter(Boolean).length;
    return `<div class="table-card" style="padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">Patient Types</div>
        <span class="risk-chip ${count>=5?'risk-on':'risk-watch'}">${count}/7 — ${count>=5?'Requirement met':(5-count)+' more needed'}</span>
      </div>
      <div class="pt-grid-display">${OHE_PATIENT_TYPES.map(pt=>`<div class="pt-item ${pts[pt.key]?'pt-done':'pt-missing'}"><span class="pt-tick">${pts[pt.key]?'✓':'○'}</span>${pt.label}</div>`).join('')}</div>
    </div>`;
  })() : '';

  el.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div><div class="page-title">Dashboard</div></div>
      <button class="btn-export" onclick="exportPDF(${cDash})">↓ Export PDF</button>
    </div>
    <div class="learner-bar" id="dash-btns"></div>
    <div class="profile-card">
      <div class="avatar ${l.type==='ohe'?'ohe':''}">${initials(l.name)}</div>
      <div class="profile-info">
        <div class="profile-name">${l.name} ${!isMarkedThisWeek(l.lastMarked)?'<span class="sbdg s-amend" style="margin-left:8px;font-size:10px">⚠️ MARKING REQUIRED</span>':'<span class="sbdg s-done" style="margin-left:8px;font-size:10px">✅ UP TO DATE</span>'}</div>
        <div class="profile-meta"><span>${l.cohort}</span><span class="course-tag ${l.type==='ohe'?'ohe':''}">${l.type==='ohe'?'OHE':'Diploma'}</span></div>
      </div>
    </div>
    <div class="progress-card">
      <div class="pb-meta">
        <span class="pb-label">${progressLabel}</span>
        ${onTrackChip}
      </div>
      <div class="pb-track"><div class="pb-fill ${pbColor}" style="width:${pct}%"></div></div>
      <div class="pb-meta"><span class="pb-label">${onTrack?`Based on ${l.timetable.filter(t=>t.date).length} scheduled sessions`:'Add session dates in Timetable to enable on-track tracking'}</span><span class="pb-label" style="font-weight:600;color:var(--ink2)">${pct}%</span></div>
    </div>
    <div class="stats-row">
      ${statsHtml}
      <div class="stat-card"><div class="stat-label">Schedule</div><div class="stat-value" style="font-size:${onTrack?'17px':'13px'};margin-top:${onTrack?'6px':'10px'};color:${onTrack==='on-track'?'var(--teal)':onTrack==='watch'?'var(--amber)':onTrack==='at-risk'?'var(--red)':'var(--ink3)'}">${trackText}</div><div class="stat-sub">vs timetable</div></div>
    </div>
    ${ptHtml}
    ${pdpDashHtml}
    ${historyHtml}
    ${bottomHtml}`;
  learnerBar('dash-btns', cDash, 'selectDash');
}

function renderMarking() {
  const el = document.getElementById('tab-marking');
  const l = DB.learners[cMark];
  if(!l) { el.innerHTML = '<div class="empty">No learners yet.</div>'; return; }
  const isDone = isMarkedThisWeek(l.lastMarked);

  let markingBodyHtml;
  if (l.type === 'ohe') {
    markingBodyHtml = oheSectionsHtml(l, cMark, true);
  } else {
    const rows = l.acs.map((ac, i) => `<tr><td><span class="${ubdgClass(ac.unit)}">${ubdgLabel(ac.unit)}</span></td><td>${ac.ref}</td><td><select class="tt-edit-input" style="width:100%" onchange="updateMarking(${i}, this.value)">${STATUSES.map(s=>`<option ${s===(l.progress[i]||'Not started')?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('');
    markingBodyHtml = `<table class="tbl"><tbody>${rows}</tbody></table>`;
  }

  const ptHtml = l.type === 'ohe' ? (() => {
    const pts = l.patientTypes || {};
    const count = Object.values(pts).filter(Boolean).length;
    return `<div class="table-card" style="padding:20px;margin-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">OHE Patient Types</div>
        <span class="risk-chip ${count>=5?'risk-on':'risk-watch'}">${count}/7 — ${count>=5?'✓ Requirement met':(5-count)+' more needed'}</span>
      </div>
      <div style="font-size:11.5px;color:var(--ink3);margin-bottom:14px;line-height:1.6;">The learner must have at least 5 of the following patient types represented throughout their Record of Competence.</div>
      <div class="pt-grid">${OHE_PATIENT_TYPES.map(pt=>`
        <label class="pt-check ${pts[pt.key]?'checked':''}">
          <input type="checkbox" ${pts[pt.key]?'checked':''} onchange="togglePatientType(${cMark},'${pt.key}')">
          <div class="pt-check-text">
            <div class="pt-check-label">${pt.label}</div>
            <div class="pt-check-sub">At least one example identified</div>
          </div>
        </label>`).join('')}
      </div>
    </div>`;
  })() : '';

  const pdpUnits = l.type === 'ohe' ? OHE_PDP_UNITS : DIPLOMA_PDP_UNITS;
  const pdp = l.pdp || {};
  const pdpDone = pdpUnits.filter(u => pdp[u.key]?.pdp).length;
  const refDone = pdpUnits.filter(u => pdp[u.key]?.reflection).length;
  const pdpHtml = `<div class="table-card" style="margin-top:16px;">
    <div style="padding:16px 20px 12px;border-bottom:1px solid var(--cream2);display:flex;justify-content:space-between;align-items:center;">
      <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">End of Unit PDP &amp; Reflections</div>
      <div style="font-size:12px;color:var(--ink3);">PDP <strong style="color:var(--ink)">${pdpDone}/${pdpUnits.length}</strong> &nbsp;·&nbsp; Reflection <strong style="color:var(--ink)">${refDone}/${pdpUnits.length}</strong></div>
    </div>
    <table class="tbl">
      <thead><tr><th>Unit</th><th style="text-align:center;width:110px">PDP</th><th style="text-align:center;width:110px">Reflection</th></tr></thead>
      <tbody>${pdpUnits.map(u => {
        const entry = pdp[u.key] || {};
        return `<tr>
          <td style="font-size:12.5px">${u.label}</td>
          <td style="text-align:center"><label class="pdp-check ${entry.pdp?'checked':''}"><input type="checkbox" ${entry.pdp?'checked':''} onchange="togglePDP(${cMark},'${u.key}','pdp')"><span>${entry.pdp?'✓ Done':'○'}</span></label></td>
          <td style="text-align:center"><label class="pdp-check ${entry.reflection?'checked':''}"><input type="checkbox" ${entry.reflection?'checked':''} onchange="togglePDP(${cMark},'${u.key}','reflection')"><span>${entry.reflection?'✓ Done':'○'}</span></label></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;

  el.innerHTML = `<div class="page-header"><div class="page-title">Weekly Marking</div></div><div class="learner-bar" id="mark-btns"></div>
    <div class="table-card" style="padding:20px;margin-bottom:16px; border-left:5px solid ${isDone?'var(--teal)':'var(--amber)'}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:600;">Status: ${isDone ? '✅ Marked for this week':'⏳ Pending review'}</div>
        <button class="btn-save" style="background:${isDone?'var(--ink3)':'var(--blue)'}" onclick="markNothingToSubmit(${cMark})">${isDone?'Reset Week':'Nothing to mark this week'}</button>
      </div>
    </div>
    ${markingBodyHtml}
    ${pdpHtml}
    ${ptHtml}`;
  learnerBar('mark-btns', cMark, 'selectMark');
}
function togglePDP(learnerIdx, key, field) {
  const l = DB.learners[learnerIdx];
  if (!l.pdp) l.pdp = {};
  if (!l.pdp[key]) l.pdp[key] = { pdp: false, reflection: false };
  l.pdp[key][field] = !l.pdp[key][field];
  save().then(() => renderMarking());
}
function togglePatientType(learnerIdx, key) {
  if (!DB.learners[learnerIdx].patientTypes) DB.learners[learnerIdx].patientTypes = {};
  DB.learners[learnerIdx].patientTypes[key] = !DB.learners[learnerIdx].patientTypes[key];
  save().then(() => renderMarking());
}

function getOHEProgress(l) {
  const pcas = l.pcas || {};
  const sos  = l.sos  || {};
  const pcaDone = OHE_PCAS.filter(p => pcas[p.key]).length;
  const sosDone = OHE_SOS.filter(s => sos[s.key]).length;
  const total = OHE_PCAS.length + OHE_SOS.length; // 14
  const pct = Math.round(((pcaDone + sosDone) / total) * 100);
  return { pcaDone, sosDone, total, pct };
}

function togglePCA(learnerIdx, key) {
  const l = DB.learners[learnerIdx];
  if (!l.pcas) l.pcas = {};
  l.pcas[key] = !l.pcas[key];
  if (l.pcas[key]) { l.lastMarked = Date.now(); recordMarking(learnerIdx, 'marked'); }
  save().then(() => renderMarking());
}

function toggleSO(learnerIdx, key) {
  const l = DB.learners[learnerIdx];
  if (!l.sos) l.sos = {};
  const idx = OHE_SOS.findIndex(s => s.key === key);
  if (idx > 0 && !l.sos[OHE_SOS[idx - 1].key]) return; // previous not done — blocked
  l.sos[key] = !l.sos[key];
  // Unticking cascades: also untick all subsequent SOs
  if (!l.sos[key]) {
    for (let i = idx + 1; i < OHE_SOS.length; i++) l.sos[OHE_SOS[i].key] = false;
  } else {
    l.lastMarked = Date.now(); recordMarking(learnerIdx, 'marked');
  }
  save().then(() => renderMarking());
}

function oheSectionsHtml(l, learnerIdx, interactive) {
  const pcas = l.pcas || {};
  const sos  = l.sos  || {};
  const pcaDone = OHE_PCAS.filter(p => pcas[p.key]).length;
  const sosDone = OHE_SOS.filter(s => sos[s.key]).length;

  const pcaItems = OHE_PCAS.map(p => interactive ? `
    <label class="pt-check ${pcas[p.key] ? 'checked' : ''}">
      <input type="checkbox" ${pcas[p.key] ? 'checked' : ''} onchange="togglePCA(${learnerIdx},'${p.key}')">
      <div class="pt-check-text"><div class="pt-check-label">${p.label}</div></div>
    </label>` : `
    <div class="pt-item ${pcas[p.key] ? 'pt-done' : 'pt-missing'}">
      <span class="pt-tick">${pcas[p.key] ? '✓' : '○'}</span>${p.label}
    </div>`).join('');

  const soItems = OHE_SOS.map((s, i) => {
    const done   = !!sos[s.key];
    const locked = i > 0 && !sos[OHE_SOS[i - 1].key];
    return interactive ? `
      <label class="pt-check ${done ? 'checked' : ''} ${locked ? 'so-locked' : ''}">
        <input type="checkbox" ${done ? 'checked' : ''} ${locked ? 'disabled' : ''} onchange="toggleSO(${learnerIdx},'${s.key}')">
        <div class="pt-check-text">
          <div class="pt-check-label">${locked ? '🔒 ' : ''}${s.label}</div>
          ${locked ? `<div class="pt-check-sub">Complete ${OHE_SOS[i-1].label} first</div>` : ''}
        </div>
      </label>` : `
      <div class="pt-item ${done ? 'pt-done' : 'pt-missing'}">
        <span class="pt-tick">${done ? '✓' : locked ? '🔒' : '○'}</span>${s.label}
      </div>`;
  }).join('');

  const pcaChip = `<span class="risk-chip ${pcaDone === 11 ? 'risk-on' : pcaDone >= 6 ? 'risk-watch' : 'risk-at'}">${pcaDone}/11 completed</span>`;
  const soChip  = sosDone === 3 ? `<span class="risk-chip risk-on">3/3 completed</span>` :
                  sosDone > 0   ? `<span class="risk-chip risk-watch">${sosDone}/3 completed</span>` :
                                  `<span class="risk-chip" style="background:var(--cream2);color:var(--ink3)">0/3 completed</span>`;

  return `
    <div class="table-card" style="padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">PCAs</div>
        ${pcaChip}
      </div>
      <div class="pt-grid">${pcaItems}</div>
    </div>
    <div class="table-card" style="padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Fraunces',serif;font-size:16px;font-weight:400;">Structured Observations</div>
        ${soChip}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">${soItems}</div>
    </div>`;
}
function updateMarking(idx, val) {
  DB.learners[cMark].progress[idx] = val;
  DB.learners[cMark].lastMarked = Date.now();
  recordMarking(cMark, 'marked');
  save().then(() => renderMarking());
}
function markNothingToSubmit(i) {
  if (isMarkedThisWeek(DB.learners[i].lastMarked)) {
    DB.learners[i].lastMarked = 0;
    const week = getWeekStart();
    if (DB.learners[i].markingLog) DB.learners[i].markingLog = DB.learners[i].markingLog.filter(e => e.week !== week);
  } else {
    DB.learners[i].lastMarked = Date.now();
    recordMarking(i, 'nothing');
  }
  save().then(() => renderMarking());
}

function renderTimetable() {
  const el = document.getElementById('tab-timetable');
  const l = DB.learners[cTT];
  if(!l) { el.innerHTML = '<div class="empty">No learners found.</div>'; return; }
  const rows = l.timetable.map((t, i) => `<tr><td style="text-align:center; font-weight:bold; color:var(--ink3); width:60px;">${i + 1}</td><td style="width:45%"><div style="font-weight:600;">${t.label}</div><div style="font-size:11px; color:var(--ink3); line-height:1.4;">${t.reqs||''}</div></td><td><input type="text" class="tt-edit-input" style="width:100%" value="${t.date||''}" onchange="DB.learners[${cTT}].timetable[${i}].date=this.value;save();"></td></tr>`).join('');
  el.innerHTML = `
    <div class="page-header"><div class="page-title">Timetable</div></div>
    <div class="learner-bar" id="tt-btns"></div>
    <div class="form-card" style="max-width:100%;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:500;color:var(--ink2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Auto-fill dates from timetable document</div>
      <div class="tt-upload-zone" id="tt-tt-zone">
        <input type="file" id="tt-tt-file" accept=".docx,.doc,.txt" style="display:none" onchange="parseTTDocx(this.files[0],'tt')">
        <span style="font-size:13px;color:var(--ink3);">Drag &amp; drop your timetable here, or</span>
        <button class="btn-save" style="margin-left:10px;padding:7px 18px;" onclick="document.getElementById('tt-tt-file').click()">Browse file</button>
      </div>
      <div id="tt-tt-status" class="tt-upload-status" style="display:none"></div>
      <div style="margin-top:8px;font-size:11px;color:var(--ink3);">Dates are matched to units in order. Format: <strong>15 Jan 2026</strong> or <strong>15/01/2026</strong>. Existing dates will be overwritten.</div>
    </div>
    <div class="table-card"><table class="tbl"><thead><tr><th style="width:60px; text-align:center;">ID</th><th>Unit</th><th>Target Date</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  learnerBar('tt-btns', cTT, 'selectTT');
  const zone = document.getElementById('tt-tt-zone');
  if (zone) {
    ['dragenter','dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); zone.classList.add('dragover'); }));
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('dragover'); });
    zone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('dragover'); parseTTDocx(e.dataTransfer?.files?.[0], 'tt'); });
  }
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
  const masterACS = type === 'ohe' ? [] : DIPLOMA_ACS;
  const ohePcas = {}; OHE_PCAS.forEach(p => { ohePcas[p.key] = false; });
  const oheSos  = {}; OHE_SOS.forEach(s => { oheSos[s.key] = false; });
  const newLearner = {
    name, cohort, type, lastMarked: 0,
    acs: [...masterACS], progress: new Array(masterACS.length).fill('Not started'),
    timetable, pdp: {},
    ...(type === 'ohe' ? {
      patientTypes: { adolescent:false, adult:false, elderly:false, pregnant:false, preSchool:false, primarySchool:false, specialNeeds:false },
      pcas: ohePcas,
      sos: oheSos
    } : {})
  };
  DB.learners.push(newLearner);
  await save();
  document.getElementById('add-msg').innerHTML = "✅ Added!";
  setTimeout(() => { switchTab('dashboard', document.querySelector('.nav-item')); }, 1000);
}

// ── TIMETABLE UPLOAD ───────────────────────
function extractDatesFromText(text) {
  const months = { jan:'Jan',feb:'Feb',mar:'Mar',apr:'Apr',may:'May',jun:'Jun',jul:'Jul',aug:'Aug',sep:'Sep',oct:'Oct',nov:'Nov',dec:'Dec',
    january:'Jan',february:'Feb',march:'Mar',april:'Apr',june:'Jun',july:'Jul',august:'Aug',september:'Sep',october:'Oct',november:'Nov',december:'Dec' };
  const dates = [];
  const seen = new Set();
  const re = /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = `${m[1]}-${m[2]}-${m[3]}`;
    if (!seen.has(key)) { seen.add(key); dates.push(`${m[1]} ${months[m[2].toLowerCase()]} ${m[3]}`); }
  }
  const re2 = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  const mnArr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  while ((m = re2.exec(text)) !== null) {
    const mon = mnArr[parseInt(m[2]) - 1];
    const key = `${m[1]}-${m[2]}-${m[3]}`;
    if (mon && !seen.has(key)) { seen.add(key); dates.push(`${m[1]} ${mon} ${m[3]}`); }
  }
  return dates;
}

async function readDocxText(arrayBuffer) {
  // Read word/document.xml directly from the .docx ZIP without any library
  const bytes = new Uint8Array(arrayBuffer);
  const target = 'word/document.xml';
  let offset = 0;
  while (offset < bytes.length - 30) {
    // Local file header signature PK\x03\x04
    if (bytes[offset]===0x50 && bytes[offset+1]===0x4B && bytes[offset+2]===0x03 && bytes[offset+3]===0x04) {
      const compression = bytes[offset+8] | (bytes[offset+9]<<8);
      const compressedSize = bytes[offset+18] | (bytes[offset+19]<<8) | (bytes[offset+20]<<16) | (bytes[offset+21]<<24);
      const nameLen  = bytes[offset+26] | (bytes[offset+27]<<8);
      const extraLen = bytes[offset+28] | (bytes[offset+29]<<8);
      const name = new TextDecoder().decode(bytes.slice(offset+30, offset+30+nameLen));
      const dataStart = offset + 30 + nameLen + extraLen;
      if (name === target) {
        const compressed = bytes.slice(dataStart, dataStart + compressedSize);
        if (compression === 0) {
          return new TextDecoder().decode(compressed);
        } else if (compression === 8 && typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compressed); writer.close();
          const reader = ds.readable.getReader();
          const chunks = [];
          while (true) { const {done,value} = await reader.read(); if (done) break; chunks.push(value); }
          const out = new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));
          let pos=0; chunks.forEach(c=>{out.set(c,pos);pos+=c.length;});
          return new TextDecoder().decode(out);
        }
      }
      offset = dataStart + (compressedSize > 0 ? compressedSize : 1);
    } else { offset++; }
  }
  return null;
}

async function parseTTDocx(file, mode) {
  if (!file) return;
  const setStatus = (msg, cls) => {
    const el = document.getElementById(`${mode}-tt-status`);
    if (el) { el.textContent = msg; el.className = `tt-upload-status ${cls||''}`; el.style.display='block'; }
  };
  setStatus('⏳ Reading document…', '');

  const applyDates = dates => {
    if (!dates.length) { setStatus('⚠️ No dates found. Make sure dates are written as "15 Jan 2026" or "15/01/2026"', 'err'); return; }
    if (mode === 'add') {
      document.getElementById('add-timetable').value = dates.join('\n');
      setStatus(`✓ ${dates.length} dates found — review in the box below`, 'ok');
    } else {
      const l = DB.learners[cTT];
      let applied = 0;
      dates.forEach((date, i) => {
        if (l.timetable[i]) { l.timetable[i].date = date; applied++; }
      });
      save().then(() => {
        renderTimetable();
        // Re-show status after re-render
        const el = document.getElementById('tt-tt-status');
        if (el) { el.textContent = `✓ ${applied} dates imported`; el.className = 'tt-upload-status ok'; el.style.display = 'block'; }
      });
    }
  };

  try {
    const buf = await file.arrayBuffer();
    // Try our direct ZIP reader first (works for .docx, no library needed)
    const xml = await readDocxText(buf);
    if (xml) {
      const plain = xml.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
      applyDates(extractDatesFromText(plain));
      return;
    }
    // Fallback: mammoth
    if (typeof mammoth !== 'undefined') {
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      applyDates(extractDatesFromText(result.value));
      return;
    }
    setStatus('⚠️ Could not parse this file. Please save your timetable as a .docx Word document.', 'err');
  } catch(err) {
    setStatus('⚠️ Error reading file: ' + err.message, 'err');
  }
}

function handleTTDrop(event, mode) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById(`${mode}-tt-zone`)?.classList.remove('dragover');
  const file = event.dataTransfer?.files?.[0];
  if (file) parseTTDocx(file, mode);
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

// ── PDF EXPORT ───────────────────────
function exportPDF(idx) {
  const l = DB.learners[idx !== undefined ? idx : cDash];
  if (!l) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const TEAL   = [19, 78, 74];
  const INK    = [28, 25, 23];
  const INK3   = [168, 162, 158];
  const CREAM  = [247, 244, 239];
  const AMBER  = [180, 83, 9];
  const RED    = [190, 18, 60];

  const done = l.progress.filter(s => s === 'Completed').length;
  const pct  = l.acs.length ? Math.round((done / l.acs.length) * 100) : 0;
  const onTrack = calculateOnTrack(l);
  const trackText = onTrack === 'on-track' ? 'On Track' : onTrack === 'watch' ? 'Watch' : onTrack === 'at-risk' ? 'At Risk' : 'No dates set';
  const today = new Date(); today.setHours(0,0,0,0);
  const genDate = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});

  // ── Header bar
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Learner Progress Report', 20, 14);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('dentalnurse.training', 20, 22);
  doc.text(`Generated: ${genDate}`, 190, 22, { align: 'right' });

  let y = 42;

  // ── Learner name + meta
  doc.setTextColor(...INK);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(l.name, 20, y); y += 7;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK3);
  doc.text(`${l.cohort}  ·  ${l.type === 'ohe' ? 'OHE Certificate' : 'Diploma in Dental Nursing'}`, 20, y); y += 12;

  // ── Stat boxes
  const boxes = [
    { label: 'PROGRESS', value: `${pct}%` },
    { label: 'COMPLETED', value: `${done} / ${l.acs.length}` },
    { label: 'SCHEDULE', value: trackText }
  ];
  const bW = 54, bH = 18;
  boxes.forEach((b, i) => {
    const x = 20 + i * (bW + 5);
    doc.setFillColor(...CREAM);
    doc.roundedRect(x, y, bW, bH, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK3);
    doc.text(b.label, x + 5, y + 6);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(b.value, x + 5, y + 14);
  });
  y += bH + 12;

  // ── Timetable
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('Timetable', 20, y); y += 4;

  const ttRows = l.timetable.map((t, i) => {
    const status = getTimetableStatus(l, i) || 'Not Complete';
    return [String(i + 1), t.label, t.date || '–', status];
  });
  doc.autoTable({
    startY: y,
    head: [['#', 'Unit / Session', 'Date', 'Status']],
    body: ttRows,
    styles: { fontSize: 9, cellPadding: 3, fontStyle: 'normal', textColor: INK },
    headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30 }, 3: { cellWidth: 24 } },
    alternateRowStyles: { fillColor: [250, 249, 247] },
    didParseCell: d => {
      if (d.column.index === 3 && d.section === 'body') {
        if (d.cell.raw === 'Complete') d.cell.styles.textColor = TEAL;
        else if (d.cell.raw === 'In Progress') d.cell.styles.textColor = [180, 120, 0];
      }
    },
    margin: { left: 20, right: 20 }
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── New page if needed
  if (y > 210) { doc.addPage(); y = 20; }

  // ── Progress detail (AC table for Diploma, PCAs + SOs for OHE)
  if (l.type === 'ohe') {
    const pcas = l.pcas || {};
    const sos  = l.sos  || {};
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('PCAs', 20, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['', 'PCA', 'Status']],
      body: OHE_PCAS.map((p, i) => [pcas[p.key] ? '✓' : '○', `PCA ${i+1} – ${p.label}`, pcas[p.key] ? 'Completed' : 'Not yet completed']),
      styles: { fontSize: 9, cellPadding: 3, textColor: INK },
      headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 46 } },
      alternateRowStyles: { fillColor: [250, 249, 247] },
      didParseCell: d => {
        if (d.column.index === 0 && d.section === 'body') {
          d.cell.styles.textColor = d.cell.raw === '✓' ? TEAL : RED;
          d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 12;
        }
        if (d.column.index === 2 && d.section === 'body' && d.cell.raw === 'Completed') d.cell.styles.textColor = TEAL;
      },
      margin: { left: 20, right: 20 }
    });
    y = doc.lastAutoTable.finalY + 8;
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('Structured Observations', 20, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['', 'Structured Observation', 'Status']],
      body: OHE_SOS.map(s => [sos[s.key] ? '✓' : '○', s.label, sos[s.key] ? 'Completed' : 'Not yet completed']),
      styles: { fontSize: 9, cellPadding: 3, textColor: INK },
      headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 46 } },
      alternateRowStyles: { fillColor: [250, 249, 247] },
      didParseCell: d => {
        if (d.column.index === 0 && d.section === 'body') {
          d.cell.styles.textColor = d.cell.raw === '✓' ? TEAL : RED;
          d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 12;
        }
        if (d.column.index === 2 && d.section === 'body' && d.cell.raw === 'Completed') d.cell.styles.textColor = TEAL;
      },
      margin: { left: 20, right: 20 }
    });
  } else {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('Assessment Criteria Progress', 20, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Unit', 'Reference', 'Qty', 'Status']],
      body: l.acs.map((ac, i) => [ubdgLabel(ac.unit), ac.ref, String(ac.n || 1), l.progress[i] || 'Not started']),
      styles: { fontSize: 8.5, cellPadding: 3, textColor: INK },
      headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 46 } },
      alternateRowStyles: { fillColor: [250, 249, 247] },
      didParseCell: d => {
        if (d.column.index === 3 && d.section === 'body') {
          if (d.cell.raw === 'Completed')               d.cell.styles.textColor = TEAL;
          else if (d.cell.raw === 'Requires amendments') d.cell.styles.textColor = AMBER;
        }
      },
      margin: { left: 20, right: 20 }
    });
  }

  // ── OHE Patient Types
  if (l.type === 'ohe') {
    const pts = l.patientTypes || {};
    const ptCount = Object.values(pts).filter(Boolean).length;
    y = doc.lastAutoTable.finalY + 10;
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('OHE Patient Types', 20, y); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK3);
    doc.text(`${ptCount}/7 patient types represented — minimum 5 required${ptCount >= 5 ? '  ✓' : ''}`, 20, y); y += 3;

    doc.autoTable({
      startY: y,
      head: [['', 'Patient Type', 'Status']],
      body: OHE_PATIENT_TYPES.map(pt => [
        pts[pt.key] ? '✓' : '○',
        pt.label,
        pts[pt.key] ? 'At least one example identified' : 'Not yet recorded'
      ]),
      styles: { fontSize: 9, cellPadding: 3, textColor: INK },
      headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 58 } },
      alternateRowStyles: { fillColor: [250, 249, 247] },
      didParseCell: d => {
        if (d.column.index === 0 && d.section === 'body') {
          d.cell.styles.textColor = d.cell.raw === '✓' ? TEAL : RED;
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.fontSize = 12;
        }
      },
      margin: { left: 20, right: 20 }
    });
  }

  // ── Footer on every page
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...INK3);
    doc.line(20, 284, 190, 284);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK3);
    doc.text('dentalnurse.training', 20, 289);
    doc.text(`Page ${i} of ${total}`, 190, 289, { align: 'right' });
  }

  doc.save(`${l.name.replace(/\s+/g,'_')}_Progress_Report.pdf`);
}

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