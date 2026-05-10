import { json, error } from '@sveltejs/kit';
import { getYTMusic } from '$lib/ytmusic.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
  const artistId = /** @type {string} */ (url.searchParams.get('artistId'));

  if (!artistId) {
    return error(400, 'artistId is required');
  }

  try {
    const ytmusic = await getYTMusic();
    const songs = await ytmusic.getArtistSongs(artistId);
    
    if (songs.length === 0) {
      return error(404, 'No songs found for this artist');
    }
    
    // Return all unique song titles for autocomplete
    const titles = [...new Set(songs.map(s => s.name))];
    
    return json({ titles });
  } catch (err) {
    // console.error('Error getting artist song titles:', err);
    error(500, 'Failed to get songs for artist');
  }
}
