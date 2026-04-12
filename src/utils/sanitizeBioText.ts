const ZERO_WIDTH_SPACE_AND_BOM = /[\u200B\uFEFF]/g;

export function sanitizeBioText(raw: string): string {
    return String(raw ?? '').replace(ZERO_WIDTH_SPACE_AND_BOM, '');
}
