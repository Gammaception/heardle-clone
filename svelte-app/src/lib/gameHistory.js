const STORAGE_KEY = 'heardle_game_history';
const COOKIE_DAYS = 365;

/**
 * @typedef {Object} GameResult
 * @property {string} artistId
 * @property {string} artistName
 * @property {string} songTitle
 * @property {boolean} won
 * @property {number} guesses
 * @property {number} timestamp
 */

/**
 * @typedef {Object} ArtistStats
 * @property {string} artistId
 * @property {string} artistName
 * @property {number} totalGames
 * @property {number} wins
 * @property {number} losses
 * @property {number} accuracy
 * @property {number} averageGuesses
 * @property {number} bestScore
 * @property {GameResult[]} recentGames
 */

/**
 * Set a cookie
 * @param {string} name
 * @param {string} value
 * @param {number} days
 */
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + "; " + expires + "; path=/; SameSite=Lax";
}

/**
 * Get a cookie by name
 * @param {string} name
 * @returns {string | null}
 */
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Load game history from cookies
 * @returns {GameResult[]}
 */
export function loadHistory() {
  const data = getCookie(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(decodeURIComponent(data));
  } catch {
    return [];
  }
}

/**
 * Save game history to cookies
 * @param {GameResult[]} history
 */
export function saveHistory(history) {
  // Limit to last 100 games to avoid cookie size limits
  const trimmed = history.slice(-100);
  setCookie(STORAGE_KEY, encodeURIComponent(JSON.stringify(trimmed)), COOKIE_DAYS);
}

/**
 * Add a game result to history
 * @param {GameResult} result
 */
export function addGameResult(result) {
  const history = loadHistory();
  history.push(result);
  saveHistory(history);
}

/**
 * Calculate stats for a specific artist
 * @param {string} artistId
 * @returns {ArtistStats | null}
 */
export function getArtistStats(artistId) {
  const history = loadHistory();
  const artistGames = history.filter(g => g.artistId === artistId);

  if (artistGames.length === 0) return null;

  const wins = artistGames.filter(g => g.won).length;
  const losses = artistGames.length - wins;
  const wonGames = artistGames.filter(g => g.won);
  const avgGuesses = wonGames.length > 0
    ? wonGames.reduce((sum, g) => sum + g.guesses, 0) / wonGames.length
    : 0;
  const bestScore = wonGames.length > 0
    ? Math.min(...wonGames.map(g => g.guesses))
    : null;

  return {
    artistId,
    artistName: artistGames[0].artistName,
    totalGames: artistGames.length,
    wins,
    losses,
    accuracy: (wins / artistGames.length) * 100,
    averageGuesses: Number(avgGuesses.toFixed(2)),
    bestScore: bestScore ?? 0,
    recentGames: artistGames.slice(-5).reverse()
  };
}

/**
 * Calculate overall stats across all artists
 * @returns {Object}
 */
export function getOverallStats() {
  const history = loadHistory();

  if (history.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      accuracy: 0,
      averageGuesses: 0,
      bestScore: 0,
      artistsPlayed: 0,
      topArtists: []
    };
  }

  const wins = history.filter(g => g.won).length;
  const losses = history.length - wins;
  const wonGames = history.filter(g => g.won);
  const avgGuesses = wonGames.length > 0
    ? wonGames.reduce((sum, g) => sum + g.guesses, 0) / wonGames.length
    : 0;
  const bestScore = wonGames.length > 0
    ? Math.min(...wonGames.map(g => g.guesses))
    : 0;

  // Get unique artists and their game counts
  const artistMap = new Map();
  for (const game of history) {
    if (!artistMap.has(game.artistId)) {
      artistMap.set(game.artistId, { name: game.artistName, count: 0, wins: 0 });
    }
    const entry = artistMap.get(game.artistId);
    entry.count++;
    if (game.won) entry.wins++;
  }

  const topArtists = Array.from(artistMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(a => ({ ...a, accuracy: (a.wins / a.count) * 100 }));

  return {
    totalGames: history.length,
    wins,
    losses,
    accuracy: Number(((wins / history.length) * 100).toFixed(2)),
    averageGuesses: Number(avgGuesses.toFixed(2)),
    bestScore,
    artistsPlayed: artistMap.size,
    topArtists
  };
}
