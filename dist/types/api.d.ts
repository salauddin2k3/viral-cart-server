export type ErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'PAYLOAD_TOO_LARGE' | 'UNPROCESSABLE' | 'RATE_LIMITED' | 'INTERNAL';
export declare const HTTP_STATUS_BY_CODE: Record<ErrorCode, number>;
export interface ApiError {
    code: ErrorCode;
    message: string;
}
export interface ErrorEnvelope {
    error: ApiError;
}
export interface CursorQuery {
    limit?: unknown;
    cursor?: unknown;
}
export interface CursorPageMeta {
    nextCursor: string | null;
}
export interface CursorPage<T> {
    items: T[];
    nextCursor: string | null;
}
export declare const MAX_PAGE_LIMIT = 50;
export declare const DEFAULT_PAGE_LIMIT = 20;
export declare class AppError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
export declare function errorEnvelope(code: ErrorCode, message: string): ErrorEnvelope;
export declare function toAppError(err: unknown): AppError;
export declare function clampLimit(raw: unknown): number;
export declare function cursorPage<T>(items: T[], nextCursor: string | null): CursorPage<T>;
//# sourceMappingURL=api.d.ts.map