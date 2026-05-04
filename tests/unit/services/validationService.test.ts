import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { validationService, PROFILE_BIO_MAX_LENGTH, PROFILE_FULL_NAME_MAX_LENGTH } from '../../../src/services/validationService';

describe('validationService', () => {
    describe('validateEmail', () => {
        it.each([
            ['test@example.com'],
            ['test@123.ru'],
            ['a.b+c@sub.example.co.uk'],
            ['"quoted"@example.com'],
        ])('валидный email %s → isValid=true', (email) => {
            expect(validationService.validateEmail(email)).toEqual({ isValid: true, message: '' });
        });

        it.each([
            ['', 'Введите почту'],
            [null as unknown as string, 'Введите почту'],
            [undefined as unknown as string, 'Введите почту'],
        ])('пустой email (%p) → "Введите почту"', (email, msg) => {
            expect(validationService.validateEmail(email)).toEqual({ isValid: false, message: msg });
        });

        it.each([
            ['testexample.com'],
            ['test@'],
            ['test@invalid_#domain.com'],
            ['@example.com'],
            ['plainaddress'],
        ])('неверный формат %s', (email) => {
            const r = validationService.validateEmail(email);
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Пожалуйста, укажите корректный адрес почты');
        });

        it.each([
            ['тест@example.com'],
            ['test@примёр.ru'],
            ['user@домен.рф'],
        ])('non-ASCII символы → ошибка %s', (email) => {
            const r = validationService.validateEmail(email);
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Используйте только латинские буквы, цифры и спецсимволы');
        });

        it('IP-адрес как домен → "Пожалуйста, укажите корректный адрес почты" (regex отсекает на этапе формата)', () => {
            const r = validationService.validateEmail('test@192.168.1.1');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Пожалуйста, укажите корректный адрес почты');
        });
    });

    describe('validatePassword', () => {
        it('валидный пароль Password123! → isValid=true, missing=[]', () => {
            const r = validationService.validatePassword('Password123!');
            expect(r.isValid).toBe(true);
            expect(r.message).toBe('');
            expect(r.missing).toEqual([]);
        });

        it('пустой пароль → все 5 пунктов в missing[]', () => {
            const r = validationService.validatePassword('');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Введите пароль');
            expect(r.missing).toEqual([
                'Используйте не менее 8 символов',
                'Добавьте хотя бы одну заглавную букву',
                'Добавьте хотя бы одну строчную букву',
                'Добавьте хотя бы одну цифру',
                'Добавьте хотя бы один спецсимвол',
            ]);
        });

        it('7 символов "Pass1!a" — короче 8 → missing содержит длину', () => {
            const r = validationService.validatePassword('Pass1!a');
            expect(r.isValid).toBe(false);
            expect(r.missing).toContain('Используйте не менее 8 символов');
            expect(r.message).toBe('Усильте пароль согласно подсказкам');
        });

        it('без заглавной → missing содержит "заглавную букву"', () => {
            const r = validationService.validatePassword('password123!');
            expect(r.isValid).toBe(false);
            expect(r.missing).toContain('Добавьте хотя бы одну заглавную букву');
        });

        it('без строчной → missing содержит "строчную букву"', () => {
            const r = validationService.validatePassword('PASSWORD123!');
            expect(r.isValid).toBe(false);
            expect(r.missing).toContain('Добавьте хотя бы одну строчную букву');
        });

        it('без цифры → missing содержит "одну цифру"', () => {
            const r = validationService.validatePassword('Password!!!!');
            expect(r.isValid).toBe(false);
            expect(r.missing).toContain('Добавьте хотя бы одну цифру');
        });

        it('без спецсимвола → missing содержит "спецсимвол"', () => {
            const r = validationService.validatePassword('Password123');
            expect(r.isValid).toBe(false);
            expect(r.missing).toContain('Добавьте хотя бы один спецсимвол');
        });

        it('property: пароль из 7 строчных латинских букв всегда невалиден', () => {
            fc.assert(
                fc.property(
                    fc.stringMatching(/^[a-z]{7}$/),
                    (password) => {
                        const r = validationService.validatePassword(password);
                        expect(r.isValid).toBe(false);
                        expect(r.missing).toContain('Используйте не менее 8 символов');
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe('validateLogin', () => {
        it.each([['test_user123'], ['user'], ['a1_b2_c3_d4_e5_f6_g7']])(
            'валидный логин %s',
            (login) => {
                expect(validationService.validateLogin(login)).toEqual({ isValid: true, message: '' });
            }
        );

        it.each([['', 'Введите логин'], [null as unknown as string, 'Введите логин']])(
            'пусто %p',
            (login, msg) => {
                expect(validationService.validateLogin(login)).toEqual({ isValid: false, message: msg });
            }
        );

        it('логин < 3 символов', () => {
            expect(validationService.validateLogin('ab')).toEqual({
                isValid: false,
                message: 'Используйте не менее 3 символов',
            });
        });

        it('логин > 20 символов', () => {
            expect(validationService.validateLogin('thisisverylongloginnamethatshouldfail')).toEqual({
                isValid: false,
                message: 'Используйте не более 20 символов',
            });
        });

        it.each([['test-user'], ['тест_юзер'], ['user!'], ['user space']])(
            'инвалид-символы %s',
            (login) => {
                expect(validationService.validateLogin(login)).toEqual({
                    isValid: false,
                    message: 'Используйте только латинские буквы, цифры и _',
                });
            }
        );
    });

    describe('validateRequired', () => {
        it('непустое значение → ok', () => {
            expect(validationService.validateRequired('value')).toEqual({ isValid: true, message: '' });
        });

        it('"0" (falsy строка, но непустая) → ok', () => {
            expect(validationService.validateRequired('0')).toEqual({ isValid: true, message: '' });
        });

        it.each([['', 'Заполните поле «Поле»'], ['   ', 'Заполните поле «Поле»']])(
            'пусто/пробелы %p',
            (val, msg) => {
                expect(validationService.validateRequired(val)).toEqual({ isValid: false, message: msg });
            }
        );

        it('кастомное fieldName подставляется', () => {
            expect(validationService.validateRequired('', 'Email')).toEqual({
                isValid: false,
                message: 'Заполните поле «Email»',
            });
        });
    });

    describe('validateProfileFirstName', () => {
        it('валидно "Иван"', () => {
            expect(validationService.validateProfileFirstName('Иван')).toEqual({ isValid: true, message: '' });
        });

        it('пусто → ошибка required', () => {
            const r = validationService.validateProfileFirstName('');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Заполните поле «Имя»');
        });

        it(`ровно ${PROFILE_FULL_NAME_MAX_LENGTH} символов → ok`, () => {
            const name = 'a'.repeat(PROFILE_FULL_NAME_MAX_LENGTH);
            expect(validationService.validateProfileFirstName(name).isValid).toBe(true);
        });

        it(`${PROFILE_FULL_NAME_MAX_LENGTH + 1} символов → ошибка`, () => {
            const name = 'a'.repeat(PROFILE_FULL_NAME_MAX_LENGTH + 1);
            const r = validationService.validateProfileFirstName(name);
            expect(r.isValid).toBe(false);
            expect(r.message).toBe(`Используйте не более ${PROFILE_FULL_NAME_MAX_LENGTH} символов в имени`);
        });
    });

    describe('validateProfileLastName', () => {
        it('пусто → ok (необязательно)', () => {
            expect(validationService.validateProfileLastName('')).toEqual({ isValid: true, message: '' });
        });

        it('валидное "Иванов"', () => {
            expect(validationService.validateProfileLastName('Иванов').isValid).toBe(true);
        });

        it(`${PROFILE_FULL_NAME_MAX_LENGTH + 1} символов → ошибка`, () => {
            const r = validationService.validateProfileLastName('x'.repeat(PROFILE_FULL_NAME_MAX_LENGTH + 1));
            expect(r.isValid).toBe(false);
            expect(r.message).toBe(`Используйте не более ${PROFILE_FULL_NAME_MAX_LENGTH} символов в фамилии`);
        });
    });

    describe('validateBirthDate', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-05-03T12:00:00Z'));
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('пусто → ok', () => {
            expect(validationService.validateBirthDate('')).toEqual({ isValid: true, message: '' });
        });

        it.each([['2000-01-15'], ['15.01.2000']])('валидный формат %s', (v) => {
            expect(validationService.validateBirthDate(v).isValid).toBe(true);
        });

        it.each([['2000/01/15'], ['15-01-2000'], ['abc']])('кривой формат %s', (v) => {
            const r = validationService.validateBirthDate(v);
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Введите дату в формате ДД.ММ.ГГГГ');
        });

        it('год 1899 → ошибка', () => {
            const r = validationService.validateBirthDate('1899-05-15');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Укажите год начиная с 1900');
        });

        it('год 1900 → ok', () => {
            expect(validationService.validateBirthDate('1900-01-01').isValid).toBe(true);
        });

        it('месяц 13 → ошибка', () => {
            const r = validationService.validateBirthDate('2000-13-01');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Укажите месяц от 01 до 12');
        });

        it('31 февраля → ошибка дня', () => {
            const r = validationService.validateBirthDate('2000-02-31');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Укажите день, подходящий для этого месяца');
        });

        it('29.02.2000 (високосный) → ok', () => {
            expect(validationService.validateBirthDate('29.02.2000').isValid).toBe(true);
        });

        it('29.02.2001 (невисокосный) → ошибка', () => {
            const r = validationService.validateBirthDate('29.02.2001');
            expect(r.isValid).toBe(false);
        });

        it('завтрашняя дата → ошибка "не позже сегодняшнего"', () => {
            const r = validationService.validateBirthDate('2026-05-04');
            expect(r.isValid).toBe(false);
            expect(r.message).toBe('Выберите дату не позже сегодняшнего дня');
        });

        it('property: любая дата с year > 2026 → invalid', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2027, max: 2099 }),
                    fc.integer({ min: 1, max: 12 }),
                    fc.integer({ min: 1, max: 28 }),
                    (y, m, d) => {
                        const value = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
                        expect(validationService.validateBirthDate(value).isValid).toBe(false);
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe('validateBio', () => {
        it(`ровно ${PROFILE_BIO_MAX_LENGTH} символов → ok`, () => {
            const r = validationService.validateBio('a'.repeat(PROFILE_BIO_MAX_LENGTH));
            expect(r.isValid).toBe(true);
        });

        it(`${PROFILE_BIO_MAX_LENGTH + 1} символов → ошибка`, () => {
            const r = validationService.validateBio('a'.repeat(PROFILE_BIO_MAX_LENGTH + 1));
            expect(r.isValid).toBe(false);
            expect(r.message).toBe(`Используйте не более ${PROFILE_BIO_MAX_LENGTH} символов`);
        });

        it('zero-width символы не учитываются в длине', () => {
            const visible = 'a'.repeat(PROFILE_BIO_MAX_LENGTH);
            const withZeroWidth = visible + '​﻿​';
            expect(validationService.validateBio(withZeroWidth).isValid).toBe(true);
        });
    });
});
