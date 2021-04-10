import parseISO from 'date-fns/parseISO';
import addExcludedDateToRRule from './addExcludedDateToRRule';

describe('addExcludedDateToRRule', () => {
  it('should add the excluded date', () => {
    const input = [`RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`];
    const timestamp = parseISO('20210301T090000Z').getTime();
    expect(addExcludedDateToRRule(input, timestamp)).toEqual([
      `RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`,
      `EXDATE:20210301T090000Z`,
    ]);
  });

  it('should add the excluded date even if there was one already', () => {
    const input = [`RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`, `EXDATE:20210300T090000Z`];
    const timestamp = parseISO('20210301T090000Z').getTime();
    expect(addExcludedDateToRRule(input, timestamp)).toEqual([
      `RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`,
      `EXDATE:20210228T090000Z,20210301T090000Z`,
    ]);
  });

  it('should not add an excluded date twice', () => {
    const input = [`RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`, `EXDATE:20210301T090000Z`];
    const timestamp = parseISO('20210301T090000Z').getTime();
    expect(addExcludedDateToRRule(input, timestamp)).toEqual([
      `RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR`,
      `EXDATE:20210301T090000Z`,
    ]);
  });
});
