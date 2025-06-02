const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const uploadService = require('./uploadService');

const {redisClient, redisConnected} = require('../services/redisService')

const supabaseUrl = supabaseConfig.url;
const supabaseKey = supabaseConfig.secretKey;
const bucketName = supabaseConfig.bucketName;

class SupabaseBucketService extends uploadService {
    constructor() {
        super();
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async uploadFile(fileBuffer, contentType, destinationPath) {
        const { data, error } = await this.supabase.storage.from(bucketName)
        .upload(destinationPath, fileBuffer, {
            contentType: contentType,
            upsert: true, // TODO: change this later to upload to a new path (400 Asset Already Exists)
        });

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        return {
            path: destinationPath
        };
    }

    async deleteFile(filePath) {
        const { error } = await this.supabase.storage.from(bucketName).remove([filePath]);

        if (error) {
            console.error('Delete error:', error.message);
            return null;
        }

        return true;
    }

    async getFileUrl(filePath, expiresIn = 86400) {
        const cacheKey = `signedurl:${filePath}`;
        if (redisConnected()) {
            const cachedUrl = await redisClient().get(cacheKey);
            if (cachedUrl) {
                console.log('Cache hit for signed URL:', cachedUrl);
                return cachedUrl;
            }
            console.log('Cache miss for signed URL, generating new one...');
        }
        const { data, error } = await this.supabase.storage.from(bucketName)
        .createSignedUrl(filePath, expiresIn);

        if (error) {
            console.error('Error generating signed URL:', error.message);
            return null;
        }

        const signedUrl = data.signedUrl;

        if (redisConnected()) {
            await redisClient().set(cacheKey, signedUrl, { EX: expiresIn });
        }

        return signedUrl;
    }
}

module.exports = SupabaseBucketService;