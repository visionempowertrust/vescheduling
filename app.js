const STORAGE_KEY = 'shala-state';
const SCHEMA_VERSION = 4;
const DEFAULT_STATE = 'Karnataka';
const STATES = ['Karnataka', 'Tamil Nadu', 'Odisha', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Kerala'];
const ACTIVITIES = ['Capacity Building','Self Preparation','Session Preparation','Report Writing','School Meetings','VE Team Meetings','VE - Teacher Preparatory Meetings','VICT Sessions','Digital Literacy Session','Science Theory','Science Practicals','Science Others','Maths','Maths Others','Tactile Preparation','Earthian','ECCE','ESL','Event Preparation','Event','Senitization','Volunteering','Travel','Other VE Work','Other School Work'];
const LEGACY_ACTIVITY = {Mathematics:'Maths',English:'ESL',Science:'Science Theory','Social Studies':'Other School Work',Hindi:'Other School Work',Art:'Other School Work'};
const DEMO_LOCATIONS = ['VNEB School', 'JMS School'];
const DEMO = {
  schemaVersion: SCHEMA_VERSION,
  settings: {days: 6},
  selectedSetupState: DEFAULT_STATE,
  selectedStaffState: DEFAULT_STATE,
  selectedSchoolState: DEFAULT_STATE,
  selectedSchoolLocation: 'VNEB School',
  teachers: [
    {id:'t1',firstName:'Anita',lastName:'Sharma',name:'Anita Sharma',email:'as@visionempowertrust.org',phone:'',alternatePhone:'',code:'AS',state:DEFAULT_STATE,role:'Facilitator',qualification:'',specialEducator:'No',educator:'Yes',locations:['VNEB School'],activities:['Digital Literacy Session','Science Theory','Science Practicals','Travel','Report Writing','School Meetings']},
    {id:'t2',firstName:'Ravi',lastName:'Kumar',name:'Ravi Kumar',email:'rk@visionempowertrust.org',phone:'',alternatePhone:'',code:'RK',state:DEFAULT_STATE,role:'Coordinator',qualification:'',specialEducator:'No',educator:'Yes',locations:['VNEB School','JMS School'],activities:['Capacity Building','VE Team Meetings','Travel','Report Writing','Other VE Work']},
    {id:'t3',firstName:'Neha',lastName:'Iyer',name:'Neha Iyer',email:'ni@visionempowertrust.org',phone:'',alternatePhone:'',code:'NI',state:DEFAULT_STATE,role:'Facilitator',qualification:'',specialEducator:'Yes',educator:'Yes',locations:['JMS School'],activities:['Maths','Maths Others','Tactile Preparation','Travel','School Meetings']}
  ],
  classes: [
    {id:'c1',grade:'6',section:'A',room:'VNEB School',state:DEFAULT_STATE},
    {id:'c2',grade:'7',section:'A',room:'JMS School',state:DEFAULT_STATE}
  ],
  rooms: DEMO_LOCATIONS.map((name, index) => ({id:`r${index + 1}`, name, state:DEFAULT_STATE})),
  staffWork: [
    {id:'w1',teacherId:'t1',date:formatISODate(new Date()),startTime:'10:00',endTime:'12:00',activity:'Digital Literacy Session',mode:'offline',location:'VNEB School',recurrence:'weekly',repeatUntil:'',notes:'Demo recurring school session'},
    {id:'w2',teacherId:'t2',date:formatISODate(new Date()),startTime:'13:00',endTime:'14:00',activity:'Travel',mode:'offline',location:'JMS School',recurrence:'none',repeatUntil:'',notes:'Travel buffer'},
    {id:'w3',teacherId:'t3',date:formatISODate(addDays(new Date(), 1)),startTime:'10:00',endTime:'11:30',activity:'Maths',mode:'offline',location:'JMS School',recurrence:'weekly',repeatUntil:'',notes:''}
  ]
};

let state = load();
let editingId = null;
let calendarWeekStart = startOfWeek(new Date());
let schoolCalendarWeekStart = startOfWeek(new Date());
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function load() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(DEMO); }
  catch { data = structuredClone(DEMO); }
  const oldSchema = data.schemaVersion !== SCHEMA_VERSION;
  data.settings = {days: +(data.settings?.days || 6)};
  data.selectedSetupState = data.selectedSetupState || DEFAULT_STATE;
  data.selectedStaffState = data.selectedStaffState || DEFAULT_STATE;
  data.selectedSchoolState = data.selectedSchoolState || DEFAULT_STATE;
  data.selectedSchoolLocation = data.selectedSchoolLocation || DEMO_LOCATIONS[0];
  data.rooms = normalizeRooms(data.rooms, oldSchema);
  data.classes = (data.classes || []).map(item => ({...item, state: oldSchema ? DEFAULT_STATE : (item.state || DEFAULT_STATE), room: mapLocation(item.room)}));
  data.teachers = (data.teachers || []).map((item, index) => normalizeTeacher(item, index, oldSchema));
  data.staffWork = (data.staffWork || []).map(item => normalizeWork(item));
  data.schemaVersion = SCHEMA_VERSION;
  return data;
}

function normalizeRooms(rooms = [], oldSchema = false) {
  const list = rooms.length ? rooms : DEMO_LOCATIONS;
  return list.map((item, index) => {
    const name = mapLocation(typeof item === 'string' ? item : item.name);
    return {id: item.id || `r${index + 1}`, name, state: oldSchema ? DEFAULT_STATE : (item.state || DEFAULT_STATE)};
  });
}

function normalizeTeacher(item, index, oldSchema = false) {
  const parts = (item.name || '').trim().split(/\s+/);
  const firstName = item.firstName || parts.shift() || '';
  const lastName = item.lastName || parts.join(' ');
  const activities = (item.activities?.length ? item.activities : ACTIVITIES).map(activity => LEGACY_ACTIVITY[activity] || activity);
  if (!activities.includes('Travel')) activities.push('Travel');
  return {
    ...item,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: item.email || `${(item.code || `staff${index + 1}`).toLowerCase()}@visionempowertrust.org`,
    phone: item.phone || '',
    alternatePhone: item.alternatePhone || '',
    code: (item.code || `${firstName[0] || 'S'}${lastName[0] || index + 1}`).toUpperCase(),
    state: oldSchema ? DEFAULT_STATE : (item.state || DEFAULT_STATE),
    role: item.role || 'Facilitator',
    qualification: item.qualification || '',
    specialEducator: item.specialEducator || 'No',
    educator: item.educator || 'Yes',
    locations: (item.locations?.length ? item.locations : [DEMO_LOCATIONS[index % DEMO_LOCATIONS.length]]).map(mapLocation),
    activities: [...new Set(activities)]
  };
}

function normalizeWork(item) {
  const times = periodTimes(+item.period || 1);
  const date = item.date || formatISODate(addDays(startOfWeek(new Date()), +item.day || 0));
  return {
    id: item.id || uid(),
    teacherId: item.teacherId,
    date,
    startTime: item.startTime || times.start,
    endTime: item.endTime || times.end,
    activity: LEGACY_ACTIVITY[item.activity] || LEGACY_ACTIVITY[item.subject] || item.activity || item.subject || 'Other VE Work',
    mode: item.mode || 'offline',
    location: item.mode === 'online' ? '' : mapLocation(item.location || item.room || ''),
    recurrence: item.recurrence || 'none',
    repeatUntil: item.repeatUntil || '',
    notes: item.notes || ''
  };
}

function mapLocation(name = '') {
  if (/^R-|Lab|Hall|Computer/i.test(name)) return DEMO_LOCATIONS[0];
  return name || DEMO_LOCATIONS[0];
}

function save(silent = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!silent) toast('Changes saved locally');
}

function showView(name) {
  $$('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
  $$('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === name));
  const titles = {
    dashboard: ['Academic year 2026–27', 'Good morning, Meera'],
    setup: ['State-wise foundation', 'VE Field Setup'],
    staff: ['Field team calendar', 'VE Staff Scheduling'],
    school: ['School-wise calendar', 'VE School Scheduling']
  };
  $('#page-eyebrow').textContent = titles[name]?.[0] || titles.dashboard[0];
  $('#page-title').textContent = titles[name]?.[1] || titles.dashboard[1];
  $('.sidebar').classList.remove('open');
  render();
}

function render() {
  renderStateSelects();
  renderDashboard();
  renderSetup();
  renderStaffPage();
  renderSchoolPage();
  $('#working-days').value = state.settings.days;
}

function renderStateSelects() {
  setSelectOptions($('#setup-state-select'), STATES, state.selectedSetupState);
  setSelectOptions($('#staff-state-filter'), STATES, state.selectedStaffState);
  setSelectOptions($('#school-state-filter'), STATES, state.selectedSchoolState);
}

function renderDashboard() {
  const setupState = state.selectedSetupState || DEFAULT_STATE;
  const teachers = stateTeachers(setupState);
  const classes = stateClasses(setupState);
  const rooms = stateRooms(setupState);
  const work = stateWork(setupState);
  $('#metrics').innerHTML = [
    ['♙', teachers.length, 'VE Staff'],
    ['▣', classes.length, 'Classes'],
    ['⌂', rooms.length, 'Schools'],
    ['◷', work.length, 'Calendar events']
  ].map(item => `<div class="metric"><div class="metric-top"><span class="metric-icon">${item[0]}</span></div><strong>${item[1]}</strong><small>${item[2]} · ${esc(setupState)}</small></div>`).join('');
  const checks = [['VE staff added', !!teachers.length], ['Classes created', !!classes.length], ['Schools available', !!rooms.length], ['Events planned', !!work.length]];
  const done = checks.filter(item => item[1]).length;
  const pct = Math.round(done / checks.length * 100);
  $('#ready-percent').textContent = `${pct}%`;
  $('#ready-bar').style.width = `${pct}%`;
  $('#checklist').innerHTML = checks.map(item => `<div class="check-item"><i>${item[1] ? '✓' : '·'}</i>${item[0]}</div>`).join('');
  const loads = teachers.map(teacher => ({code: teacher.code, n: state.staffWork.filter(work => work.teacherId === teacher.id).length}));
  const max = Math.max(...loads.map(item => item.n), 1);
  $('#load-chart').innerHTML = loads.length ? loads.map(item => `<div class="bar-col"><i style="height:${item.n / max * 100}%" title="${item.n} events"></i><b>${esc(item.code)}</b></div>`).join('') : '<p class="empty-note">No calendar events yet for this state.</p>';
}

function renderSetup() {
  const selected = state.selectedSetupState;
  const teachers = stateTeachers(selected);
  const classes = stateClasses(selected);
  const rooms = stateRooms(selected);
  $('#teacher-count').textContent = `${teachers.length} staff in ${selected}`;
  $('#class-count').textContent = `${classes.length} class groups in ${selected}`;
  $('#room-count').textContent = `${rooms.length} schools in ${selected}`;
  $('#teachers-body').innerHTML = teachers.length ? teachers.map(t => `<tr><td><strong>${esc(t.name)}</strong><span class="muted">${esc(t.email)}</span></td><td>${esc(t.code)}</td><td class="staff-activities" title="${esc((t.activities || []).join(', '))}">${(t.activities || []).length} selected</td><td><button class="row-action" data-delete="teacher" data-id="${t.id}">×</button></td></tr>`).join('') : emptyRow(4, `No VE staff added for ${selected}.`);
  $('#classes-body').innerHTML = classes.length ? classes.map(c => `<tr><td><strong>Grade ${esc(c.grade)}</strong></td><td>${esc(c.section)}</td><td>${esc(c.room)}</td><td><button class="row-action" data-delete="class" data-id="${c.id}">×</button></td></tr>`).join('') : emptyRow(4, `No classes added for ${selected}.`);
  $('#rooms-list').innerHTML = rooms.length ? rooms.map(r => `<span class="tag">${esc(r.name)} <button class="row-action" data-delete="room" data-id="${r.id}">×</button></span>`).join('') : `<span class="empty-note">No schools added for ${esc(selected)}.</span>`;
}

function renderStaffPage() {
  const selected = state.selectedStaffState;
  const query = ($('#staff-search')?.value || '').toLowerCase();
  const teachers = stateTeachers(selected);
  const filtered = teachers.filter(t => !query || t.name.toLowerCase().includes(query));
  const locations = [...new Set(teachers.flatMap(t => t.locations || []))];
  const work = stateWork(selected);
  $('#staff-metrics').innerHTML = [[teachers.length,'Registered staff'],[locations.length,'School locations'],[work.length,'Calendar events'],[countTravelEvents(work),'Travel events']].map(item => `<div class="staff-metric"><strong>${item[0]}</strong><span>${item[1]}</span></div>`).join('');
  $('#staff-filter-count').textContent = `${filtered.length} of ${teachers.length} staff`;
  $('#staff-directory-body').innerHTML = filtered.length ? filtered.map(t => `<tr><td><strong>${esc(t.name)}</strong><span class="muted">${esc(t.phone || '')}</span></td><td>${esc(t.email)}</td><td>${esc(t.state)}</td><td>${esc((t.locations || []).join(', ') || '—')}</td><td>${esc(t.role || '—')}</td><td><div class="table-actions"><button class="mini-action" data-schedule-staff="${t.id}">Calendar</button><button class="mini-action" data-edit="teacher" data-id="${t.id}">Edit</button><button class="row-action" data-delete="teacher" data-id="${t.id}">×</button></div></td></tr>`).join('') : emptyRow(6, `No staff found for ${selected}.`);
  const person = $('#staff-calendar-person');
  const old = person.value;
  person.innerHTML = teachers.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  if (teachers.some(t => t.id === old)) person.value = old;
  renderStaffCalendar();
}

function renderStaffCalendar() {
  const table = $('#staff-calendar-table');
  const teacherId = $('#staff-calendar-person').value;
  const teacher = state.teachers.find(t => t.id === teacherId);
  const dates = calendarDates(calendarWeekStart);
  $('#calendar-week-label').textContent = weekLabel(dates);
  if (!teacher) {
    table.innerHTML = `<tbody><tr><td class="muted" style="padding:50px">Add a VE staff member in ${esc(state.selectedStaffState)} to begin scheduling.</td></tr></tbody>`;
    $('#staff-risk-summary').innerHTML = riskList([`No VE staff selected for ${state.selectedStaffState}.`]);
    return;
  }
  table.innerHTML = renderCalendarTable(dates, date => {
    const iso = formatISODate(date);
    const events = state.staffWork.filter(work => work.teacherId === teacherId && eventOccursOn(work, iso)).sort(sortByTime);
    return {events, addSlot: `${teacherId}|${iso}`, empty: 'No work planned'};
  });
  $('#staff-risk-summary').innerHTML = buildStaffRiskSummary(teacher, dates);
}

function renderSchoolPage() {
  const selectedState = state.selectedSchoolState;
  const rooms = stateRooms(selectedState);
  const locationSelect = $('#school-location-filter');
  const oldLocation = state.selectedSchoolLocation;
  locationSelect.innerHTML = rooms.map(room => `<option value="${esc(room.name)}">${esc(room.name)}</option>`).join('');
  if (rooms.some(room => room.name === oldLocation)) locationSelect.value = oldLocation;
  else {
    locationSelect.value = rooms[0]?.name || '';
    state.selectedSchoolLocation = locationSelect.value;
  }
  renderSchoolCalendar();
}

function renderSchoolCalendar() {
  const table = $('#school-calendar-table');
  const selectedState = state.selectedSchoolState;
  const selectedLocation = state.selectedSchoolLocation;
  const dates = calendarDates(schoolCalendarWeekStart);
  $('#school-calendar-week-label').textContent = weekLabel(dates);
  if (!selectedLocation) {
    table.innerHTML = `<tbody><tr><td class="muted" style="padding:50px">Add a school in ${esc(selectedState)} to see school scheduling.</td></tr></tbody>`;
    $('#school-risk-summary').innerHTML = riskList([`No school selected for ${selectedState}.`]);
    return;
  }
  table.innerHTML = renderCalendarTable(dates, date => {
    const iso = formatISODate(date);
    const events = stateWork(selectedState).filter(work => work.location === selectedLocation && eventOccursOn(work, iso)).sort(sortByTime);
    return {events, addSlot: '', empty: 'No school activity'};
  }, true);
  $('#school-risk-summary').innerHTML = buildSchoolRiskSummary(selectedState, selectedLocation, dates);
}

function renderCalendarTable(dates, eventProvider, readOnly = false) {
  const today = formatISODate(new Date());
  const head = `<thead><tr>${dates.map((date, index) => {
    const iso = formatISODate(date);
    return `<th class="${iso === today ? 'calendar-today' : ''}">${dayNames()[index]}<span class="calendar-date">${formatShortDate(date)}</span></th>`;
  }).join('')}</tr></thead>`;
  const body = dates.map(date => {
    const iso = formatISODate(date);
    const {events, addSlot, empty} = eventProvider(date);
    const conflictIds = overlappingEventIds(events);
    const cards = events.map(work => calendarEventCard(work, iso, readOnly, conflictIds.has(work.id))).join('') || `<p class="calendar-empty">${esc(empty)}</p>`;
    const add = !readOnly && addSlot ? `<button class="calendar-add" data-staff-slot="${esc(addSlot)}">+ Add event</button>` : '';
    return `<td class="calendar-day-cell"><div class="calendar-events">${cards}</div>${add}</td>`;
  }).join('');
  return `${head}<tbody><tr>${body}</tr></tbody>`;
}

function calendarEventCard(work, iso, readOnly = false, hasConflict = false) {
  const teacher = state.teachers.find(t => t.id === work.teacherId);
  const slot = `${work.teacherId}|${iso}`;
  const attrs = readOnly ? `data-work-id="${work.id}" data-staff-slot="${slot}"` : `data-work-id="${work.id}" data-staff-slot="${slot}"`;
  return `<button class="calendar-event ${hasConflict ? 'conflict' : ''}" ${attrs}><span>${esc(work.startTime)}–${esc(work.endTime)}${work.recurrence !== 'none' ? ' ↻' : ''}${hasConflict ? ' · Conflict' : ''}</span><strong>${esc(work.activity)}</strong><small>${esc(readOnly ? `${teacherName(work.teacherId)} · ${work.mode === 'online' ? 'Online' : work.location || 'Offline'}` : work.mode === 'online' ? 'Online' : work.location || 'Offline')}</small><em>Edit</em></button>`;
}

function openEditor(type, id = '', slot = '') {
  const fields = $('#dialog-fields');
  const dialog = $('#editor-dialog');
  const form = $('#editor-form');
  const record = type === 'teacher' ? state.teachers.find(t => t.id === id) : null;
  editingId = id || null;
  form.dataset.type = type;
  form.dataset.slot = slot;
  dialog.classList.toggle('staff-dialog', type === 'teacher');
  const titles = {teacher: record ? 'Edit VE staff' : 'Add VE staff member', class:'Add class', room:'Add school location', calendarWork:'Schedule staff activity'};
  $('#dialog-title').textContent = titles[type] || 'Add item';
  if (type === 'teacher') fields.innerHTML = teacherFields(record);
  if (type === 'class') fields.innerHTML = classFields();
  if (type === 'room') fields.innerHTML = roomFields();
  if (type === 'calendarWork') fields.innerHTML = workFields(id, slot);
  dialog.showModal();
  bindDialogControls();
}

function teacherFields(record = {}) {
  const activeState = $('#staff-view')?.classList.contains('active') ? state.selectedStaffState : state.selectedSetupState;
  const selectedState = record.state || activeState || DEFAULT_STATE;
  return `
    <label>First name<input name="firstName" value="${esc(record.firstName || '')}" required></label>
    <label>Last name<input name="lastName" value="${esc(record.lastName || '')}" required></label>
    <label>Email ID<input name="email" type="email" value="${esc(record.email || '')}" required></label>
    <label>Phone<input name="phone" value="${esc(record.phone || '')}"></label>
    <label>Alternate phone<input name="alternatePhone" value="${esc(record.alternatePhone || '')}"></label>
    <label>Short code<input name="code" maxlength="4" value="${esc(record.code || '')}" required></label>
    <label>State<select name="state">${STATES.map(s => `<option ${s === selectedState ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
    <label>Role / designation<input name="role" value="${esc(record.role || 'Facilitator')}" required></label>
    <label>Qualification<input name="qualification" value="${esc(record.qualification || '')}"></label>
    <label>Special educator?<select name="specialEducator"><option ${record.specialEducator !== 'Yes' ? 'selected' : ''}>No</option><option ${record.specialEducator === 'Yes' ? 'selected' : ''}>Yes</option></select></label>
    <label>Educator?<select name="educator"><option ${record.educator !== 'No' ? 'selected' : ''}>Yes</option><option ${record.educator === 'No' ? 'selected' : ''}>No</option></select></label>
    <label class="location-picker"><span>Schools this staff member visits</span><div class="checkbox-grid">${stateRooms(selectedState).map(room => checkbox('locations', room.name, record.locations?.includes(room.name))).join('') || '<span class="muted">Add schools in this state first.</span>'}</div></label>
    <label class="activity-picker"><span>Activities this staff member can do</span><div class="checkbox-grid">${ACTIVITIES.map(activity => checkbox('activities', activity, !record.id || record.activities?.includes(activity))).join('')}</div></label>`;
}

function classFields() {
  const rooms = stateRooms(state.selectedSetupState);
  return `<label>Class / grade<input name="grade" placeholder="6" required></label><label>Section<input name="section" placeholder="A" required></label><label class="full">Default location<select name="room" required>${rooms.map(room => `<option>${esc(room.name)}</option>`).join('')}</select></label>`;
}

function roomFields() {
  return `<label class="full">School name<input name="name" placeholder="VNEB School" required></label>`;
}

function workFields(id, slot) {
  const existing = state.staffWork.find(work => work.id === id);
  const [teacherId, date] = slot.split('|');
  const teacher = state.teachers.find(t => t.id === (existing?.teacherId || teacherId));
  const activities = teacher?.activities?.length ? teacher.activities : ACTIVITIES;
  const locations = teacher?.locations?.length ? teacher.locations : stateRooms(teacher?.state || state.selectedStaffState).map(room => room.name);
  const work = existing || {date, startTime:'10:00', endTime:'11:00', activity:activities[0], mode:'offline', location:locations[0] || '', recurrence:'none', repeatUntil:'', notes:''};
  return `
    <label>Date<input type="date" name="date" value="${esc(work.date || date)}" required></label>
    <label>Activity<select name="activity">${activities.map(activity => `<option ${activity === work.activity ? 'selected' : ''}>${esc(activity)}</option>`).join('')}</select></label>
    <label>Start time<input type="time" name="startTime" value="${esc(work.startTime)}" required></label>
    <label>End time<input type="time" name="endTime" value="${esc(work.endTime)}" required></label>
    <label>Mode<select name="mode"><option value="offline" ${work.mode !== 'online' ? 'selected' : ''}>Offline</option><option value="online" ${work.mode === 'online' ? 'selected' : ''}>Online</option></select></label>
    <label data-location-field>Location<select name="location">${locations.map(location => `<option ${location === work.location ? 'selected' : ''}>${esc(location)}</option>`).join('')}</select></label>
    <label>Recurring<select name="recurrence"><option value="none" ${work.recurrence === 'none' ? 'selected' : ''}>Does not repeat</option><option value="daily" ${work.recurrence === 'daily' ? 'selected' : ''}>Daily</option><option value="weekdays" ${work.recurrence === 'weekdays' ? 'selected' : ''}>Every weekday</option><option value="weekly" ${work.recurrence === 'weekly' ? 'selected' : ''}>Weekly</option><option value="monthly" ${work.recurrence === 'monthly' ? 'selected' : ''}>Monthly</option></select></label>
    <label data-repeat-until>Repeat until<input type="date" name="repeatUntil" value="${esc(work.repeatUntil || '')}"></label>
    <label class="full">Notes<input name="notes" value="${esc(work.notes || '')}" placeholder="Optional note"></label>
    ${existing ? `<label class="full"><button type="button" class="btn secondary" data-delete-work="${existing.id}">Delete this event / series</button></label>` : ''}`;
}

function bindDialogControls() {
  const form = $('#editor-form');
  const stateSelect = form.querySelector('[name="state"]');
  if (stateSelect) stateSelect.addEventListener('change', () => {
    const record = editingId ? state.teachers.find(t => t.id === editingId) : {...Object.fromEntries(new FormData(form)), id: editingId};
    record.state = stateSelect.value;
    $('#dialog-fields').innerHTML = teacherFields(record);
    bindDialogControls();
  });
  const recurrence = form.querySelector('[name="recurrence"]');
  const repeatUntil = form.querySelector('[data-repeat-until]');
  const mode = form.querySelector('[name="mode"]');
  const locationField = form.querySelector('[data-location-field]');
  const sync = () => {
    if (repeatUntil && recurrence) repeatUntil.classList.toggle('is-hidden', recurrence.value === 'none');
    if (locationField && mode) locationField.classList.toggle('is-hidden', mode.value === 'online');
  };
  recurrence?.addEventListener('change', sync);
  mode?.addEventListener('change', sync);
  sync();
}

function submitEditor(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.type;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  if (type === 'teacher') {
    const activities = formData.getAll('activities');
    const locations = formData.getAll('locations');
    if (!activities.length) return toast('Select at least one activity for this staff member');
    if (!locations.length) return toast('Select at least one school for this staff member');
    const existing = state.teachers.find(t => t.id === editingId);
    const teacher = {...(existing || {}), id: existing?.id || uid(), firstName:data.firstName, lastName:data.lastName, name:`${data.firstName} ${data.lastName}`.trim(), email:data.email, phone:data.phone, alternatePhone:data.alternatePhone, code:data.code.toUpperCase(), state:data.state, role:data.role, qualification:data.qualification, specialEducator:data.specialEducator, educator:data.educator, locations, activities};
    if (existing) Object.assign(existing, teacher);
    else state.teachers.push(teacher);
    state.selectedSetupState = data.state;
    state.selectedStaffState = data.state;
  }
  if (type === 'class') state.classes.push({id: uid(), grade:data.grade, section:data.section.toUpperCase(), room:data.room, state: state.selectedSetupState});
  if (type === 'room') state.rooms.push({id: uid(), name:data.name, state: state.selectedSetupState});
  if (type === 'calendarWork') {
    const [slotTeacherId] = form.dataset.slot.split('|');
    if (data.endTime <= data.startTime) return toast('End time must be after start time');
    const existing = state.staffWork.find(work => work.id === editingId);
    const work = {id: existing?.id || uid(), teacherId: existing?.teacherId || slotTeacherId, date:data.date, activity:data.activity, startTime:data.startTime, endTime:data.endTime, mode:data.mode, location:data.mode === 'online' ? '' : data.location, recurrence:data.recurrence || 'none', repeatUntil:data.recurrence === 'none' ? '' : data.repeatUntil, notes:data.notes || ''};
    if (existing) Object.assign(existing, work);
    else state.staffWork.push(work);
  }
  editingId = null;
  save();
  render();
  $('#editor-dialog').close();
}

function remove(type, id) {
  if (type === 'teacher') {
    state.teachers = state.teachers.filter(item => item.id !== id);
    state.staffWork = state.staffWork.filter(item => item.teacherId !== id);
  }
  if (type === 'class') state.classes = state.classes.filter(item => item.id !== id);
  if (type === 'room') {
    const room = state.rooms.find(item => item.id === id);
    state.rooms = state.rooms.filter(item => item.id !== id);
    if (room) state.teachers.forEach(teacher => teacher.locations = (teacher.locations || []).filter(location => location !== room.name));
  }
  save();
  render();
}

function resetKarnatakaDemo() {
  const fresh = structuredClone(DEMO);
  state.teachers = state.teachers.filter(item => item.state !== DEFAULT_STATE).concat(fresh.teachers);
  state.classes = state.classes.filter(item => item.state !== DEFAULT_STATE).concat(fresh.classes);
  state.rooms = state.rooms.filter(item => item.state !== DEFAULT_STATE).concat(fresh.rooms);
  state.staffWork = state.staffWork.filter(item => !fresh.teachers.some(t => t.id === item.teacherId)).concat(fresh.staffWork);
  state.selectedSetupState = DEFAULT_STATE;
  state.selectedStaffState = DEFAULT_STATE;
  state.selectedSchoolState = DEFAULT_STATE;
  state.selectedSchoolLocation = DEMO_LOCATIONS[0];
  save();
  render();
}

function buildStaffRiskSummary(teacher, dates) {
  const events = dates.flatMap(date => {
    const iso = formatISODate(date);
    return state.staffWork.filter(work => work.teacherId === teacher.id && eventOccursOn(work, iso)).map(work => ({...work, occurrenceDate: iso}));
  });
  const risks = [];
  const totalHours = events.reduce((sum, event) => sum + eventHours(event), 0);
  const travelEvents = events.filter(event => /travel/i.test(event.activity)).length;
  const offlineLocations = [...new Set(events.filter(event => event.mode !== 'online' && event.location).map(event => event.location))];
  const dayHours = groupBy(events, 'occurrenceDate');
  Object.entries(dayHours).forEach(([date, items]) => {
    const hours = items.reduce((sum, item) => sum + eventHours(item), 0);
    const locations = [...new Set(items.filter(item => item.location).map(item => item.location))];
    if (overlappingEventIds(items).size) risks.push(`${formatDisplayDate(new Date(`${date}T00:00:00`))}: two or more activities overlap in time and are marked red on the calendar.`);
    if (hours > 7) risks.push(`${formatDisplayDate(new Date(`${date}T00:00:00`))}: ${teacher.name} has ${hours.toFixed(1)} planned hours, which may create effort risk.`);
    if (locations.length > 1) risks.push(`${formatDisplayDate(new Date(`${date}T00:00:00`))}: multiple school locations (${locations.join(', ')}) may increase travel cost and delay risk.`);
  });
  if (totalHours > 36) risks.push(`Weekly load is ${totalHours.toFixed(1)} hours, which may be high for one staff member.`);
  if (travelEvents > 2) risks.push(`${travelEvents} travel blocks appear this week; review transport cost and buffer time.`);
  if (offlineLocations.length > 2) risks.push(`Work spans ${offlineLocations.length} schools this week; clustering visits may reduce cost.`);
  if (!risks.length) risks.push(`No major effort, travel or cost risks detected for ${teacher.name} this week.`);
  return riskList(risks);
}

function buildSchoolRiskSummary(selectedState, selectedLocation, dates) {
  const events = dates.flatMap(date => {
    const iso = formatISODate(date);
    return stateWork(selectedState).filter(work => work.location === selectedLocation && eventOccursOn(work, iso)).map(work => ({...work, occurrenceDate: iso}));
  });
  const risks = [];
  const staff = [...new Set(events.map(event => event.teacherId))];
  const travelEvents = events.filter(event => /travel/i.test(event.activity)).length;
  const dayEvents = groupBy(events, 'occurrenceDate');
  Object.entries(dayEvents).forEach(([date, items]) => {
    const staffCount = new Set(items.map(item => item.teacherId)).size;
    if (overlappingEventIds(items).size) risks.push(`${formatDisplayDate(new Date(`${date}T00:00:00`))}: overlapping school activities are marked red; confirm room and staff availability.`);
    if (items.length > 5) risks.push(`${formatDisplayDate(new Date(`${date}T00:00:00`))}: ${items.length} activities are planned at ${selectedLocation}; check room availability and school coordination effort.`);
    if (staffCount > 3) risks.push(`${formatDisplayDate(new Date(`${date}T00:00:00`))}: ${staffCount} VE staff are visiting; transport and coordination cost may be higher.`);
  });
  if (travelEvents && travelEvents >= Math.max(2, events.length / 3)) risks.push(`Travel is a large share of planned activity for ${selectedLocation}; check if visits can be combined.`);
  if (!staff.length) risks.push(`No activities are planned for ${selectedLocation} in this week.`);
  else if (!risks.length) risks.push(`No major effort, cost or staffing risks detected for ${selectedLocation} this week.`);
  return riskList(risks);
}

function riskList(items) {
  return `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function exportStaffCalendar() {
  const teacherId = $('#staff-calendar-person').value;
  const teacher = state.teachers.find(t => t.id === teacherId);
  const events = state.staffWork.filter(work => work.teacherId === teacherId && work.date).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  if (!teacher) return toast('Select a VE staff member first');
  if (!events.length) return toast(`No dated events to export for ${teacher.name}`);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','METHOD:PUBLISH','PRODID:-//Vision Empower Trust//VE Scheduler//EN',`X-WR-CALNAME:${icsText(`VE Scheduler - ${teacher.name}`)}`];
  events.forEach(event => {
    lines.push('BEGIN:VEVENT',`UID:${event.id}@vescheduler.visionempowertrust.org`,`DTSTAMP:${stamp}`,`DTSTART:${icsDate(event.date, event.startTime)}`,`DTEND:${icsDate(event.date, event.endTime)}`,`SUMMARY:${icsText(event.activity)}`,`LOCATION:${icsText(event.mode === 'online' ? 'Online' : event.location || '')}`,`DESCRIPTION:${icsText(event.notes || `Scheduled for ${teacher.name}`)}`);
    const rule = recurrenceRule(event);
    if (rule) lines.push(rule);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `VE-Scheduler-${teacher.name.replace(/[^a-z0-9]+/gi, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`Calendar exported for ${teacher.name}`);
}

function eventOccursOn(event, isoDate) {
  if (!event.date || isoDate < event.date) return false;
  if (event.repeatUntil && isoDate > event.repeatUntil) return false;
  if (event.recurrence === 'none') return isoDate === event.date;
  const start = new Date(`${event.date}T00:00:00`);
  const current = new Date(`${isoDate}T00:00:00`);
  const days = Math.round((current - start) / 86400000);
  if (event.recurrence === 'daily') return true;
  if (event.recurrence === 'weekdays') return current.getDay() >= 1 && current.getDay() <= 5;
  if (event.recurrence === 'weekly') return days % 7 === 0;
  if (event.recurrence === 'monthly') return start.getDate() === current.getDate();
  return false;
}

function recurrenceRule(event) {
  if (!event.recurrence || event.recurrence === 'none') return '';
  const freq = {daily:'DAILY',weekdays:'WEEKLY',weekly:'WEEKLY',monthly:'MONTHLY'}[event.recurrence];
  const parts = [`RRULE:FREQ=${freq}`];
  if (event.recurrence === 'weekdays') parts.push('BYDAY=MO,TU,WE,TH,FR');
  if (event.repeatUntil) parts.push(`UNTIL=${icsDate(event.repeatUntil, '23:59')}`);
  return parts.join(';');
}

function stateTeachers(selectedState) { return state.teachers.filter(item => item.state === selectedState); }
function stateClasses(selectedState) { return state.classes.filter(item => item.state === selectedState); }
function stateRooms(selectedState) { return state.rooms.filter(item => item.state === selectedState); }
function stateWork(selectedState) { const ids = new Set(stateTeachers(selectedState).map(item => item.id)); return state.staffWork.filter(item => ids.has(item.teacherId)); }
function teacherName(id) { return state.teachers.find(item => item.id === id)?.name || 'Unknown'; }
function countTravelEvents(events) { return events.filter(event => /travel/i.test(event.activity)).length; }
function sortByTime(a, b) { return a.startTime.localeCompare(b.startTime); }
function emptyRow(cols, text) { return `<tr><td colspan="${cols}" class="muted" style="padding:32px">${esc(text)}</td></tr>`; }
function checkbox(name, value, checked = false) { return `<label><input type="checkbox" name="${esc(name)}" value="${esc(value)}" ${checked ? 'checked' : ''}>${esc(value)}</label>`; }
function setSelectOptions(select, options, value) { if (!select) return; const selected = options.includes(value) ? value : options[0]; select.innerHTML = options.map(option => `<option ${option === selected ? 'selected' : ''}>${esc(option)}</option>`).join(''); select.value = selected; }
function groupBy(items, key) { return items.reduce((acc, item) => ((acc[item[key]] ||= []).push(item), acc), {}); }
function eventHours(event) { const [sh, sm] = event.startTime.split(':').map(Number); const [eh, em] = event.endTime.split(':').map(Number); return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60); }
function overlappingEventIds(events) { const ids = new Set(); for (let i = 0; i < events.length; i++) for (let j = i + 1; j < events.length; j++) if (eventsOverlap(events[i], events[j])) { ids.add(events[i].id); ids.add(events[j].id); } return ids; }
function eventsOverlap(a, b) { return timeToMinutes(a.startTime) < timeToMinutes(b.endTime) && timeToMinutes(b.startTime) < timeToMinutes(a.endTime); }
function timeToMinutes(time = '00:00') { const [hours, minutes] = time.split(':').map(Number); return (hours || 0) * 60 + (minutes || 0); }
function calendarDates(start) { return dayNames().map((_, index) => addDays(start, index)); }
function weekLabel(dates) { return dates.length ? `${formatDisplayDate(dates[0])} – ${formatDisplayDate(dates[dates.length - 1])}` : ''; }
function dayNames() { return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].slice(0, +state.settings.days || 6); }
function startOfWeek(date) { const d = new Date(date); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0,0,0,0); return d; }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function formatISODate(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatShortDate(date) { return new Intl.DateTimeFormat('en-IN', {day:'2-digit', month:'short'}).format(date); }
function formatDisplayDate(date) { return new Intl.DateTimeFormat('en-IN', {day:'2-digit', month:'short', year:'numeric'}).format(date); }
function periodTimes(period) { const start = 9 * 60 + (period - 1) * 55; const end = start + 45; return {start: toTime(start), end: toTime(end)}; }
function toTime(minutes) { return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`; }
function icsDate(date, time) { const local = new Date(`${date}T${time}:00+05:30`); return local.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
function icsText(text = '') { return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }

document.addEventListener('click', event => {
  const view = event.target.closest('[data-view]');
  const action = event.target.closest('[data-action]');
  const add = event.target.closest('[data-add]');
  const edit = event.target.closest('[data-edit]');
  const del = event.target.closest('[data-delete]');
  const staff = event.target.closest('[data-schedule-staff]');
  const slot = event.target.closest('[data-staff-slot]');
  const deleteWork = event.target.closest('[data-delete-work]');
  const nav = event.target.closest('[data-calendar-nav]');
  const schoolNav = event.target.closest('[data-school-calendar-nav]');
  if (view) showView(view.dataset.view);
  if (add) openEditor(add.dataset.add);
  if (edit) openEditor(edit.dataset.edit, edit.dataset.id);
  if (del) remove(del.dataset.delete, del.dataset.id);
  if (staff) { showView('staff'); $('#staff-calendar-person').value = staff.dataset.scheduleStaff; renderStaffCalendar(); $('#staff-calendar-table').scrollIntoView({behavior:'smooth', block:'center'}); }
  if (slot) openEditor('calendarWork', slot.dataset.workId || '', slot.dataset.staffSlot);
  if (deleteWork) { state.staffWork = state.staffWork.filter(work => work.id !== deleteWork.dataset.deleteWork); save(); render(); $('#editor-dialog').close(); }
  if (nav) { calendarWeekStart = nav.dataset.calendarNav === 'today' ? startOfWeek(new Date()) : addDays(calendarWeekStart, nav.dataset.calendarNav === 'next' ? 7 : -7); renderStaffCalendar(); }
  if (schoolNav) { schoolCalendarWeekStart = schoolNav.dataset.schoolCalendarNav === 'today' ? startOfWeek(new Date()) : addDays(schoolCalendarWeekStart, schoolNav.dataset.schoolCalendarNav === 'next' ? 7 : -7); renderSchoolCalendar(); }
  if (action?.dataset.action === 'export-ics') exportStaffCalendar();
  if (action?.dataset.action === 'reset-demo') resetKarnatakaDemo();
});

$('#editor-form').addEventListener('submit', submitEditor);
$('#setup-state-select').addEventListener('change', event => { state.selectedSetupState = event.target.value; save(true); render(); });
$('#staff-state-filter').addEventListener('change', event => { state.selectedStaffState = event.target.value; save(true); renderStaffPage(); });
$('#school-state-filter').addEventListener('change', event => { state.selectedSchoolState = event.target.value; state.selectedSchoolLocation = ''; save(true); renderSchoolPage(); });
$('#school-location-filter').addEventListener('change', event => { state.selectedSchoolLocation = event.target.value; save(true); renderSchoolCalendar(); });
$('#staff-search').addEventListener('input', renderStaffPage);
$('#staff-calendar-person').addEventListener('change', renderStaffCalendar);
$('#working-days').addEventListener('change', event => { state.settings.days = +event.target.value; save(); render(); });
$('.mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

save(true);
render();
