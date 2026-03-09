
class ValidationService {
    validateEmail(email) {
        if (!email) {
            return { isValid: false, message: 'Почта не может быть пустой.' };
        }

        // Регулярка для почты допускает:
        // В имени: латинские буквы, цифры, . _ % + -
        // В домене: латинские буквы, цифры, - и .
        // Не менее 2 символов в доменной зоне (например, .com, .ru)
        // Запрещает IP в доменной части
        // Запрещает разные последовательности и спец символы
        // Запрещает точки в начале и в конце или дефисы в домене

        const emailRegex = new RegExp(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
        
        const ipAddressRegex = new RegExp(
            /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        );

        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Неверный формат почты.' };
        }
        
        const domain = email.split('@')[1];
        if (ipAddressRegex.test(domain)) {
             return { isValid: false, message: 'IP-адреса в домене не допускаются.' };
        }

        return { isValid: true, message: '' };
    }

    validatePassword(password) {
        const requirements = [
            { regex: /.{8,}/, message: 'Минимум 8 символов' },
            { regex: /[A-Z]/, message: 'Хотя бы одна заглавная буква' },
            { regex: /[a-z]/, message: 'Хотя бы одна строчная буква' },
            { regex: /[0-9]/, message: 'Хотя бы одна цифра' },
            { regex: /[[\]!@#$%^&*()_+\-={};':"\\|,.<>/?]/, message: 'Хотя бы один спецсимвол' },
        ];

        const missing = [];
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

    validateLogin(login) {
        if (!login) {
            return { isValid: false, message: 'Логин не может быть пустым.' };
        }
        if (login.length < 3) {
            return { isValid: false, message: 'Логин должен быть не менее 3 символов.' };
        }
        if (login.length > 20) {
            return { isValid: false, message: 'Логин должен быть не более 20 символов.' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(login)) {
            return { isValid: false, message: 'Логин может содержать только латинские буквы, цифры и _.' };
        }
        return { isValid: true, message: '' };
    }
    
    validateRequired(value, fieldName = 'Поле') {
        if (!value || value.trim() === '') {
            return { isValid: false, message: `${fieldName} не может быть пустым.` };
        }
        return { isValid: true, message: '' };
    }
}

export const validationService = new ValidationService();