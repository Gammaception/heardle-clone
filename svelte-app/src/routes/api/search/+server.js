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
    
    // Filter for artists only
    const artists = results
      .filter(r => r.type === 'ARTIST')
      .map(artist => ({
        id: artist.artistId,
        name: artist.name,
        thumbnail: artist.thumbnails[0]?.url || null
      }));
    
    return json({ results: artists });
  } catch (err) {
    // console.error('Error searching for artists:', err);
    error(500, 'Failed to search for artists');
  }
}
