import { clampLimit, CursorPage, cursorPage, MAX_PAGE_LIMIT } from '../types/api';

export interface CursorPaginationParams {
  limit?: unknown;
  cursor?: unknown;
}

export interface DecodedCursor {
  value: string;
  direction: 'after' | 'before';
}

export function decodeCursor(raw: unknown): DecodedCursor | null {
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
  } catch {
    return null;
  }
}

export function encodeCursor(value: string, direction: 'after' | 'before'): string {
  return Buffer.from(`${direction}:${value}`, 'utf-8').toString('base64url');
}

export function parsePaginationParams(query: CursorPaginationParams): {
  limit: number;
  cursor: DecodedCursor | null;
} {
  return {
    limit: clampLimit(query.limit),
    cursor: decodeCursor(query.cursor),
  };
}

export function buildPaginationResult<T extends { id: string }>(
  items: T[],
  requestedLimit: number,
  hasMore: boolean,
  direction: 'after' | 'before' = 'after',
): CursorPage<T> {
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

export function createPaginatedQuery<T>(
  findManyArgs: T,
  take: number,
  cursor: DecodedCursor | null,
): T & { take: number; skip?: number; cursor?: { id: string } } {
  const args = { ...findManyArgs } as Record<string, unknown>;
  if (cursor && cursor.direction === 'after') {
    return { ...args, take: take + 1, skip: 1, cursor: { id: cursor.value } } as T & {
      take: number;
      skip?: number;
      cursor?: { id: string };
    };
  }
  return { ...args, take: take + 1 } as T & {
    take: number;
    skip?: number;
    cursor?: { id: string };
  };
}
