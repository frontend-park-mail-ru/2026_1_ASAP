import { describe, expect, it } from 'vitest';
import { sanitizeBioText } from '../../../src/utils/sanitizeBioText';

describe('sanitizeBioText', () => {
    it('обычный текст не меняется', () => {
        expect(sanitizeBioText('привет, мир')).toBe('привет, мир');
    });

    it('убирает zero-width space (U+200B)', () => {
        expect(sanitizeBioText('​при​вет​')).toBe('привет');
    });

    it('убирает BOM (U+FEFF)', () => {
        expect(sanitizeBioText('﻿привет﻿')).toBe('привет');
    });

    it.each([
        [null as unknown as string, ''],
        [undefined as unknown as string, ''],
    ])('null/undefined → пустая строка (%p)', (input, expected) => {
        expect(sanitizeBioText(input)).toBe(expected);
    });
});
