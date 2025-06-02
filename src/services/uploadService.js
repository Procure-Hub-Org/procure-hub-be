class UploadService {
  async uploadFile(fileBuffer, contentType, destinationPath) {
    throw new Error("upload() not implemented");
  }

  async deleteFile(filePath) {
    throw new Error("delete() not implemented");
  }

  async getFileUrl(filePath, expiresIn = 86400) {
    throw new Error("getFileUrl() not implemented");
  }
}
module.exports = UploadService;