import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedToInstant, isValidDate, todayIn } from '../src/server/time.ts';
import { occurrenceDates, occurrenceFor, toRecurrenceLines, describeRecurrence, seriesEnd, nextOccurrence, type Schedule } from '../src/server/recurrence.ts';

const base: Schedule = {
  startDate: '2026-09-30', startTime: '17:30', endDate: '2026-09-30', endTime: '19:30', allDay: false,
  timezone: 'America/Los_Angeles', recurrenceFreq: 'none', recurrenceInterval: 1, recurrenceByDay: [],
  recurrenceUntil: null, recurrenceExceptions: [],
};

test('wall clock → instant uses PDT in summer and PST in winter', () => {
  assert.equal(zonedToInstant('2026-09-25', '18:00', 'America/Los_Angeles').toISOString(), '2026-09-26T01:00:00.000Z');
  assert.equal(zonedToInstant('2026-12-24', '18:00', 'America/Los_Angeles').toISOString(), '2026-12-25T02:00:00.000Z');
});

test('DST transition days resolve correctly', () => {
  // Nov 1 2026: clocks fall back at 2 AM. 10 AM worship is PST (UTC-8).
  assert.equal(zonedToInstant('2026-11-01', '10:00', 'America/Los_Angeles').toISOString(), '2026-11-01T18:00:00.000Z');
  // Mar 8 2026: spring forward. 10 AM is PDT (UTC-7).
  assert.equal(zonedToInstant('2026-03-08', '10:00', 'America/Los_Angeles').toISOString(), '2026-03-08T17:00:00.000Z');
});

test('date validation rejects impossible dates', () => {
  assert.ok(isValidDate('2028-02-29'));
  assert.ok(!isValidDate('2026-02-29'));
  assert.ok(!isValidDate('2026-13-01'));
});

test('weekly series keeps 5:30 PM local across the DST change', () => {
  const s: Schedule = { ...base, recurrenceFreq: 'weekly', recurrenceByDay: ['WE'] };
  const dates = occurrenceDates(s, '2026-10-26', 3);
  assert.deepEqual(dates, ['2026-10-28', '2026-11-04', '2026-11-11']);
  assert.equal(occurrenceFor(s, '2026-10-28').start.toISOString(), '2026-10-29T00:30:00.000Z'); // PDT
  assert.equal(occurrenceFor(s, '2026-11-04').start.toISOString(), '2026-11-05T01:30:00.000Z'); // PST
});

test('exceptions and until are honored', () => {
  const s: Schedule = { ...base, recurrenceFreq: 'weekly', recurrenceByDay: ['WE'], recurrenceUntil: '2026-11-18', recurrenceExceptions: ['2026-11-11'] };
  assert.deepEqual(occurrenceDates(s, '2026-11-01', 10), ['2026-11-04', '2026-11-18']);
  assert.equal(seriesEnd(s)?.toISOString(), '2026-11-19T03:30:00.000Z');
});

test('second Sunday of the month', () => {
  const s: Schedule = { ...base, startDate: '2026-10-11', startTime: '11:00', endDate: '2026-10-11', endTime: '12:30', recurrenceFreq: 'monthly_weekday' };
  assert.deepEqual(occurrenceDates(s, '2026-10-01', 4), ['2026-10-11', '2026-11-08', '2026-12-13', '2027-01-10']);
  assert.equal(describeRecurrence(s), 'Second Sunday of each month');
  assert.deepEqual(toRecurrenceLines(s), ['RRULE:FREQ=MONTHLY;BYDAY=2SU']);
});

test('monthly on the 31st skips short months', () => {
  const s: Schedule = { ...base, startDate: '2026-10-31', recurrenceFreq: 'monthly_date' };
  assert.deepEqual(occurrenceDates(s, '2026-10-01', 3), ['2026-10-31', '2026-12-31', '2027-01-31']);
});

test('Google recurrence lines: UTC UNTIL and TZID EXDATE', () => {
  const s: Schedule = { ...base, recurrenceFreq: 'weekly', recurrenceByDay: ['WE'], recurrenceUntil: '2027-05-19', recurrenceExceptions: ['2026-11-25'] };
  assert.deepEqual(toRecurrenceLines(s), [
    'RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20270520T065959Z',
    'EXDATE;TZID=America/Los_Angeles:20261125T173000',
  ]);
});

test('all-day events end at local midnight after the last day', () => {
  const s: Schedule = { ...base, allDay: true, startTime: null, endTime: null, startDate: '2026-12-24', endDate: '2026-12-25' };
  const o = occurrenceFor(s, s.startDate);
  assert.equal(o.start.toISOString(), '2026-12-24T08:00:00.000Z');
  assert.equal(o.end.toISOString(), '2026-12-26T08:00:00.000Z');
});

test('next occurrence skips ones already finished today', () => {
  const s: Schedule = { ...base, recurrenceFreq: 'weekly', recurrenceByDay: ['WE'] };
  const afterEnd = new Date('2026-10-29T03:00:00Z'); // Wed Oct 28, 8 PM PDT
  assert.equal(nextOccurrence(s, afterEnd)?.date, '2026-11-04');
  assert.equal(todayIn('America/Los_Angeles', afterEnd), '2026-10-28');
});
