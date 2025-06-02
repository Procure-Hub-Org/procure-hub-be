const SupabaseBucketService = require('../services/supabaseBucketService');
const LocalUploadService = require('../services/localUploadService');
const supabaseConfig = require('../config/supabase');

const supabaseUrl = supabaseConfig.url;
const supabaseKey = supabaseConfig.secretKey;
const bucketName = supabaseConfig.bucketName;

function getUploadService() {
    if (supabaseUrl && supabaseKey && bucketName) {
        console.log('Using Supabase for file uploads');
        return new SupabaseBucketService();
    }
    console.log('Using Local file upload service');
    return new LocalUploadService();
}

module.exports = getUploadService;