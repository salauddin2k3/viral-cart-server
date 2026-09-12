import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
export class LocalDiskStorage {
    baseDir;
    baseUrl;
    constructor(baseDir, baseUrl) {
        this.baseDir = baseDir;
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    async put(filename, buffer, _contentType) {
        const ext = path.extname(filename).toLowerCase();
        const uniqueName = `${crypto.randomUUID()}${ext}`;
        const relPath = path.join('uploads', uniqueName);
        const absPath = path.join(this.baseDir, relPath);
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, buffer);
        return relPath;
    }
    async get(publicPath) {
        const absPath = path.join(this.baseDir, publicPath);
        return fs.readFile(absPath);
    }
    async delete(publicPath) {
        const absPath = path.join(this.baseDir, publicPath);
        await fs.unlink(absPath).catch(() => undefined);
    }
    publicUrl(internalPath) {
        return `${this.baseUrl}/${internalPath.replace(/\\/g, '/')}`;
    }
}
let _storage = null;
export function getStorage() {
    if (!_storage) {
        const dir = process.env.STORAGE_DIR ?? path.join(process.cwd(), 'storage');
        const baseUrl = process.env.STORAGE_BASE_URL ?? 'http://localhost:5000/storage';
        _storage = new LocalDiskStorage(dir, baseUrl);
    }
    return _storage;
}
export function setStorage(adapter) {
    _storage = adapter;
}
//# sourceMappingURL=storage.js.map