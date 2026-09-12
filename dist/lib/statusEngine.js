import { AppError } from '../types/api.js';
const VALID_STATUSES = [
    'New', 'Pending', 'Connected', 'NotConnected', 'Confirmed',
    'CourierSubmitted', 'InProgress', 'Delivered', 'Cancelled', 'Returned',
];
const TERMINAL_STATUSES = ['Delivered', 'Cancelled', 'Returned'];
const TRANSITION_MATRIX = {
    New: ['Pending', 'Connected', 'NotConnected', 'Confirmed', 'Cancelled'],
    Pending: ['Connected', 'NotConnected', 'Confirmed', 'Cancelled'],
    Connected: ['NotConnected', 'Confirmed', 'Cancelled'],
    NotConnected: ['Pending', 'Connected', 'Confirmed', 'Cancelled'],
    Confirmed: ['CourierSubmitted', 'Cancelled'],
    CourierSubmitted: ['InProgress', 'Delivered', 'Returned'],
    InProgress: ['Delivered', 'Returned'],
    Delivered: ['Returned'],
    Cancelled: [],
    Returned: [],
};
const MODERATOR_MAX_STATUS = 'Delivered';
const MODERATOR_ALLOWED = [
    'Pending', 'Connected', 'NotConnected', 'Confirmed',
    'CourierSubmitted', 'InProgress', 'Delivered', 'Cancelled',
];
const ADMIN_OVERRIDES = {
    Confirmed: ['Cancelled'],
    Delivered: ['Returned'],
};
export function isValidStatus(status) {
    return VALID_STATUSES.includes(status);
}
export function isTerminal(status) {
    return TERMINAL_STATUSES.includes(status);
}
export function canTransition(from, to, role) {
    if (from === to)
        return false;
    if (isTerminal(from))
        return false;
    const allowed = TRANSITION_MATRIX[from];
    if (!allowed.includes(to))
        return false;
    if (role === 'admin')
        return true;
    if (role === 'moderator') {
        if (from === 'Confirmed' && to === 'Cancelled') {
            return false;
        }
        if (to === 'Returned')
            return false;
        return MODERATOR_ALLOWED.includes(to);
    }
    return false;
}
export function validateTransition(from, to, role) {
    if (!isValidStatus(to)) {
        throw new AppError('BAD_REQUEST', `Invalid status: ${to}`);
    }
    if (from === to) {
        throw new AppError('BAD_REQUEST', 'Order is already in this status');
    }
    if (isTerminal(from)) {
        throw new AppError('BAD_REQUEST', `Order is in terminal status "${from}" and cannot be changed`);
    }
    if (!canTransition(from, to, role)) {
        throw new AppError('BAD_REQUEST', `Cannot transition from "${from}" to "${to}" with role "${role}"`);
    }
    return to;
}
export function getStatusLabel(status) {
    const labels = {
        New: 'New',
        Pending: 'Pending',
        Connected: 'Connected',
        NotConnected: 'Not Connected',
        Confirmed: 'Confirmed',
        CourierSubmitted: 'Courier Submitted',
        InProgress: 'In Progress',
        Delivered: 'Delivered',
        Cancelled: 'Cancelled',
        Returned: 'Returned',
    };
    return labels[status];
}
export function getCustomerStatusLabel(status) {
    const labels = {
        New: '\u09A8\u09A4\u09C1\u09A8',
        Pending: '\u09AC\u09C7\u09B8\u09C7 \u09A8\u09C6\u09AF\u09BC\u09BE',
        Connected: '\u09AF\u09CB\u09A7\u09C1 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u09A8',
        NotConnected: '\u09AF\u09CB\u09A7\u09C1 \u09A8\u09C7\u09B9\u09C7',
        Confirmed: '\u09A8\u09BF\u09B6\u09CD\u09B9\u09BF\u09A4',
        CourierSubmitted: '\u0995\u09C1\u09B0\u09BF\u09AF\u09BC\u09B0 \u09AA\u09CD\u09B0\u09C7\u09B0\u09B0\u09CD\u09AA\u09A8',
        InProgress: '\u09A1\u09C7\u09B2\u09A8 \u09B9\u099A\u09CD\u09B9\u09B2',
        Delivered: '\u09A1\u09C7\u09B2\u09BF\u09AD\u09B0\u09BF',
        Cancelled: '\u09AC\u09BE\u09A4\u09BF\u09B2',
        Returned: '\u09AB\u09C7\u09B0\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7',
    };
    return labels[status];
}
export { VALID_STATUSES, TERMINAL_STATUSES };
//# sourceMappingURL=statusEngine.js.map