const connectionsByUser = new Map();

function sendSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload || {})}\n\n`);
}

function subscribeUser(userId, res) {
  const key = Number(userId);
  const current = connectionsByUser.get(key) || new Set();
  current.add(res);
  connectionsByUser.set(key, current);

  return () => {
    const entries = connectionsByUser.get(key);
    if (!entries) return;
    entries.delete(res);
    if (entries.size === 0) {
      connectionsByUser.delete(key);
    }
  };
}

function emitToUsers(userIds, event, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const uniqueIds = Array.from(new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  for (const userId of uniqueIds) {
    const clients = connectionsByUser.get(userId);
    if (!clients?.size) continue;
    for (const res of clients) {
      sendSseEvent(res, event, payload);
    }
  }
}

function emitRefresh(userIds, scopes = ['notifications', 'messages']) {
  emitToUsers(userIds, 'refresh', {
    scopes,
    at: new Date().toISOString()
  });
}

module.exports = {
  sendSseEvent,
  subscribeUser,
  emitRefresh
};

