function startOfDay(dateLike) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateLike) {
  const d = startOfDay(dateLike);
  d.setDate(d.getDate() + 1);
  return d;
}

function minutesBetween(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.round(ms / 60000);
}

function buildWeekSeries(statRows, days) {
  const map = new Map(statRows.map((row) => [new Date(row.date).toISOString().slice(0, 10), row]));
  const today = startOfDay(new Date());
  const result = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - i);
    const key = current.toISOString().slice(0, 10);
    const row = map.get(key);

    result.push({
      date: key,
      totalMinutes: row?.totalTime || 0,
      pomodorosCompleted: row?.pomodorosCompleted || 0
    });
  }

  return result;
}

module.exports = {
  startOfDay,
  endOfDay,
  minutesBetween,
  buildWeekSeries
};
