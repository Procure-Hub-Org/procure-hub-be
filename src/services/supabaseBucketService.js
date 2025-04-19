const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

const supabaseUrl = supabaseConfig.url;
const supabaseKey = supabaseConfig.secretKey;
const bucketName = supabaseConfig.bucketName;

const supabase = createClient(supabaseUrl, supabaseKey);


exports.uploadFile = async (fileBuffer, contentType, destinationPath) => {
    const { data, error } = await supabase.storage.from(bucketName)
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

exports.deleteFile = async (filePath) => {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);

    if (error) {
        console.error('Delete error:', error.message);
        return null;
    }

    return true;
}