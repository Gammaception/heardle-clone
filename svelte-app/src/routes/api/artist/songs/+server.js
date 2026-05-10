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
    
    // Pick a random song
    const randomIndex = Math.floor(Math.random() * songs.length);
    const selectedSong = songs[randomIndex];
    
    return json({
      song: {
        videoId: selectedSong.videoId,
        title: selectedSong.name,
        artist: selectedSong.artist.name,
        album: selectedSong.album?.name || null,
        thumbnail: selectedSong.thumbnails[0]?.url || null,
        duration: selectedSong.duration
      }
    });
  } catch (err) {
    console.error('Error getting artist songs:', err);
    error(500, 'Failed to get songs for artist');
  }
}
