<script>
  import ArtistSearch from '$lib/components/ArtistSearch.svelte';
  import Game from '$lib/components/Game.svelte';
  import StatsOverview from '$lib/components/StatsOverview.svelte';

  let showGame = $state(false);
  let selectedArtist = $state(null);
  let showStats = $state(false);
  let dailyMode = $state(false);
  let dailyLoading = $state(false);
  /** @type {string | null} */
  let dailyError = $state(null);

  /** @param {any} event */
  function handleArtistSelect(event) {
    selectedArtist = event.detail;
    dailyMode = false;
    showGame = true;
    showStats = false;
  }

  async function playDaily() {
    dailyLoading = true;
    dailyError = null;
    try {
      const response = await fetch('/api/daily');
      if (!response.ok) {
        throw new Error('Failed to load daily artist');
      }
      const data = await response.json();
      selectedArtist = data.artist;
      dailyMode = true;
      showGame = true;
      showStats = false;
    } catch (err) {
      dailyError = 'Could not load today\'s artist. Try again later.';
    } finally {
      dailyLoading = false;
    }
  }

  function handleNewGame() {
    showGame = false;
    selectedArtist = null;
    dailyMode = false;
  }

  function toggleStats() {
    showStats = !showStats;
  }
</script>

<svelte:head>
  <title>Heardle Clone - Guess the Song!</title>
  <meta name="description" content="A Heardle-style game where you guess songs from your favorite artists" />
</svelte:head>

<div class="app">
  <button class="stats-toggle" onclick={toggleStats}>
    {showStats ? 'Hide Stats' : 'Show Stats'}
  </button>

  {#if showStats}
    <StatsOverview artist={selectedArtist} />
  {/if}

  {#if !showGame}
    <div class="landing">
      <h1 class="title">🎵 Ana's Heardle</h1>
      <p class="subtitle">Pick an artist and try to guess their song!</p>
      
      <button class="daily-btn" onclick={playDaily} disabled={dailyLoading}>
        {#if dailyLoading}
          Loading...
        {:else}
          📅 Daily Heardle
        {/if}
      </button>
      
      {#if dailyError}
        <p class="error">{dailyError}</p>
      {/if}

      <div class="or-divider">
        <span>OR</span>
      </div>

      <ArtistSearch on:artistSelected={handleArtistSelect} />
    </div>
  {:else}
    <Game artist={selectedArtist} dailyMode={dailyMode} on:newGame={handleNewGame} />
  {/if}
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    min-height: 100vh;
    color: #fff;
  }

  .app {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .stats-toggle {
    align-self: flex-end;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    margin-bottom: 1rem;
    transition: background 0.2s;
  }

  .stats-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .landing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1rem;
  }

  .title {
    font-size: 2.5rem;
    font-weight: 800;
    text-align: center;
    background: linear-gradient(to right, #f7971e, #ffd200);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    margin-bottom: 1rem;
  }

  .daily-btn {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #f7971e, #ffd200);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 15px rgba(247, 151, 30, 0.3);
    margin-bottom: 1rem;
  }

  .daily-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(247, 151, 30, 0.4);
  }

  .daily-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .daily-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .or-divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 300px;
    margin: 0.5rem 0 1rem;
  }

  .or-divider::before,
  .or-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }

  .or-divider span {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.85rem;
    text-transform: uppercase;
  }

  .error {
    color: #ff6b6b;
    font-size: 0.9rem;
    margin-top: -0.5rem;
    margin-bottom: 0.5rem;
  }
</style>
