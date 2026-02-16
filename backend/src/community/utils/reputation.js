function getReputationLevel(score) {
  const value = Number(score || 0);
  if (value >= 500) return 'Leader Educatif';
  if (value >= 201) return 'Contributeur';
  if (value >= 51) return 'Actif';
  return 'Nouveau';
}

module.exports = { getReputationLevel };
