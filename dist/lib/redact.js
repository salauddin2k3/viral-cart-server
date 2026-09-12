const SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|authorization|cookie|phone|mobile|address|email)/i;
const PHONE_PATTERN = /(?:\+88|88)?01[3-9]\d{8}/g;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const MASK = '[REDACTED]';
function maskString(value) {
    return value.replace(PHONE_PATTERN, MASK).replace(EMAIL_PATTERN, MASK);
}
export function redactValue(value) {
    if (typeof value === 'string') {
        return maskString(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item));
    }
    if (value !== null && typeof value === 'object') {
        const output = {};
        for (const [key, nested] of Object.entries(value)) {
            output[key] = SENSITIVE_KEY_PATTERN.test(key) ? MASK : redactValue(nested);
        }
        return output;
    }
    return value;
}
export function redactUrl(rawUrl) {
    const queryIndex = rawUrl.indexOf('?');
    if (queryIndex === -1) {
        return rawUrl;
    }
    const pathname = rawUrl.slice(0, queryIndex);
    const params = new URLSearchParams(rawUrl.slice(queryIndex + 1));
    for (const [key, value] of params) {
        params.set(key, SENSITIVE_KEY_PATTERN.test(key) ? 'REDACTED' : maskString(value));
    }
    return `${pathname}?${params.toString()}`;
}
//# sourceMappingURL=redact.js.map