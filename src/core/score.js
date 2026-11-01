/** Round and match standings. Pure comparisons, no simulation. */

export function leadingIds(values, active) {
  let best = null;
  const winners = [];
  for (let i = 0; i < values.length; i++) {
    if (active && !active[i]) continue;
    if (best === null || values[i] > best) {
      best = values[i];
      winners.length = 0;
      winners.push(i);
    } else if (values[i] === best) {
      winners.push(i);
    }
  }
  return winners;
}

/**
 * Best first. Round wins, then orbs banked across the match,
 * then fewer banishments, then lower seat index.
 * Inactive seats are omitted.
 */
export function rankMatch(stats) {
  const ids = [];
  for (let i = 0; i < 4; i++) if (!stats.active || stats.active[i]) ids.push(i);
  ids.sort((a, b) => compareSeats(a, b, stats));
  return ids;
}

export function compareSeats(a, b, stats) {
  const winsA = stats.roundWins[a] ?? 0;
  const winsB = stats.roundWins[b] ?? 0;
  if (winsA !== winsB) return winsB - winsA;
  const bankA = stats.bankedAll[a] ?? 0;
  const bankB = stats.bankedAll[b] ?? 0;
  if (bankA !== bankB) return bankB - bankA;
  const banA = stats.banishedAll[a] ?? 0;
  const banB = stats.banishedAll[b] ?? 0;
  if (banA !== banB) return banA - banB;
  return a - b;
}

export function championOf(stats) {
  const ranking = rankMatch(stats);
  return ranking.length ? ranking[0] : 0;
}
