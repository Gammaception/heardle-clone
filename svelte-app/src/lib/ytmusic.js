import YTMusic from 'ytmusic-api';

/**
 * Creates and initializes a YTMusic instance.
 * Must be called before using the API to fetch required cookies.
 */
async function getYTMusic() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  return ytmusic;
}

export { getYTMusic };
