export class AuthService {
    async getMe() {
        return {
            id: 1,
            name: 'Alex',
            email: 'alex@mail.ru'
        };
    }
}