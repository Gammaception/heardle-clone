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
    const artist = await ytmusic.getArtist(artistId);
    
    return json({
      artist: {
        id: artist.artistId,
        name: artist.name,
        thumbnail: artist.thumbnails[0]?.url || null
      }
    });
  } catch (err) {
    console.error('Error fetching artist:', err);
    error(500, 'Failed to fetch artist information');
  }
}
