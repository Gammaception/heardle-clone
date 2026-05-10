import YTMusic from 'ytmusic-api';

/** @type {YTMusic | null} */
let cachedInstance = null;

/**
 * Returns a cached YTMusic instance, initializing it only once.
 * This avoids repeated HTTP calls to fetch cookies on every request.
 */
async function getYTMusic() {
  if (!cachedInstance) {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    cachedInstance = ytmusic;
  }
  return cachedInstance;
}

export { getYTMusic };
