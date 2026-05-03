import { describe, expect, it } from 'vitest';
import {
    birthDateDigitsOnly,
    formatBirthDateMaskFromDigits,
    initialBirthDateMask,
} from '../../../src/utils/birthDateInput';

describe('birthDateDigitsOnly', () => {
    it.each([
        ['15.01.2000', '15012000'],
        ['a1b2', '12'],
        ['1234567890', '12345678'],
        ['', ''],
    ])('%s → %s', (input, expected) => {
        expect(birthDateDigitsOnly(input)).toBe(expected);
    });
});

describe('formatBirthDateMaskFromDigits', () => {
    it.each([
        ['', ''],
        ['15', '15'],
        ['1501', '15.01'],
        ['15012000', '15.01.2000'],
    ])('%s → %s', (digits, expected) => {
        expect(formatBirthDateMaskFromDigits(digits)).toBe(expected);
    });
});

describe('initialBirthDateMask', () => {
    it('пустое/undefined → ""', () => {
        expect(initialBirthDateMask('')).toBe('');
        expect(initialBirthDateMask(undefined)).toBe('');
    });

    it('ISO 2000-01-15 → 15.01.2000', () => {
        expect(initialBirthDateMask('2000-01-15')).toBe('15.01.2000');
    });

    it('ru-формат с короткими сегментами 1.1.2000 → 01.01.2000', () => {
        expect(initialBirthDateMask('1.1.2000')).toBe('01.01.2000');
    });
});
