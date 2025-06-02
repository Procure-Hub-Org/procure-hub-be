require('dotenv').config();

module.exports = {
    secretKey: process.env.SUPABASE_SECRET_KEY || null,
    url: process.env.SUPABASE_URL || null,
    bucketName: process.env.SUPABASE_BUCKET_NAME || 'procurehub-storage',
};