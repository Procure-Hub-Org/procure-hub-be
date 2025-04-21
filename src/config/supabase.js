require('dotenv').config();

module.exports = {
    secretKey: process.env.SUPABASE_SECRET_KEY,
    url: process.env.SUPABASE_URL,
    bucketName: process.env.SUPABASE_BUCKET_NAME || 'procurehub-storage',
};