export function generateCodeVerifier(length = 64): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => charset[v % charset.length]).join('');
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encodeCodeVerifier = new TextEncoder().encode(codeVerifier);
    const codeChallenge = await crypto.subtle.digest('SHA-256', encodeCodeVerifier);
    return btoa(String.fromCharCode(...new Uint8Array(codeChallenge)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function generateState(length = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => charset[v % charset.length]).join('');
}