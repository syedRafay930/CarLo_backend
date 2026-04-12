/**
 * Seed uploads: same Cloudinary account as Nest (CLOUDINARY_* in .env).
 * App runtime uses upload_stream via cloudinary.helper.ts; scripts use uploader.upload(URL).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

// Public direct image URLs (Pexels — verified HTTP 200 for fetch/upload)
const vehicles = [
  { name: 'toyota-corolla', url: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg' },
  { name: 'honda-civic', url: 'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg' },
  { name: 'suzuki-cultus', url: 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg' },
  { name: 'toyota-fortuner', url: 'https://images.pexels.com/photos/1638459/pexels-photo-1638459.jpeg' },
  { name: 'honda-brv', url: 'https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg' },
  { name: 'toyota-hiace', url: 'https://images.pexels.com/photos/3876399/pexels-photo-3876399.jpeg' },
  { name: 'suzuki-alto', url: 'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg' },
  { name: 'kia-sportage', url: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg' },
];

async function uploadAll() {
  const results = {};
  for (const v of vehicles) {
    const result = await cloudinary.uploader.upload(v.url, {
      folder: 'carlo/vehicles',
      public_id: `seed-${v.name}`,
      overwrite: true,
    });
    results[v.name] = result.secure_url;
    console.log(`✅ ${v.name}: ${result.secure_url}`);
  }
  console.log('\n=== FINAL URLS (paste into seed SQL) ===');
  console.log(JSON.stringify(results, null, 2));
}

uploadAll().catch(console.error);
