<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let query = $state('');
  let urlInput = $state('');
  let results = $state([]);
  let loading = $state(false);
  let searching = $state(false);
  let useUrlMode = $state(false);

  /**
   * Extract artist ID from a YouTube Music URL
   * Supports formats like:
   * - https://music.youtube.com/channel/UCxxxxxxxxxx
   * - https://music.youtube.com/browse/FExxxxxxxxxx
   */
  function extractArtistId(url) {
    try {
      const urlObj = new URL(url.trim());
      if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
        return null;
      }

      const path = urlObj.pathname;
      
      // Match /channel/ or /browse/ patterns
      const channelMatch = path.match(/^\/channel\/([A-Za-z0-9_-]+)/);
      if (channelMatch) return channelMatch[1];

      const browseMatch = path.match(/^\/browse\/([A-Za-z0-9_-]+)/);
      if (browseMatch) return browseMatch[1];

      return null;
    } catch {
      return null;
    }
  }

  async function search() {
    if (query.length < 2) return;
    
    loading = true;
    searching = true;
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      results = data.results;
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      loading = false;
    }
  }

  async function submitUrl() {
    if (!urlInput.trim()) return;

    const artistId = extractArtistId(urlInput);
    if (!artistId) {
      alert('Invalid YouTube Music URL. Please enter a valid artist URL.');
      return;
    }

    // Fetch artist name using the API
    loading = true;
    try {
      const response = await fetch(`/api/artist/from-url?artistId=${encodeURIComponent(artistId)}`);
      if (!response.ok) {
        alert('Could not find artist at this URL.');
        return;
      }
      const data = await response.json();
      dispatch('artistSelected', data.artist);
    } catch (err) {
      console.error('Failed to fetch artist:', err);
      alert('Failed to fetch artist information.');
    } finally {
      loading = false;
    }
  }

  function selectArtist(artist) {
    dispatch('artistSelected', artist);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      search();
    }
  }

  function handleUrlKeydown(e) {
    if (e.key === 'Enter') {
      submitUrl();
    }
  }

  function toggleMode() {
    useUrlMode = !useUrlMode;
    results = [];
    searching = false;
  }
</script>

<div class="search-container">
  <div class="mode-toggle">
    <button class:active={!useUrlMode} onclick={toggleMode}>Search</button>
    <button class:active={useUrlMode} onclick={toggleMode}>Use URL</button>
  </div>

  {#if !useUrlMode}
    <div class="search-box">
      <input
        type="text"
        bind:value={query}
        onkeydown={handleKeydown}
        placeholder="Search for an artist..."
        class="search-input"
      />
      <button onclick={search} class="search-btn" disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
    </div>

    {#if searching && results.length > 0}
      <div class="results" role="listbox" aria-label="Artist results">
        {#each results as artist (artist.id)}
          <div class="artist-item" onclick={() => selectArtist(artist)} role="option">
            {#if artist.thumbnail}
              <img src={artist.thumbnail} alt={artist.name} class="artist-thumb" />
            {/if}
            <span class="artist-name">{artist.name}</span>
          </div>
        {/each}
      </div>
    {:else if searching && loading}
      <div class="loading">Searching...</div>
    {:else if searching && results.length === 0 && !loading}
      <div class="no-results">No artists found. Try a different search.</div>
    {/if}
  {:else}
    <div class="url-box">
      <input
        type="text"
        bind:value={urlInput}
        onkeydown={handleUrlKeydown}
        placeholder="Paste YouTube Music artist URL..."
        class="url-input"
      />
      <button onclick={submitUrl} class="url-btn" disabled={loading}>
        {loading ? 'Loading...' : 'Go'}
      </button>
    </div>
    <p class="url-hint">Example: https://music.youtube.com/channel/UCxxxxxxxxxx</p>
  {/if}
</div>

<style>
  .search-container {
    width: 100%;
    max-width: 500px;
  }

  .mode-toggle {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .mode-toggle button {
    flex: 1;
    padding: 0.5rem;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-toggle button.active {
    border-color: #f7971e;
    background: rgba(247, 151, 30, 0.15);
    color: #fff;
  }

  .search-box, .url-box {
    display: flex;
    gap: 0.5rem;
  }

  .search-input, .url-input {
    flex: 1;
    padding: 0.875rem 1rem;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus, .url-input:focus {
    border-color: #f7971e;
  }

  .search-input::placeholder, .url-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .search-btn, .url-btn {
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 12px;
    background: linear-gradient(to right, #f7971e, #ffd200);
    color: #000;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
  }

  .search-btn:hover:not(:disabled), .url-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .search-btn:disabled, .url-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .url-hint {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    text-align: center;
  }

  .results {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .artist-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s, transform 0.2s;
  }

  .artist-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  .artist-thumb {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }

  .artist-name {
    font-size: 1rem;
    font-weight: 500;
  }

  .loading, .no-results {
    margin-top: 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 1rem;
  }
</style>
