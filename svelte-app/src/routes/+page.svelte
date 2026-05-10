<script>
  import ArtistSearch from '$lib/components/ArtistSearch.svelte';
  import Game from '$lib/components/Game.svelte';

  let showGame = $state(false);
  let selectedArtist = $state(null);

  function handleArtistSelect(event) {
    selectedArtist = event.detail;
    showGame = true;
  }

  function handleNewGame() {
    showGame = false;
    selectedArtist = null;
  }
</script>

<svelte:head>
  <title>Heardle Clone - Guess the Song!</title>
  <meta name="description" content="A Heardle-style game where you guess songs from your favorite artists" />
</svelte:head>

<div class="app">
  {#if !showGame}
    <div class="landing">
      <h1 class="title">🎵 Heardle Clone</h1>
      <p class="subtitle">Pick an artist and try to guess their song!</p>
      <ArtistSearch on:artistSelected={handleArtistSelect} />
    </div>
  {:else}
    <Game artist={selectedArtist} on:newGame={handleNewGame} />
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
</style>
