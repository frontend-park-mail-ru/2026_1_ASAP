export function birthDateDigitsOnly(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, 8);
}

export function formatBirthDateMaskFromDigits(digits: string): string {
    const d = birthDateDigitsOnly(digits);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}


export function initialBirthDateMask(fromServer?: string): string {
    const s = String(fromServer ?? '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, mo, da] = s.split('-');
        const digits = `${da.padStart(2, '0')}${mo.padStart(2, '0')}${y}`.replace(/\D/g, '').slice(0, 8);
        return formatBirthDateMaskFromDigits(digits);
    }
    const ru = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
    if (ru) {
        const digits = `${ru[1].padStart(2, '0')}${ru[2].padStart(2, '0')}${ru[3]}`;
        return formatBirthDateMaskFromDigits(digits);
    }
    return formatBirthDateMaskFromDigits(s);
}
