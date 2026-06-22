// Dated staff-calendar interactions are isolated here so the weekly planning
// engine can remain independent from calendar export and navigation.
document.addEventListener('click', event => {
  const slot = event.target.closest('[data-staff-slot]');
  if (slot) {
    event.stopImmediatePropagation();
    openCalendarWorkEditor(slot.dataset.workId || '', slot.dataset.staffSlot);
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

  if (event.target.closest('[data-action="export-ics"]')) exportStaffCalendar();
}, true);

document.addEventListener('submit', event => {
  if (event.target.id !== 'editor-form' || event.target.dataset.type !== 'calendarWork') return;
  event.stopImmediatePropagation();
  submitEditorCalendarAware(event);
}, true);
