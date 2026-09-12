import { clampLimit, cursorPage } from '../types/api.js';
export function decodeCursor(raw) {
    if (typeof raw !== 'string' || !raw) {
        return null;
    }
    try {
        const decoded = Buffer.from(raw, 'base64url').toString('utf-8');
        const [direction, value] = decoded.split(':', 2);
        if ((direction !== 'after' && direction !== 'before') || !value) {
            return null;
        }
        return { value, direction };
    }
    catch {
        return null;
    }
}
export function encodeCursor(value, direction) {
    return Buffer.from(`${direction}:${value}`, 'utf-8').toString('base64url');
}
export function parsePaginationParams(query) {
    return {
        limit: clampLimit(query.limit),
        cursor: decodeCursor(query.cursor),
    };
}
export function buildPaginationResult(items, requestedLimit, hasMore, direction = 'after') {
    if (items.length === 0) {
        return cursorPage([], null);
    }
    if (items.length <= requestedLimit) {
        return cursorPage(items, null);
    }
    const trimmed = direction === 'after' ? items.slice(0, requestedLimit) : items.slice(1);
    const lastItem = trimmed[trimmed.length - 1];
    return cursorPage(trimmed, encodeCursor(lastItem.id, 'after'));
}
export function createPaginatedQuery(findManyArgs, take, cursor) {
    const args = { ...findManyArgs };
    if (cursor && cursor.direction === 'after') {
        return { ...args, take: take + 1, skip: 1, cursor: { id: cursor.value } };
    }
    return { ...args, take: take + 1 };
}
//# sourceMappingURL=cursor.js.map