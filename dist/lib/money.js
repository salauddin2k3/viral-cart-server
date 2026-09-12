export function roundHalfUp(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function calculateFinalPrice(regularPrice, discountPercent) {
    if (discountPercent <= 0 || discountPercent >= 100) {
        return roundHalfUp(regularPrice);
    }
    return roundHalfUp(regularPrice * (1 - discountPercent / 100));
}
export function formatTaka(amount) {
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `\u09F3${formatted}`;
}
export function parseMoneyInput(input) {
    const cleaned = input.replace(/[৳,\s]/g, '');
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) {
        throw new Error('Invalid money value');
    }
    return roundHalfUp(num);
}
//# sourceMappingURL=money.js.map