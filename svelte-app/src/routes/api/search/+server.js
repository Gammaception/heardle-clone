import { json, error } from '@sveltejs/kit';
import { getYTMusic } from '$lib/ytmusic.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
  const query = /** @type {string} */ (url.searchParams.get('q'));

  if (!query || query.length < 2) {
    return json({ results: [] });
  }

  try {
    const ytmusic = await getYTMusic();
    const results = await ytmusic.search(query);
    
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/);
    
    /** @type {Map<string, any>} */
    const artistMap = new Map();
    
    // Extract artists from SONG and ALBUM results (API often returns no ARTIST type)
    for (const result of results) {
      /** @type {any} */
      const item = result;
      
      let artistId = null;
      let artistName = null;
      let thumbnail = null;
      
      if (item.type === 'ARTIST') {
        artistId = item.artistId;
        artistName = item.name;
        thumbnail = item.thumbnails?.[0]?.url || null;
      } else if (item.type === 'SONG' || item.type === 'ALBUM') {
        // Extract artist info from song/album results
        if (item.artist && item.artist.artistId) {
          artistId = item.artist.artistId;
          artistName = item.artist.name;
        }
        thumbnail = item.thumbnails?.[0]?.url || null;
      }
      
      if (!artistId || !artistName) continue;
      
      const nameLower = artistName.toLowerCase();
      
      // Check all query words are present in the artist name
      const allWordsMatch = queryWords.every(word => nameLower.includes(word));
      if (!allWordsMatch) continue;
      
      let score = 0;
      
      // Base score: words matched
      score += queryWords.length * 10;
      
      // Bonus: exact phrase match
      if (nameLower.includes(queryLower)) score += 50;
      
      // Bonus: name starts with query phrase
      if (nameLower.startsWith(queryLower)) score += 30;
      
      // Bonus: words appear in order
      if (queryWords.length > 1) {
        let lastIndex = -1;
        let inOrder = true;
        for (const word of queryWords) {
          const idx = nameLower.indexOf(word, lastIndex + 1);
          if (idx === -1 || idx <= lastIndex) { inOrder = false; break; }
          lastIndex = idx;
        }
        if (inOrder) score += 20;
      }
      
      // Penalty: longer names are less precise
      score -= artistName.length * 0.5;
      
      // Keep highest scoring entry per artist
      if (artistMap.has(artistId)) {
        if (score > (artistMap.get(artistId)?.score ?? 0)) {
          artistMap.set(artistId, { id: artistId, name: artistName, thumbnail, score });
        }
      } else {
        artistMap.set(artistId, { id: artistId, name: artistName, thumbnail, score });
      }
    }
    
    // Sort by score descending and format output
    const uniqueArtists = [...artistMap.values()]
      .sort((a, b) => b.score - a.score)
      .map(({ id, name, thumbnail }) => ({ id, name, thumbnail }));
    
    return json({ results: uniqueArtists });
  } catch (err) {
    // console.error('Error searching for artists:', err);
    error(500, 'Failed to search for artists');
  }
}
