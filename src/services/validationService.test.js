import { validationService } from "./validationService";
import { describe, it, expect, beforeEach } from "vitest";

describe("ValidationService", () => {
    describe("validateEmail", () => {
        it("Должен возвращать isValid: true для валидной почты", () => {
            expect(validationService.validateEmail("test@example.com")).toEqual({ isValid: true, message: ''});
            expect(validationService.validateEmail("test@123.ru")).toEqual({ isValid: true, message: ''});
        });

        it("Должен возвращать isValid: false и сообщение для пустой почты", () => {
            expect(validationService.validateEmail("")).toEqual({ isValid: false, message: 'Почта не может быть пустой'});
            expect(validationService.validateEmail(null)).toEqual({ isValid: false, message: 'Почта не может быть пустой'});
            expect(validationService.validateEmail(undefined)).toEqual({ isValid: false, message: 'Почта не может быть пустой'});
        });

        it("Должен возвращать isValid: false и сообщение для почты с неправильным форматом", () => {
            expect(validationService.validateEmail("testexample.com")).toEqual({ isValid: false, message: 'Неверный формат почты'});
            expect(validationService.validateEmail("test@")).toEqual({ isValid: false, message: 'Неверный формат почты'});
            expect(validationService.validateEmail("test@invalid_#domain.com")).toEqual({ isValid: false, message: 'Неверный формат почты'});
            expect(validationService.validateEmail('test@192.168.1.1')).toEqual({ isValid: false, message: 'Неверный формат почты'});
        });

        it('Должен возвращать isValid: false и сообщение для email с невалидными символами', () => {
            expect(validationService.validateEmail('%test@examp!e.com')).toEqual({ isValid: false, message: 'Неверный формат почты'});
            expect(validationService.validateEmail('№test@.example.com')).toEqual({ isValid: false, message: 'Почта может содержать только латинские буквы, цифры и спецсимволы'});
            expect(validationService.validateEmail('&test@example.com')).toEqual({ isValid: false, message: 'Неверный формат почты'});
        });
    });

    describe("validatePassword", () => {
        it('Должен возвращать isValid: true для валидного пароля', () => {
            const result = validationService.validatePassword('Password123!');
            expect(result.isValid).toBe(true);
            expect(result.message).toBe('');
            expect(result.missing).toEqual([]);
        });

        it('Должен возвращать isValid: false и сообщение для пустого пароля', () => {
            const result = validationService.validatePassword('');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Пароль не может быть пустым');
            expect(result.missing).toEqual([
                'Минимум 8 символов',
                'Хотя бы одна заглавная буква',
                'Хотя бы одна строчная буква',
                'Хотя бы одна цифра',
                'Хотя бы один спецсимвол',
            ]);
        });

        it('Должен возвращать isValid: false и сообщение для пароля, не соответствующего всем требованиям', () => {
            const result = validationService.validatePassword('shortp1');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Пароль не соответствует требованиям');
            expect(result.missing).toEqual([
                'Минимум 8 символов',
                'Хотя бы одна заглавная буква',
                'Хотя бы один спецсимвол',
            ]);
        });
        
        it('Должен возвращать isValid: false, если нет заглавной буквы', () => {
            const result = validationService.validatePassword('password123!');
            expect(result.isValid).toBe(false);
            expect(result.missing).toContain('Хотя бы одна заглавная буква');
        });

        it('Должен возвращать isValid: false, если нет строчной буквы', () => {
            const result = validationService.validatePassword('PASSWORD123!');
            expect(result.isValid).toBe(false);
            expect(result.missing).toContain('Хотя бы одна строчная буква');
        });

        it('Должен возвращать isValid: false, если нет цифры', () => {
            const result = validationService.validatePassword('Password!!!!');
            expect(result.isValid).toBe(false);
            expect(result.missing).toContain('Хотя бы одна цифра');
        });

        it('Должен возвращать isValid: false, если нет спецсимвола', () => {
            const result = validationService.validatePassword('Password123');
            expect(result.isValid).toBe(false);
            expect(result.missing).toContain('Хотя бы один спецсимвол');
        });
    });

    describe('validateLogin', () => {
        it('Должен возвращать isValid: true для валидного логина', () => {
            expect(validationService.validateLogin('test_user123')).toEqual({ isValid: true, message: '' });
            expect(validationService.validateLogin('user')).toEqual({ isValid: true, message: '' });
            expect(validationService.validateLogin('a1_b2_c3_d4_e5_f6_g7')).toEqual({ isValid: true, message: '' });
        });

        // Сценарии ошибок
        it('Должен возвращать isValid: false и сообщение для пустого логина', () => {
            expect(validationService.validateLogin('')).toEqual({ isValid: false, message: 'Логин не может быть пустым' });
            expect(validationService.validateLogin(null)).toEqual({ isValid: false, message: 'Логин не может быть пустым' });
        });

        it('Должен возвращать isValid: false и сообщение для логина короче 3 символов', () => {
            expect(validationService.validateLogin('ab')).toEqual({ isValid: false, message: 'Логин должен быть не менее 3 символов' });
        });

        it('Должен возвращать isValid: false и сообщение для логина длиннее 20 символов', () => {
            expect(validationService.validateLogin('thisisverylongloginnamethatshouldfail')).toEqual({ isValid: false, message: 'Логин должен быть не более 20 символов' });
        });

        it('Должен возвращать isValid: false и сообщение для логина с невалидными символами', () => {
            expect(validationService.validateLogin('test-user')).toEqual({ isValid: false, message: 'Логин может содержать только латинские буквы, цифры и _' });
            expect(validationService.validateLogin('тест_юзер')).toEqual({ isValid: false, message: 'Логин может содержать только латинские буквы, цифры и _' });
            expect(validationService.validateLogin('user!')).toEqual({ isValid: false, message: 'Логин может содержать только латинские буквы, цифры и _' });
        });
    });

    describe('validateRequired', () => {
        it('Должен возвращать isValid: true для непустого значения', () => {
            expect(validationService.validateRequired('some value')).toEqual({ isValid: true, message: '' });
            expect(validationService.validateRequired('0')).toEqual({ isValid: true, message: '' });
        });

        it('Должен возвращать isValid: false и сообщение для пустого значения', () => {
            expect(validationService.validateRequired('')).toEqual({ isValid: false, message: 'Поле не может быть пустым' });
            expect(validationService.validateRequired(null)).toEqual({ isValid: false, message: 'Поле не может быть пустым' });
        });
        
        it('Должен использовать переданное имя поля в сообщении об ошибке', () => {
            expect(validationService.validateRequired('', 'Email')).toEqual({ isValid: false, message: 'Email не может быть пустым' });
        });
    });
})