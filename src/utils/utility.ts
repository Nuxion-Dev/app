export function objEquals<T extends Object>(a: T, b: T): boolean {
    const keys1 = Object.keys(a) as (keyof T)[];
    const keys2 = Object.keys(b) as (keyof T)[];
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
        if (a[key] !== b[key]) return false;
    }
    return true;
}