export class ChatService {
    async getChats() {
        return [
            {id: 1, name: 'Имя', lastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
            {id: 2, name: 'Имя', lastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
        ];
    }
}