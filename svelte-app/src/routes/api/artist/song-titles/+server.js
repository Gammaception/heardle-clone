import { json, error } from '@sveltejs/kit';
import { getYTMusic } from '$lib/ytmusic.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
  const artistId = /** @type {string} */ (url.searchParams.get('artistId'));

  if (!artistId) {
    return error(400, 'artistId is required');
  }

  try {
    // Reuse the /songs endpoint since it now includes titles
    // This avoids a second call to getArtistSongs()
    const response = await fetch(`${url.origin}/api/artist/songs?artistId=${encodeURIComponent(artistId)}`);
    const data = await response.json();
    
    if (!data.song && !data.titles) {
      return error(404, 'No songs found for this artist');
    }
    
    return json({ titles: data.titles });
  } catch (err) {
    // console.error('Error getting artist song titles:', err);
    error(500, 'Failed to get songs for artist');
  }
}
