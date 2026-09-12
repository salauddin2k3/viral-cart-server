import { CursorPage } from '../types/api.js';
export interface CursorPaginationParams {
    limit?: unknown;
    cursor?: unknown;
}
export interface DecodedCursor {
    value: string;
    direction: 'after' | 'before';
}
export declare function decodeCursor(raw: unknown): DecodedCursor | null;
export declare function encodeCursor(value: string, direction: 'after' | 'before'): string;
export declare function parsePaginationParams(query: CursorPaginationParams): {
    limit: number;
    cursor: DecodedCursor | null;
};
export declare function buildPaginationResult<T extends {
    id: string;
}>(items: T[], requestedLimit: number, hasMore: boolean, direction?: 'after' | 'before'): CursorPage<T>;
export declare function createPaginatedQuery<T>(findManyArgs: T, take: number, cursor: DecodedCursor | null): T & {
    take: number;
    skip?: number;
    cursor?: {
        id: string;
    };
};
//# sourceMappingURL=cursor.d.ts.map