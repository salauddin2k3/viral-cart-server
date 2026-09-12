export function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
export function ensureUniqueSlug(slug, existingSlugs) {
    let candidate = slug;
    let counter = 1;
    while (existingSlugs.includes(candidate)) {
        candidate = `${slug}-${counter}`;
        counter += 1;
    }
    return candidate;
}
//# sourceMappingURL=slug.js.map