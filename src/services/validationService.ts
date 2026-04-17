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
export const PROFILE_FULL_NAME_MAX_LENGTH = 100;

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
            return { isValid: false, message: 'Введите почту' };
        }

        const emailRegex = new RegExp(
            /^((([A-Za-z0-9._%+-]+)(\.[A-Za-z0-9._%+-]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([A-Za-z0-9-]+\.)+[A-Za-z]{2,}))$/
        );

        const ipAddressRegex = new RegExp(
            /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        );

        if (/[\x80-\uFFFF]/.test(email)) {
            return { isValid: false, message: 'Используйте только латинские буквы, цифры и спецсимволы' };
        }

        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Пожалуйста, укажите корректный адрес почты' };
        }

        const domain = email.split('@')[1];
        if (ipAddressRegex.test(domain)) {
             return { isValid: false, message: 'Используйте доменное имя вместо IP-адреса' };
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
            { regex: /.{8,}/, message: 'Используйте не менее 8 символов' },
            { regex: /[A-Z]/, message: 'Добавьте хотя бы одну заглавную букву' },
            { regex: /[a-z]/, message: 'Добавьте хотя бы одну строчную букву' },
            { regex: /[0-9]/, message: 'Добавьте хотя бы одну цифру' },
            { regex: /[[\]!@#$%^&*()_+=}{';:"\\|,.<>/?]/, message: 'Добавьте хотя бы один спецсимвол' },
        ];

        const missing: string[] = [];
        let isValid = true;

        if (!password) {
            return {
                isValid: false,
                message: 'Введите пароль',
                missing: requirements.map(req => req.message)
            };
        }

        for (const req of requirements) {
            if (!req.regex.test(password)) {
                isValid = false;
                missing.push(req.message);
            }
        }

        return { isValid, message: isValid ? '' : 'Усильте пароль согласно подсказкам', missing };
    }

    /**
     * Валидирует логин (3–20 символов, латиница, цифры, `_`).
     * @param {string} login - Логин.
     * @returns {ValidationResult}
     */
    public validateLogin(login: string): ValidationResult {
        if (!login) {
            return { isValid: false, message: 'Введите логин' };
        }
        if (login.length < 3) {
            return { isValid: false, message: 'Используйте не менее 3 символов' };
        }
        if (login.length > 20) {
            return { isValid: false, message: 'Используйте не более 20 символов' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(login)) {
            return { isValid: false, message: 'Используйте только латинские буквы, цифры и _' };
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
            return { isValid: false, message: `Заполните поле «${fieldName}»` };
        }

        return { isValid: true, message: '' };
    }

    public validateProfileFirstName(firstName: string): ValidationResult {
        const t = (firstName ?? '').trim();
        const req = this.validateRequired(t, 'Имя');
        if (!req.isValid) return req;
        if (t.length > PROFILE_FULL_NAME_MAX_LENGTH) {
            return {
                isValid: false,
                message: `Используйте не более ${PROFILE_FULL_NAME_MAX_LENGTH} символов в имени`,
            };
        }
        return { isValid: true, message: '' };
    }

    public validateProfileLastName(lastName: string): ValidationResult {
        const t = (lastName ?? '').trim();
        if (!t) return { isValid: true, message: '' };
        if (t.length > PROFILE_FULL_NAME_MAX_LENGTH) {
            return {
                isValid: false,
                message: `Используйте не более ${PROFILE_FULL_NAME_MAX_LENGTH} символов в фамилии`,
            };
        }
        return { isValid: true, message: '' };
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
                message: 'Введите дату в формате ДД.ММ.ГГГГ',
            };
        }

        if (year < 1900) {
            return { isValid: false, message: 'Укажите год начиная с 1900' };
        }

        if (month < 1 || month > 12) {
            return { isValid: false, message: 'Укажите месяц от 01 до 12' };
        }

        const dim = new Date(year, month, 0).getDate();
        if (day < 1 || day > dim) {
            return { isValid: false, message: 'Укажите день, подходящий для этого месяца' };
        }

        const d = new Date(year, month - 1, day);
        if (
            d.getFullYear() !== year ||
            d.getMonth() !== month - 1 ||
            d.getDate() !== day
        ) {
            return { isValid: false, message: 'Пожалуйста, проверьте правильность даты' };
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) {
            return { isValid: false, message: 'Выберите дату не позже сегодняшнего дня' };
        }

        return { isValid: true, message: '' };
    }

    public validateBio(bio: string): ValidationResult {
        const t = sanitizeBioText(bio ?? '').trim();
        if (t.length > PROFILE_BIO_MAX_LENGTH) {
            return {
                isValid: false,
                message: `Используйте не более ${PROFILE_BIO_MAX_LENGTH} символов`,
            };
        }
        return { isValid: true, message: '' };
    }
}

export const validationService = new ValidationService();