const { minutesBetween, buildWeekSeries, startOfDay } = require('../../src/focus/utils/focus.utils');

describe('focus.utils timer accuracy', () => {
  test('minutesBetween computes rounded minutes', () => {
    const start = new Date('2026-02-17T10:00:00.000Z');
    const end = new Date('2026-02-17T10:24:31.000Z');
    expect(minutesBetween(start, end)).toBe(25);
  });

  test('buildWeekSeries fills missing days with zero', () => {
    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const series = buildWeekSeries([
      { date: yesterday, totalTime: 40, pomodorosCompleted: 2 }
    ], 2);

    expect(series).toHaveLength(2);
    expect(series[0].totalMinutes).toBe(40);
    expect(series[1].totalMinutes).toBe(0);
  });
});
