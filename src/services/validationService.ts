import { sanitizeBioText } from '../utils/sanitizeBioText';

/**
 * @interface ValidationResult - Результат валидации.
 * @property {boolean} isValid - true, если значение валидно.
 * @property {string} message - Сообщение об ошибке, если невалидно.
 * @property {string[]} [missing] - Список невыполненных требований (для пароля).
 */
export interface ValidationResult {
    isValid: boolean;
    message: string;
    missing?: string[];
}

export const PROFILE_BIO_MAX_LENGTH = 1000;

/**
 * Сервис валидации пользовательского ввода: email, пароль, логин, обязательные поля.
 */
class ValidationService {
    /**
     * Валидирует email-адрес.
     * @param {string} email - Адрес электронной почты.
     * @returns {ValidationResult} Результат валидации.
     */
    public validateEmail(email: string): ValidationResult {
        if (!email) {
            return { isValid: false, message: 'Почта не может быть пустой' };
        }

        const emailRegex = new RegExp(
            /^((([A-Za-z0-9._%+-]+)(\.[A-Za-z0-9._%+-]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([A-Za-z0-9-]+\.)+[A-Za-z]{2,}))$/
        );

        const ipAddressRegex = new RegExp(
            /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        );

        if (/[\x80-\uFFFF]/.test(email)) {
            return { isValid: false, message: 'Почта может содержать только латинские буквы, цифры и спецсимволы' };
        }

        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Неверный формат почты' };
        }

        const domain = email.split('@')[1];
        if (ipAddressRegex.test(domain)) {
             return { isValid: false, message: 'IP-адреса в домене не допускаются' };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Валидирует пароль по набору требований (длина, регистр, цифры, спецсимволы).
     * @param {string} password - Пароль.
     * @returns {ValidationResult} Результат с списком невыполненных требований.
     */
    public validatePassword(password: string): ValidationResult {
        const requirements = [
            { regex: /.{8,}/, message: 'Минимум 8 символов' },
            { regex: /[A-Z]/, message: 'Хотя бы одна заглавная буква' },
            { regex: /[a-z]/, message: 'Хотя бы одна строчная буква' },
            { regex: /[0-9]/, message: 'Хотя бы одна цифра' },
            { regex: /[[\]!@#$%^&*()_+=}{';:"\\|,.<>/?]/, message: 'Хотя бы один спецсимвол' },
        ];

        const missing: string[] = [];
        let isValid = true;

        if (!password) {
            return {
                isValid: false,
                message: 'Пароль не может быть пустым',
                missing: requirements.map(req => req.message)
            };
        }

        for (const req of requirements) {
            if (!req.regex.test(password)) {
                isValid = false;
                missing.push(req.message);
            }
        }

        return { isValid, message: isValid ? '' : 'Пароль не соответствует требованиям', missing };
    }

    /**
     * Валидирует логин (3–20 символов, латиница, цифры, `_`).
     * @param {string} login - Логин.
     * @returns {ValidationResult}
     */
    public validateLogin(login: string): ValidationResult {
        if (!login) {
            return { isValid: false, message: 'Логин не может быть пустым' };
        }
        if (login.length < 3) {
            return { isValid: false, message: 'Логин должен быть не менее 3 символов' };
        }
        if (login.length > 20) {
            return { isValid: false, message: 'Логин должен быть не более 20 символов' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(login)) {
            return { isValid: false, message: 'Логин может содержать только латинские буквы, цифры и _' };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Проверяет, что поле не пустое.
     * @param {string} value - Значение поля.
     * @param {string} [fieldName='Поле'] - Название поля для сообщения об ошибке.
     * @returns {ValidationResult}
     */
    public validateRequired(value: string, fieldName: string = 'Поле'): ValidationResult {
        if (!value || value.trim() === '') {
            return { isValid: false, message: `${fieldName} не может быть пустым` };
        }

        return { isValid: true, message: '' };
    }

    /** Имя в профиле обязательно (не пустая строка после trim). */
    public validateProfileFirstName(firstName: string): ValidationResult {
        return this.validateRequired((firstName ?? '').trim(), 'Имя');
    }


    public validateBirthDate(value: string): ValidationResult {
        const v = value?.trim() ?? '';
        if (!v) {
            return { isValid: true, message: '' };
        }

        let day: number;
        let month: number;
        let year: number;

        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
            year = parseInt(v.slice(0, 4), 10);
            month = parseInt(v.slice(5, 7), 10);
            day = parseInt(v.slice(8, 10), 10);
        } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) {
            day = parseInt(v.slice(0, 2), 10);
            month = parseInt(v.slice(3, 5), 10);
            year = parseInt(v.slice(6, 10), 10);
        } else {
            return {
                isValid: false,
                message: 'Введите дату полностью: ДД.ММ.ГГГГ',
            };
        }

        if (year < 1900) {
            return { isValid: false, message: 'Год не может быть раньше 1900' };
        }

        if (month < 1 || month > 12) {
            return { isValid: false, message: 'Некорректный месяц' };
        }

        const dim = new Date(year, month, 0).getDate();
        if (day < 1 || day > dim) {
            return { isValid: false, message: 'Некорректный день для этого месяца' };
        }

        const d = new Date(year, month - 1, day);
        if (
            d.getFullYear() !== year ||
            d.getMonth() !== month - 1 ||
            d.getDate() !== day
        ) {
            return { isValid: false, message: 'Некорректная дата' };
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) {
            return { isValid: false, message: 'Дата не может быть в будущем' };
        }

        return { isValid: true, message: '' };
    }

    public validateBio(bio: string): ValidationResult {
        const t = sanitizeBioText(bio ?? '').trim();
        if (t.length > PROFILE_BIO_MAX_LENGTH) {
            return {
                isValid: false,
                message: `Слишком длинный текст (максимум ${PROFILE_BIO_MAX_LENGTH} символов)`,
            };
        }
        return { isValid: true, message: '' };
    }
}

export const validationService = new ValidationService();