<script>
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  /** @type {{ id: string, name: string, thumbnail: string | null }} */
  const { artist } = $props();

  let song = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let guesses = $state([]);
  let currentGuess = $state('');
  let maxGuesses = 6;
  let gameWon = $state(false);
  let gameLost = $state(false);
  let currentSnippet = $state(0);
  let showHint = $state(false);
  let hintText = $state('');

  // Snippet durations in seconds - each guess reveals more
  const snippetDurations = [3, 5, 8, 12, 18, 30];

  onMount(() => {
    console.log('Game component mounted, artist prop:', artist);
    loadRandomSong();
  });

  async function loadRandomSong() {
    loading = true;
    error = null;
    
    console.log('loadRandomSong called, artist.id:', artist?.id);
    try {
      const response = await fetch(`/api/artist/songs?artistId=${encodeURIComponent(artist?.id)}`);
      if (!response.ok) throw new Error('Failed to load song');
      
      const data = await response.json();
      song = data.song;
    } catch (err) {
      error = err.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function makeGuess() {
    if (!currentGuess.trim() || gameWon || gameLost) return;

    const guessData = {
      title: currentGuess.trim().toLowerCase(),
      correct: false
    };

    // Check if guess is correct (case insensitive partial match)
    if (song.title.toLowerCase().includes(guessData.title)) {
      gameWon = true;
      guessData.correct = true;
    }

    guesses.push(guessData);
    currentSnippet = guesses.length;

    // Generate hint based on the song title
    if (!gameWon) {
      hintText = generateHint();
      showHint = true;
    }

    // Check if game is lost
    if (guesses.length >= maxGuesses && !gameWon) {
      gameLost = true;
    }

    currentGuess = '';
  }

  function generateHint() {
    if (!song) return '';
    
    const title = song.title;
    const revealedLetters = Math.min(3 + guesses.length, title.length);
    const hintTitle = title.slice(0, revealedLetters) + '_'.repeat(Math.max(0, title.length - revealedLetters));
    
    let hint = `Song starts with: "${hintTitle}"`;
    
    if (guesses.length >= 3) {
      hint += ` | Album: ${song.album || 'Unknown'}`;
    }
    
    return hint;
  }

  function handleGuessKeydown(e) {
    if (e.key === 'Enter') {
      makeGuess();
    }
  }

  function newGame() {
    dispatch('newGame');
  }

  function resetGame() {
    song = null;
    guesses = [];
    currentGuess = '';
    gameWon = false;
    gameLost = false;
    currentSnippet = 0;
    showHint = false;
    hintText = '';
    loadRandomSong();
  }

  function getGuessStatus(index) {
    if (index < guesses.length) {
      return guesses[index].correct ? 'correct' : 'wrong';
    }
    return 'pending';
  }
</script>

<div class="game-container">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading a song by {artist.name}...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error-text">{error}</p>
      <button onclick={resetGame} class="retry-btn">Try Again</button>
      <button onclick={newGame} class="back-btn">Choose Another Artist</button>
    </div>
  {:else if song}
    <div class="game-header">
      <h2 class="artist-title">{artist.name}</h2>
      <p class="game-instruction">Can you guess the song?</p>
    </div>

    <div class="snippet-player">
      <div class="progress-indicator">
        {#each Array(maxGuesses) as _, index}
          <div class="progress-dot" class:active={currentSnippet > index} 
               class:correct={getGuessStatus(index) === 'correct'}
               class:wrong={getGuessStatus(index) === 'wrong'}>
            {index + 1}
          </div>
        {/each}
      </div>
      <p class="snippet-label">Snippet: {currentSnippet > 0 ? snippetDurations[currentSnippet - 1] : 0}s playing</p>
    </div>

    {#if showHint && !gameWon}
      <div class="hint-box">
        <p class="hint-text">{hintText}</p>
      </div>
    {/if}

    {#if gameWon}
      <div class="result-box win">
        <h3 class="result-title">🎉 Correct!</h3>
        <p class="song-reveal">The song is "{song.title}"{#if song.album} from {song.album}{/if}</p>
        <p class="guesses-count">You guessed it in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!</p>
      </div>
    {:else if gameLost}
      <div class="result-box lose">
        <h3 class="result-title">😔 Better luck next time!</h3>
        <p class="song-reveal">The song was "{song.title}"{#if song.album} from {song.album}{/if}</p>
      </div>
    {:else}
      <div class="guess-input-box">
        <input
          type="text"
          bind:value={currentGuess}
          onkeydown={handleGuessKeydown}
          placeholder="Enter song title..."
          class="guess-input"
        />
        <button onclick={makeGuess} class="guess-btn">Guess</button>
      </div>

      {#if guesses.length > 0}
        <div class="guesses-history">
          <h4 class="history-title">Your Guesses:</h4>
          {#each guesses as guess, i (guess.title + i)}
            <div class="guess-item" class:correct={guess.correct}>
              <span class="guess-number">{i + 1}.</span>
              <span class="guess-text">{guess.title}</span>
              {#if guess.correct}
                <span class="correct-mark">✓</span>
              {:else}
                <span class="wrong-mark">✗</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <div class="game-actions">
      {#if gameWon || gameLost}
        <button onclick={resetGame} class="play-again-btn">Play Again</button>
      {/if}
      <button onclick={newGame} class="new-artist-btn">New Artist</button>
    </div>
  {/if}
</div>

<style>
  .game-container {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }

  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: #f7971e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-text {
    color: #ff6b6b;
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .retry-btn, .back-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
    margin: 0.25rem;
  }

  .retry-btn {
    background: linear-gradient(to right, #f7971e, #ffd200);
    color: #000;
    font-weight: 600;
  }

  .back-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .game-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .artist-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .game-instruction {
    color: rgba(255, 255, 255, 0.6);
  }

  .snippet-player {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .progress-indicator {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .progress-dot {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.3s;
  }

  .progress-dot.active {
    background: rgba(247, 151, 30, 0.3);
    border: 2px solid #f7971e;
  }

  .progress-dot.correct {
    background: #4caf50;
    border-color: #4caf50;
  }

  .progress-dot.wrong {
    background: #ff6b6b;
    border-color: #ff6b6b;
  }

  .snippet-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .hint-box {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(247, 151, 30, 0.3);
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .hint-text {
    color: #ffd200;
    font-size: 0.95rem;
  }

  .result-box {
    text-align: center;
    padding: 2rem;
    border-radius: 15px;
    margin-bottom: 1.5rem;
  }

  .result-box.win {
    background: rgba(76, 175, 80, 0.2);
    border: 2px solid #4caf50;
  }

  .result-box.lose {
    background: rgba(255, 107, 107, 0.2);
    border: 2px solid #ff6b6b;
  }

  .result-title {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .song-reveal {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .guesses-count {
    color: rgba(255, 255, 255, 0.7);
  }

  .guess-input-box {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .guess-input {
    flex: 1;
    padding: 0.875rem 1rem;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    font-size: 1rem;
    outline: none;
  }

  .guess-input:focus {
    border-color: #f7971e;
  }

  .guess-btn {
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 12px;
    background: linear-gradient(to right, #f7971e, #ffd200);
    color: #000;
    font-weight: 600;
    cursor: pointer;
  }

  .guesses-history {
    margin-bottom: 1.5rem;
  }

  .history-title {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.5rem;
  }

  .guess-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    margin-bottom: 0.25rem;
  }

  .guess-item.correct {
    background: rgba(76, 175, 80, 0.15);
  }

  .guess-number {
    font-weight: 600;
    min-width: 20px;
  }

  .guess-text {
    flex: 1;
  }

  .correct-mark {
    color: #4caf50;
  }

  .wrong-mark {
    color: #ff6b6b;
  }

  .game-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .play-again-btn, .new-artist-btn {
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 10px;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .play-again-btn {
    background: linear-gradient(to right, #f7971e, #ffd200);
    color: #000;
    font-weight: 600;
  }

  .new-artist-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
</style>
