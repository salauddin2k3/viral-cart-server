type OrderStatus = 'New' | 'Pending' | 'Connected' | 'NotConnected' | 'Confirmed' | 'CourierSubmitted' | 'InProgress' | 'Delivered' | 'Cancelled' | 'Returned';
declare const VALID_STATUSES: OrderStatus[];
declare const TERMINAL_STATUSES: OrderStatus[];
export declare function isValidStatus(status: string): status is OrderStatus;
export declare function isTerminal(status: OrderStatus): boolean;
export declare function canTransition(from: OrderStatus, to: OrderStatus, role: 'admin' | 'moderator'): boolean;
export declare function validateTransition(from: OrderStatus, to: string, role: 'admin' | 'moderator'): OrderStatus;
export declare function getStatusLabel(status: OrderStatus): string;
export declare function getCustomerStatusLabel(status: OrderStatus): string;
export { OrderStatus, VALID_STATUSES, TERMINAL_STATUSES };
//# sourceMappingURL=statusEngine.d.ts.map