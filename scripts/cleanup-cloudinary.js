require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

async function cleanup() {
  const result = await cloudinary.api.delete_resources_by_prefix('carlo/');
  console.log('Deleted:', result);
}

cleanup().catch(console.error);
