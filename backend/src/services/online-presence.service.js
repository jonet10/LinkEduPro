const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const presenceByUserId = new Map();

function normalizeRole(role) {
  const value = String(role || '').toUpperCase();
  if (value === 'ADMIN' || value === 'TEACHER' || value === 'STUDENT') {
    return value;
  }
  return 'OTHER';
}

function cleanup(now = Date.now()) {
  for (const [userId, entry] of presenceByUserId.entries()) {
    if (!entry?.lastSeenAt || now - entry.lastSeenAt > ONLINE_WINDOW_MS) {
      presenceByUserId.delete(userId);
    }
  }
}

function touchPresence(user) {
  if (!user?.id) return null;
  const userId = Number(user.id);
  const previous = presenceByUserId.get(userId) || null;
  const now = Date.now();
  presenceByUserId.set(userId, {
    role: normalizeRole(user.role),
    lastSeenAt: now
  });
  return {
    previousLastSeenAt: previous?.lastSeenAt ? new Date(previous.lastSeenAt).toISOString() : null,
    currentLastSeenAt: new Date(now).toISOString()
  };
}

function getOnlineStats(currentUserId) {
  cleanup();
  const counts = {
    total: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    others: 0
  };
  const lastSeenByRole = {
    students: null,
    teachers: null,
    admins: null,
    others: null
  };
  let latestSeenAt = null;
  let mineLastSeenAt = null;
  const userId = Number(currentUserId);

  for (const [id, entry] of presenceByUserId.entries()) {
    counts.total += 1;
    const seenIso = new Date(entry.lastSeenAt).toISOString();
    if (!latestSeenAt || seenIso > latestSeenAt) latestSeenAt = seenIso;

    if (entry.role === 'STUDENT') {
      counts.students += 1;
      if (!lastSeenByRole.students || seenIso > lastSeenByRole.students) lastSeenByRole.students = seenIso;
    } else if (entry.role === 'TEACHER') {
      counts.teachers += 1;
      if (!lastSeenByRole.teachers || seenIso > lastSeenByRole.teachers) lastSeenByRole.teachers = seenIso;
    } else if (entry.role === 'ADMIN') {
      counts.admins += 1;
      if (!lastSeenByRole.admins || seenIso > lastSeenByRole.admins) lastSeenByRole.admins = seenIso;
    } else {
      counts.others += 1;
      if (!lastSeenByRole.others || seenIso > lastSeenByRole.others) lastSeenByRole.others = seenIso;
    }

    if (Number.isFinite(userId) && id === userId) {
      mineLastSeenAt = seenIso;
    }
  }

  return {
    counts,
    latestSeenAt,
    lastSeenByRole,
    mineLastSeenAt,
    activeWindowSeconds: Math.trunc(ONLINE_WINDOW_MS / 1000),
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  touchPresence,
  getOnlineStats
};
