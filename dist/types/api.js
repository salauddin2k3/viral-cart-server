export const HTTP_STATUS_BY_CODE = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE: 422,
    RATE_LIMITED: 429,
    INTERNAL: 500,
};
export const MAX_PAGE_LIMIT = 50;
export const DEFAULT_PAGE_LIMIT = 20;
export class AppError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export function errorEnvelope(code, message) {
    return { error: { code, message } };
}
export function toAppError(err) {
    if (err instanceof AppError) {
        return err;
    }
    if (err instanceof Error && err.name === 'ZodError') {
        return new AppError('BAD_REQUEST', 'Validation failed');
    }
    if (err instanceof Error && err.name === 'SyntaxError' && 'body' in err) {
        return new AppError('BAD_REQUEST', 'Malformed request body');
    }
    if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('Unique constraint') || msg.includes('unique constraint')) {
            return new AppError('CONFLICT', 'Resource already exists');
        }
        if (msg.includes('Record to update not found') || msg.includes('Record to connect does not exist')) {
            return new AppError('NOT_FOUND', 'Resource not found');
        }
        if (msg.includes('Foreign key constraint') || msg.includes('foreign key constraint')) {
            return new AppError('BAD_REQUEST', 'Related resource not found');
        }
    }
    return new AppError('INTERNAL', 'An unexpected error occurred');
}
export function clampLimit(raw) {
    if (typeof raw !== 'number' && typeof raw !== 'string') {
        return DEFAULT_PAGE_LIMIT;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_PAGE_LIMIT;
    }
    return Math.min(Math.floor(parsed), MAX_PAGE_LIMIT);
}
export function cursorPage(items, nextCursor) {
    return { items, nextCursor };
}
//# sourceMappingURL=api.js.map