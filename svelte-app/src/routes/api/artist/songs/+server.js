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
    
    // Get release year from album if available
    let year = null;
    if (selectedSong.album?.albumId) {
      try {
        const albumData = /** @type {any} */ (await ytmusic.getAlbum(selectedSong.album.albumId));
        year = albumData.year || null;
      } catch {
        // Album fetch failed, year will remain null
      }
    }
    
    // Return both the selected song and all unique titles in one response
    const titles = [...new Set(songs.map(s => s.name))];
    
    return json(
      {
        song: {
          videoId: selectedSong.videoId,
          title: selectedSong.name,
          artist: selectedSong.artist.name,
          album: selectedSong.album?.name || null,
          thumbnail: selectedSong.thumbnails[0]?.url || null,
          duration: selectedSong.duration,
          year
        },
        titles
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    // console.error('Error getting artist songs:', err);
    error(500, 'Failed to get songs for artist');
  }
}
