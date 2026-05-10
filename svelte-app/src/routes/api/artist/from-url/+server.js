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
    
    // console.log('getArtist returned:', JSON.stringify(artist, null, 2));
    
    /* Fallback: if artistId is missing from the response, use the original ID
     * This can happen if the API returns unexpected structure */
    const resolvedId = artist.artistId || artistId;
    
    return json({
      artist: {
        id: resolvedId,
        name: artist.name || 'Unknown Artist',
        thumbnail: artist.thumbnails?.[0]?.url || null
      }
    });
  } catch (err) {
    // console.error('Error fetching artist:', err);
    error(500, 'Failed to fetch artist information');
  }
}
