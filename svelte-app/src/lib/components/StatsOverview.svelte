<script>
  import { onMount } from 'svelte';
  import { getOverallStats, getArtistStats, loadHistory } from '$lib/gameHistory.js';

  /** @type {{ id: string, name: string } | null} */
  const { artist } = $props();

  /** @type {{ totalGames: number, wins: number, losses: number, accuracy: number, averageGuesses: number, bestScore: number, artistsPlayed: number, topArtists: Array<{ name: string, count: number, wins: number, accuracy: number }> }} */
  let overallStats = $state({
    totalGames: 0, wins: 0, losses: 0, accuracy: 0,
    averageGuesses: 0, bestScore: 0, artistsPlayed: 0, topArtists: []
  });

  /** @type {{ artistId: string, artistName: string, totalGames: number, wins: number, losses: number, accuracy: number, averageGuesses: number, bestScore: number, recentGames: Array<{ songTitle: string, artistName: string, won: boolean, guesses: number, timestamp: number }> } | null} */
  let artistStats = $state(null);

  /** @type {Array<{ songTitle: string, artistName: string, won: boolean, guesses: number, timestamp: number }>} */
  let recentGames = $state([]);

  let showArtistStats = $state(false);

  onMount(() => {
    refreshStats();
  });

  function refreshStats() {
    overallStats = /** @type {{ totalGames: number, wins: number, losses: number, accuracy: number, averageGuesses: number, bestScore: number, artistsPlayed: number, topArtists: Array<{ name: string, count: number, wins: number, accuracy: number }> }} */ (getOverallStats());
    const history = loadHistory();
    recentGames = history.slice(-10).reverse();

    if (artist) {
      artistStats = getArtistStats(artist.id);
      showArtistStats = artistStats !== null;
    } else {
      artistStats = null;
      showArtistStats = false;
    }
  }

  /** @param {number} timestamp */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  /** @param {number} value @param {string} unit */
  function formatBar(value, unit) {
    return `${value}${unit}`;
  }
</script>

<div class="stats-container">
  <div class="stats-header">
    <h2 class="stats-title">📊 Game Statistics</h2>
    <button onclick={refreshStats} class="refresh-btn" title="Refresh stats">↻</button>
  </div>

  {#if overallStats.totalGames === 0}
    <div class="no-stats">
      <p>No games played yet. Start playing to see your stats!</p>
    </div>
  {:else}
    <!-- Overall Stats -->
    <div class="stats-section">
      <h3 class="section-title">Overall Performance</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{overallStats.totalGames}</div>
          <div class="stat-label">Total Games</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{overallStats.wins}</div>
          <div class="stat-label">Wins</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{overallStats.accuracy}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{overallStats.averageGuesses}</div>
          <div class="stat-label">Avg Guesses (wins)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{overallStats.bestScore}</div>
          <div class="stat-label">Best Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{overallStats.artistsPlayed}</div>
          <div class="stat-label">Artists Played</div>
        </div>
      </div>
    </div>

    <!-- Win Rate Bar -->
    <div class="stats-section">
      <h3 class="section-title">Win Rate</h3>
      <div class="progress-bar">
        <div
          class="progress-fill"
          style="--width: {overallStats.accuracy}%"
        ></div>
      </div>
      <div class="progress-labels">
        <span>{overallStats.wins}W / {overallStats.losses}L</span>
        <span>{overallStats.accuracy}%</span>
      </div>
    </div>

    <!-- Artist Stats (if artist is provided) -->
    {#if showArtistStats && artistStats}
      <div class="stats-section">
        <h3 class="section-title">Stats for {artistStats.artistName}</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{artistStats.totalGames}</div>
            <div class="stat-label">Games Played</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{artistStats.accuracy}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{artistStats.averageGuesses}</div>
            <div class="stat-label">Avg Guesses</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{artistStats.bestScore}</div>
            <div class="stat-label">Best Score</div>
          </div>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="--width: {artistStats.accuracy}%"
          ></div>
        </div>
        <div class="progress-labels">
          <span>{artistStats.wins}W / {artistStats.losses}L</span>
          <span>{artistStats.accuracy}%</span>
        </div>
      </div>
    {/if}

    <!-- Top Artists -->
    {#if overallStats.topArtists.length > 0}
      <div class="stats-section">
        <h3 class="section-title">Top Artists</h3>
        <div class="artist-list">
          {#each overallStats.topArtists as a (a.name)}
            <div class="artist-row">
              <span class="artist-name">{a.name}</span>
              <span class="artist-games">{a.count} game{a.count !== 1 ? 's' : ''}</span>
              <span class="artist-accuracy">{Math.round(a.accuracy)}%</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Recent Games -->
    {#if recentGames.length > 0}
      <div class="stats-section">
        <h3 class="section-title">Recent Games</h3>
        <div class="recent-games">
          {#each recentGames as game (game.timestamp + game.songTitle)}
            <div class="game-row" class:won={game.won} class:lost={!game.won}>
              <span class="game-result-icon">{game.won ? '✓' : '✗'}</span>
              <span class="game-song">{game.songTitle}</span>
              <span class="game-artist">{game.artistName}</span>
              <span class="game-guesses">{game.guesses} guess{game.guesses !== 1 ? 'es' : ''}</span>
              <span class="game-date">{formatDate(game.timestamp)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .stats-container {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    margin-top: 1rem;
  }

  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .stats-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .refresh-btn {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .refresh-btn:hover {
    opacity: 1;
  }

  .no-stats {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .stats-section {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.75rem;
    text-align: center;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f7971e;
  }

  .stat-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.25rem;
  }

  .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #f7971e, #ffd200);
    border-radius: 4px;
    width: var(--width);
    transition: width 0.3s ease;
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.25rem;
  }

  .artist-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .artist-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .artist-name {
    flex: 1;
    font-weight: 500;
  }

  .artist-games {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
  }

  .artist-accuracy {
    color: #f7971e;
    font-weight: 600;
  }

  .recent-games {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .game-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .game-row.won {
    border-left: 3px solid #4caf50;
  }

  .game-row.lost {
    border-left: 3px solid #f44336;
  }

  .game-result-icon {
    font-weight: bold;
    font-size: 1rem;
  }

  .game-row.won .game-result-icon {
    color: #4caf50;
  }

  .game-row.lost .game-result-icon {
    color: #f44336;
  }

  .game-song {
    flex: 1;
    font-weight: 500;
  }

  .game-artist {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
  }

  .game-guesses {
    color: #f7971e;
    font-weight: 500;
    font-size: 0.8rem;
  }

  .game-date {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
  }
</style>
