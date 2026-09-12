export interface StorageAdapter {
    put(filename: string, buffer: Buffer, contentType: string): Promise<string>;
    get(publicPath: string): Promise<Buffer>;
    delete(publicPath: string): Promise<void>;
    publicUrl(internalPath: string): string;
}
export declare class LocalDiskStorage implements StorageAdapter {
    private readonly baseDir;
    private readonly baseUrl;
    constructor(baseDir: string, baseUrl: string);
    put(filename: string, buffer: Buffer, _contentType: string): Promise<string>;
    get(publicPath: string): Promise<Buffer>;
    delete(publicPath: string): Promise<void>;
    publicUrl(internalPath: string): string;
}
export declare function getStorage(): StorageAdapter;
export declare function setStorage(adapter: StorageAdapter): void;
//# sourceMappingURL=storage.d.ts.map