// const isLocalNetwork = window.location.hostname !== 'localhost' && 
//                        window.location.hostname !== '127.0.0.1';
 
// const config = {
//   // Automatically uses correct API URL based on how website is accessed
//   // - On computer (localhost): uses localhost:5001
//   // - On phone/other device (via IP): uses same IP with port 5001
//   apiUrl: isLocalNetwork 
//     ? `https://eventnet-production.up.railway.app/api`
//     : 'https://eventnet-production.up.railway.app/api',
//   googleMapsApiKey: '',
//   maxImageSize: 5 * 1024 * 1024,
//   defaultMapLocation: {
//     lat: 31.5204, // Lahore, Pakistan
//     lng: 74.3587
//   }
// };
 
// export default config;


const config = {
  apiUrl: 'https://eventnet-production.up.railway.app/api',
  googleMapsApiKey: '',
  maxImageSize: 5 * 1024 * 1024,
  defaultMapLocation: {
    lat: 31.5204,
    lng: 74.3587
  }
};

export default config;