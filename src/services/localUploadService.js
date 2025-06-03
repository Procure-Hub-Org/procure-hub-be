const fs = require('fs');
const path = require('path');
const uploadService = require('./uploadService');

const getBaseUrl = () => {
    return process.env.FILE_BASE_URL || `http://localhost:3000`;
};

class LocalUploadService extends uploadService {
    constructor() {
        super();
        this.uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(fileBuffer, contentType, destinationPath) {
        const fullPath = path.join(this.uploadDir, destinationPath);

        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        try {
            fs.writeFileSync(fullPath, fileBuffer);
            return {
                path: destinationPath,
            };
        } catch (err) {
            console.error('Local upload error:', err.message);
            return null;
        }
    }

    async deleteFile(filePath) {
        const fullPath = path.join(this.uploadDir, filePath);
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                return true;
            } else {
                console.warn('File not found:', fullPath);
                return false;
            }
        } catch (err) {
            console.error('Local delete error:', err.message);
            return null;
        }
    }

    async getFileUrl(filePath, expiresIn = 86400) {
        return `${getBaseUrl()}/uploads/${filePath}`;
    }
}

module.exports = LocalUploadService;