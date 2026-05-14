<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { addGameResult } from '$lib/gameHistory.js';

  const dispatch = createEventDispatcher();

  /** @type {{ id: string, name: string, thumbnail: string | null }} */
  const { artist, dailyMode = false } = $props();

  /** @type {{ videoId: string, title: string, artist: string, album: string | null, thumbnail: string | null, duration: number, year: number | null } | null} */
  let song = $state(null);
  let loading = $state(true);
  /** @type {string | null} */
  let error = $state(null);
  /** @type {{ title: string, correct: boolean }[]} */
  let guesses = $state([]);
  let currentGuess = $state('');
  let maxGuesses = 6;

  // Autocomplete state
  /** @type {string[]} */
  let allTitles = $state([]);
  /** @type {string[]} */
  let filteredSuggestions = $state([]);
  let showDropdown = $state(false);
  let selectedSuggestionIndex = $state(0);
  let gameWon = $state(false);
  let gameLost = $state(false);
  let currentSnippet = $state(0);
  let showHint = $state(false);
  let hintText = $state('');
  let hintsEnabled = $state(false);
  let randomStartEnabled = $state(false);
  let randomStartTime = $state(0);
  let savedRandomStartTime = $state(0);

  // Audio playback state
  /** @type {any | null} */
  let player = $state(null);
  let isPlaying = $state(false);
  let elapsedSeconds = $state(0);
  let songDuration = $state(0);
  /** @type {number | null} */
  let snippetTimeout = null;
  /** @type {number | null} */
  let timerInterval = null;
  let apiReady = false;
  /** @type {HTMLDivElement | null} */
  let playerElement = $state(null);

  // Snippet durations in seconds - each guess reveals more
  const snippetDurations = [1, 3, 5, 9, 16, 20];

  function loadYouTubeAPI() {
    return new Promise((/** @type {(value?: any) => void} */ resolve) => {
      /** @type {any} */
      const win = /** @type {any} */ (window);
      if (win.YT) {
        resolve();
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      win.onYouTubeIframeAPIReady = () => {
        apiReady = true;
        resolve();
      };
    });
  }

  onMount(async () => {
    // console.log('Game component mounted, artist prop:', artist);
    await loadYouTubeAPI();
    loadRandomSong();
  });

  onDestroy(() => {
    if (snippetTimeout) clearTimeout(snippetTimeout);
    if (timerInterval) clearInterval(timerInterval);
    if (player) {
      try { player.destroy(); } catch (e) {}
    }
  });

  /** @param {string} videoId */
  function initializePlayer(videoId) {
    if (!playerElement) return;
    
    // Destroy existing player if any
    if (player) {
      try { player.destroy(); } catch (e) {}
      player = null;
    }

    if (snippetTimeout) clearTimeout(snippetTimeout);
    if (timerInterval) clearInterval(timerInterval);
    isPlaying = false;
    elapsedSeconds = 0;

    /** @type {any} */
    const win = /** @type {any} */ (window);
    player = new win.YT.Player(playerElement, {
      height: '240',
      width: '320',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0
      },
      events: {
        onReady: (/** @type {any} */ event) => {
          event.target.setVolume(80);
          // Get actual duration from YouTube player and store it
          const duration = event.target.getDuration();
          songDuration = duration;
          if (randomStartEnabled && duration > 25) {
            const maxStart = duration - 15;
            randomStartTime = Math.floor(Math.random() * maxStart);
          } else {
            randomStartTime = 0;
          }
        }
      }
    });
  }

  function playSnippet() {
    if (!player || gameWon || gameLost) return;

    // Use first snippet duration (3s) before any guesses, then progressive durations after each guess
    const duration = snippetDurations[Math.min(currentSnippet, snippetDurations.length - 1)];

    // Seek to start position (0 or random start time)
    player.seekTo(randomStartTime);
    
    // Start playing
    player.playVideo();
    isPlaying = true;
    elapsedSeconds = 0;

    // Update elapsed time every second
    timerInterval = setInterval(() => {
      if (isPlaying) {
        elapsedSeconds++;
      }
    }, 1000);

    // Auto-pause after snippet duration
    snippetTimeout = setTimeout(() => {
      pauseSnippet();
    }, duration * 1000);
  }

  function pauseSnippet() {
    if (!player) return;
    
    player.pauseVideo();
    isPlaying = false;
    if (snippetTimeout) clearTimeout(snippetTimeout);
    if (timerInterval) clearInterval(timerInterval);
  }

  function togglePlay() {
    if (isPlaying) {
      pauseSnippet();
    } else {
      playSnippet();
    }
  }

  function restartSnippet() {
    if (!player || gameWon || gameLost) return;
    
    pauseSnippet();
    player.seekTo(randomStartTime);
    playSnippet();
  }

  async function loadRandomSong() {
    loading = true;
    error = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Single fetch: /songs now returns both song and titles
        const songResponse = await fetch(`/api/artist/songs?artistId=${encodeURIComponent(artist?.id)}`);
        
        if (!songResponse.ok) throw new Error('Failed to load song');
        
        const songData = await songResponse.json();
        
        song = songData.song;
        allTitles = songData.titles;
        filteredSuggestions = [];
        selectedSuggestionIndex = 0;
        
        // Initialize player after song loads
        setTimeout(() => {
          if (song) {
            initializePlayer(song.videoId);
          }
        }, 300);
        
        // Success - break out of retry loop
        break;
      } catch (err) {
        error = (err instanceof Error) ? err.message : 'Unknown error';
        // If this was the first attempt, clear error and try again
        if (attempt === 1) {
          error = null;
        }
      } finally {
        loading = false;
      }
    }
  }

  function filterSuggestions() {
    const query = currentGuess.trim().toLowerCase();
    if (!query) {
      filteredSuggestions = [];
      showDropdown = false;
      return;
    }
    
    filteredSuggestions = allTitles.filter(title =>
      title.toLowerCase().includes(query)
    ).slice(0, 5);
    
    showDropdown = filteredSuggestions.length > 0;
    selectedSuggestionIndex = 0;
  }

  function handleInput() {
    filterSuggestions();
  }

  /** @param {number} index */
  function selectSuggestion(index) {
    if (index >= 0 && index < filteredSuggestions.length) {
      currentGuess = filteredSuggestions[index];
      showDropdown = false;
    }
  }

  function makeGuess() {
    if (!currentGuess.trim() || gameWon || gameLost) return;

    const guessTitle = currentGuess.trim();
    const guessData = {
      title: guessTitle.toLowerCase(),
      correct: false
    };

    // Check if guess is correct (exact case-insensitive match)
    if (song && song.title.toLowerCase() === guessTitle.toLowerCase()) {
      gameWon = true;
      guessData.correct = true;
      pauseSnippet();
    }

    guesses.push(guessData);
    currentSnippet = guesses.length;

    // Generate hint based on the song title
    if (!gameWon && hintsEnabled) {
      hintText = generateHint();
      showHint = true;
      // Restart snippet with new duration after guess
      restartSnippet();
    }

    // Check if game is lost
    if (guesses.length >= maxGuesses && !gameWon) {
      gameLost = true;
      pauseSnippet();
      // Save game result to history
      saveGameResult(false);
    }
    
    // Save game result when won
    if (gameWon) {
      saveGameResult(true);
    }

    currentGuess = '';
    showDropdown = false;
    filteredSuggestions = [];
  }

  /** @returns {string} */
  function generateHint() {
    if (!song || !songDuration) return '';
    
    const guessCount = guesses.length;
    const hints = [];
    
    // Hint 1 (after 1st wrong guess): Duration from YouTube player - least helpful
    if (guessCount >= 1) {
      const mins = Math.floor(songDuration / 60);
      const secs = Math.floor(songDuration % 60);
      const durationStr = secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`;
      hints.push(`Duration: ${durationStr}`);
    }

    // Hint 2 (after 2rd wrong guess): Release year
    if (guessCount >= 2 && song.year) {
      hints.push(`Released: ${song.year}`);
    }

    // Hint 3 (after 3rd wrong guess): Album name
    if (guessCount >= 3 && song.album) {
      hints.push(`Album: ${song.album}`);
    }

    // Hint 4 (after 4th wrong guess): Number of letters in title
    if (guessCount >= 4) {
      const letterCount = song.title.replace(/[^a-zA-Z0-9]/g, '').length;
      hints.push(`${letterCount} letters`);
    }
      
    // Hint 5 (after 5th wrong guess): First letter of the song
    if (guessCount >= 5) {
      const firstLetter = song.title.charAt(0).toUpperCase();
      hints.push(`Starts with: "${firstLetter}"`);
    }
    
    // Hint 6 (after 6th wrong guess): First 3 letters
    //if (guessCount >= 6) {
    //  const firstFew = song.title.slice(0, 3).toUpperCase();
    //  hints.push(`Starts with: "${firstFew}"`);
    //}
    
    return hints.join(' | ');
  }

  /** @param {KeyboardEvent} e */
  function handleGuessKeydown(e) {
    if (e.key === 'Enter') {
      if (showDropdown && filteredSuggestions.length > 0) {
        // Select the highlighted suggestion
        selectSuggestion(selectedSuggestionIndex);
        makeGuess();
      } else {
        makeGuess();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showDropdown && filteredSuggestions.length > 0) {
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, filteredSuggestions.length - 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showDropdown && filteredSuggestions.length > 0) {
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
      }
    } else if (e.key === 'Escape') {
      showDropdown = false;
    }
  }

  /** @param {boolean} won */
  function saveGameResult(won) {
    if (!song || !artist) return;
    addGameResult({
      artistId: artist.id,
      artistName: artist.name,
      songTitle: song.title,
      won,
      guesses: guesses.length,
      timestamp: Date.now()
    });
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
    hintsEnabled = false;
    randomStartTime = 0;
    savedRandomStartTime = 0;
    songDuration = 0;
    pauseSnippet();
    loadRandomSong();
  }

  function toggleHints() {
    hintsEnabled = !hintsEnabled;
    if (!hintsEnabled) {
      showHint = false;
      hintText = '';
    } else {
      showHint = guesses.length > 0;
      hintText = generateHint();
    }
  }

  function toggleRandomStart() {
    randomStartEnabled = !randomStartEnabled;
    if (!randomStartEnabled) {
      // Save current random position before disabling
      savedRandomStartTime = randomStartTime;
      randomStartTime = 0;
      // If player is running, restart from beginning
      if (player && !gameWon && !gameLost) {
        pauseSnippet();
        player.seekTo(0);
        playSnippet();
      }
    } else {
      // Restore the previously generated random start time (or generate new one if first time)
      if (savedRandomStartTime > 0) {
        randomStartTime = savedRandomStartTime;
      } else if (player) {
        const duration = player.getDuration();
        if (duration > 25) {
          const maxStart = duration - 15;
          randomStartTime = Math.floor(Math.random() * maxStart);
          savedRandomStartTime = randomStartTime;
        } else {
          randomStartTime = 0;
        }
      }
      // Restart from position
      if (player && !gameWon && !gameLost) {
        pauseSnippet();
        player.seekTo(randomStartTime);
        playSnippet();
      }
    }
  }

  /** @param {number} index */
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
      <h2 class="artist-title">
        {artist.name}
        {#if dailyMode}
          <span class="daily-badge">📅 Daily</span>
        {/if}
      </h2>
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
      <p class="snippet-label">Snippet: {snippetDurations[Math.min(currentSnippet, snippetDurations.length - 1)]}s playing</p>
      
      <!-- YouTube Player (hidden) -->
      <div bind:this={playerElement} class="yt-player-container"></div>
      
      {#if song && !gameWon && !gameLost}
        <div class="playback-controls">
          <button onclick={togglePlay} class="play-btn" class:disabled={!player} disabled={!player}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onclick={restartSnippet} class="restart-btn" class:disabled={!player} disabled={!player}>
            ↻ Restart
          </button>
        </div>
      {/if}
    </div>

    {#if showHint && hintsEnabled && !gameWon}
      <div class="hint-box">
        <p class="hint-text">{hintText}</p>
      </div>
    {/if}

    {#if song && !gameWon && !gameLost}
      <div class="hints-toggle">
        <div class="toggle-group">
          <label class="toggle-label">
            <input type="checkbox" checked={hintsEnabled} oninput={toggleHints} />
            <span class="toggle-slider"></span>
            {hintsEnabled ? 'Hints ON' : 'Hints OFF'}
          </label>
          <label class="toggle-label">
            <input type="checkbox" checked={randomStartEnabled} oninput={toggleRandomStart} />
            <span class="toggle-slider"></span>
            {randomStartEnabled ? 'Random Start' : 'Start from Beginning'}
          </label>
        </div>
      </div>
    {/if}

    {#if gameWon}
      <div class="result-box win">
        <h3 class="result-title">🎉 Correct!</h3>
        <p class="song-reveal">The song is "<a href={"https://music.youtube.com/watch?v=" + song.videoId} target="_blank" rel="noopener noreferrer" class="song-link">{song.title}</a>" {#if song.album} from {song.album}{/if}</p>
        <p class="guesses-count">You guessed it in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!</p>
      </div>
    {:else if gameLost}
      <div class="result-box lose">
        <h3 class="result-title">😔 Better luck next time!</h3>
        <p class="song-reveal">The song was "<a href={"https://music.youtube.com/watch?v=" + song.videoId} target="_blank" rel="noopener noreferrer" class="song-link">{song.title}</a>" {#if song.album} from {song.album}{/if}</p>
      </div>
    {:else}
      <div class="guess-input-box">
        <input
          type="text"
          bind:value={currentGuess}
          oninput={handleInput}
          onkeydown={handleGuessKeydown}
          placeholder="Type song title..."
          class="guess-input"
          autocomplete="off"
        />
        <button onclick={makeGuess} class="guess-btn">Guess</button>
        
        {#if showDropdown && filteredSuggestions.length > 0}
          <div class="autocomplete-dropdown">
            {#each filteredSuggestions as title, i (title)}
              <button
                type="button"
                class="suggestion-item"
                class:selected={i === selectedSuggestionIndex}
                onclick={() => selectSuggestion(i)}
              >
                {title}
              </button>
            {/each}
          </div>
        {/if}
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .daily-badge {
    font-size: 0.85rem;
    background: rgba(255, 255, 255, 0.15);
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    white-space: nowrap;
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

  .song-link {
    color: #ffd200;
    text-decoration: underline;
    transition: color 0.2s;
  }

  .song-link:hover {
    color: #f7971e;
  }

  .guesses-count {
    color: rgba(255, 255, 255, 0.7);
  }

  .guess-input-box {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    position: relative;
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

  /* Autocomplete Dropdown */
  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    background: #1e1e2e;
    border: 2px solid rgba(247, 151, 30, 0.4);
    border-radius: 10px;
    overflow: hidden;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .suggestion-item {
    display: block;
    width: 100%;;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: #fff;
    text-align: left;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .suggestion-item:hover {
    background: rgba(247, 151, 30, 0.15);
  }

  .suggestion-item.selected {
    background: rgba(247, 151, 30, 0.25);
    color: #ffd200;
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

  /* YouTube Player - hidden but functional */
  .yt-player-container {
    position: absolute;
    top: -9999px;
    left: -9999px;
    width: 1px;
    height: 1px;
    visibility: hidden;
  }

  /* Playback Controls */
  .playback-controls {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .play-btn, .restart-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .play-btn {
    background: linear-gradient(to right, #f7971e, #ffd200);
    color: #000;
    font-weight: 600;
  }

  .restart-btn {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .play-btn.disabled, .restart-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Hints Toggle */
  .hints-toggle {
    text-align: center;
    margin-bottom: 1rem;
  }

  .toggle-group {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .toggle-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    user-select: none;
  }

  .toggle-label input[type="checkbox"] {
    display: none;
  }

  .toggle-slider {
    width: 40px;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    position: relative;
    transition: background 0.3s;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.3s;
  }

  .toggle-label input:checked + .toggle-slider {
    background: #f7971e;
  }

  .toggle-label input:checked + .toggle-slider::after {
    transform: translateX(20px);
  }
</style>
