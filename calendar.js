// Dated staff-calendar interactions are isolated here so the weekly planning
// engine can remain independent from calendar export and navigation.
document.addEventListener('click', event => {
  const addSession = event.target.closest('[data-add="lesson"]');
  if (addSession) {
    event.stopImmediatePropagation();
    openDatedSessionEditor();
    return;
  }

  const slot = event.target.closest('[data-staff-slot]');
  if (slot) {
    event.stopImmediatePropagation();
    openCalendarWorkEditor(slot.dataset.workId || '', slot.dataset.staffSlot);
    bindEventDateControl(slot.dataset.staffSlot);
    bindRecurrenceControls();
    return;
  }

  const navigation = event.target.closest('[data-calendar-nav]');
  if (navigation) {
    const direction = navigation.dataset.calendarNav;
    if (direction === 'today') calendarWeekStart = startOfWeek(new Date());
    if (direction === 'prev') calendarWeekStart = addDays(calendarWeekStart, -7);
    if (direction === 'next') calendarWeekStart = addDays(calendarWeekStart, 7);
    renderStaffCalendar();
    return;
  }

  if (event.target.closest('[data-action="export-ics"]')) exportRecurringStaffCalendar();
}, true);

document.addEventListener('submit', event => {
  if (event.target.id !== 'editor-form' || !['calendarWork', 'datedSession'].includes(event.target.dataset.type)) return;
  event.stopImmediatePropagation();
  if (event.target.dataset.type === 'calendarWork') {
    const [teacherId] = event.target.dataset.slot.split('|');
    const editedDate = event.target.querySelector('[name="eventDate"]')?.value;
    const repeatUntil = event.target.querySelector('[name="repeatUntil"]')?.value;
    if (editedDate && repeatUntil && repeatUntil < editedDate) {
      event.preventDefault();
      toast('Repeat-until date cannot be before the event date');
      return;
    }
    if (editedDate) event.target.dataset.slot = `${teacherId}|${editedDate}`;
  }
  if (event.target.dataset.type === 'datedSession') {
    const isFixed = event.target.querySelector('[name="scheduleType"]')?.value === 'fixed';
    const fixedDate = event.target.querySelector('[name="fixedDate"]')?.value;
    if (isFixed && !fixedDate) {
      event.preventDefault();
      toast('Choose a date for the fixed session');
      return;
    }
  }
  submitEditorCalendarAware(event);
}, true);

function exportRecurringStaffCalendar() {
  const teacherId = document.querySelector('#staff-calendar-person').value;
  const teacher = state.teachers.find(item => item.id === teacherId);
  const events = state.staffWork
    .filter(item => item.teacherId === teacherId && item.date)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  if (!teacher) return toast('Select a VE staff member first');
  if (!events.length) return toast(`No dated events to export for ${teacher.name}`);

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const rules = {
    daily: 'FREQ=DAILY',
    weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    weekly: 'FREQ=WEEKLY',
    monthly: 'FREQ=MONTHLY'
  };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//Vision Empower Trust//VE Scheduler//EN',
    `X-WR-CALNAME:${icsText(`VE Scheduler - ${teacher.name}`)}`
  ];

  events.forEach(item => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.id}@vescheduler.visionempowertrust.org`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(item.date, item.startTime)}`,
      `DTEND:${icsDate(item.date, item.endTime)}`,
      `SUMMARY:${icsText(item.activity)}`,
      `LOCATION:${icsText(item.mode === 'online' ? 'Online' : item.location || '')}`,
      `DESCRIPTION:${icsText(item.notes || `Scheduled for ${teacher.name}`)}`
    );
    if (rules[item.recurrence]) {
      const until = item.repeatUntil ? `;UNTIL=${icsDate(item.repeatUntil, '23:59')}` : '';
      lines.push(`RRULE:${rules[item.recurrence]}${until}`);
    }
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
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

function bindRecurrenceControls() {
  const recurrence = document.querySelector('#dialog-fields [name="recurrence"]');
  const until = document.querySelector('#dialog-fields [name="repeatUntil"]');
  if (!recurrence || !until) return;
  const label = until.closest('label');
  const sync = () => {
    const repeats = recurrence.value !== 'none';
    label.hidden = !repeats;
    if (!repeats) until.value = '';
  };
  recurrence.addEventListener('change', sync);
  sync();
}

function bindEventDateControl(slot) {
  const [, date] = slot.split('|');
  const fields = document.querySelector('#dialog-fields');
  const summary = fields?.querySelector('.full.muted');
  if (!fields || !summary) return;
  const label = document.createElement('label');
  label.className = 'full';
  label.textContent = 'Date';
  const input = document.createElement('input');
  input.type = 'date';
  input.name = 'eventDate';
  input.value = date;
  input.required = true;
  label.appendChild(input);
  summary.after(label);
}
