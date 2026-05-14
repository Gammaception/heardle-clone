import { json, error } from '@sveltejs/kit';
import { getYTMusic } from '$lib/ytmusic.js';

/**
 * Get today's date as a string for consistent daily seeding.
 * Uses UTC to ensure consistency across timezones.
 */
function getTodayDate() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Fetch and parse the Billboard Hot 100 chart.
 * Extracts artist names from the HTML using the pattern:
 * <a href="https://www.billboard.com/artist/[artist-name]/">Artist Name</a>
 * @returns {Promise<string[]>} Array of unique artist names
 */
async function getBillboardArtists() {
  try {
    const response = await fetch('https://www.billboard.com/charts/hot-100/');
    if (!response.ok) {
      throw new Error(`Failed to fetch Billboard: ${response.status}`);
    }

    const html = await response.text();
    
    // Regex pattern to match artist links
    // Pattern: <a href="https://www.billboard.com/artist/[slug]/">Artist Name</a>
    const artistPattern = /<a href="https:\/\/www\.billboard\.com\/artist\/[^"]+">([^<]+)<\/a>/g;
    
    const artists = [];
    let match;
    
    while ((match = artistPattern.exec(html)) !== null) {
      const artistName = match[1].trim();
      if (artistName) {
        artists.push(artistName);
      }
    }
    
    return artists;
  } catch (err) {
    console.error('Error fetching Billboard Hot 100:', err);
    throw err;
  }
}

/**
 * Search for a YouTube Music artist by name and return their info.
 * @param {any} ytmusic
 * @param {string} artistName
 * @returns {Promise<object | null>}
 */
async function findArtistOnYTMusic(ytmusic, artistName) {
  try {
    const results = await ytmusic.searchArtists(artistName);
    if (results && results.length > 0) {
      const artist = results[0];
      return {
        id: artist.channelId || artist.artistId,
        name: artist.name,
        thumbnail: artist.thumbnails?.[0]?.url || null
      };
    }
    return null;
  } catch (err) {
    console.error(`Failed to search artist "${artistName}":`, err);
    return null;
  }
}

/** @type {import('./$types').RequestHandler} */
export async function GET() {
  try {
    // Step 1: Get artists from Billboard Hot 100
    console.log('Fetching Billboard Hot 100...');
    const allArtists = await getBillboardArtists();
    console.log('Found', allArtists.length, 'artist mentions from Billboard');

    if (allArtists.length === 0) {
      return error(503, 'Unable to extract artists from Billboard chart');
    }

    // Step 2: Get unique artists (case-insensitive)
    const uniqueArtists = [];
    const seen = new Set();

    for (const artist of allArtists) {
      const key = artist.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueArtists.push(artist);
      }
    }

    console.log('Extracted', uniqueArtists.length, 'unique artists from Billboard');

    // Step 3: Use today's date as a seed for consistent daily selection
    const today = getTodayDate();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      const char = today.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Pick a consistent artist name from Billboard for today
    const selectedIndex = Math.abs(hash) % uniqueArtists.length;
    const selectedArtistName = uniqueArtists[selectedIndex];
    console.log('Selected artist for', today, ':', selectedArtistName);

    // Step 4: Search for the selected artist on YouTube Music
    const ytmusic = await getYTMusic();
    const ytArtist = await findArtistOnYTMusic(ytmusic, selectedArtistName);

    if (!ytArtist) {
      return error(503, `Could not find "${selectedArtistName}" on YouTube Music`);
    }

    /** @type {any} */
    const ytData = ytArtist;
    console.log('Found on YouTube Music:', ytData.name, ytData.id);

    return json(
      {
        date: today,
        billboardArtist: selectedArtistName,
        artist: ytArtist
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=43200' // Cache for 12 hours
        }
      }
    );
  } catch (err) {
    console.error('Error fetching daily artist:', err);
    error(500, 'Failed to fetch daily artist');
  }
}
