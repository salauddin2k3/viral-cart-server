const BD_PHONE_REGEX = /^(?:\+88|88)?01[3-9]\d{8}$/;
export function normalizeBdPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('880') && digits.length === 13) {
        return `+${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('01')) {
        return `+88${digits}`;
    }
    return raw.trim();
}
export function isValidBdPhone(phone) {
    return BD_PHONE_REGEX.test(phone.replace(/\D/g, ''));
}
export function phoneHash(phone) {
    return normalizeBdPhone(phone).replace(/\D/g, '');
}
//# sourceMappingURL=phone.js.map