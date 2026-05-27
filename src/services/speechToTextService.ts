import { wsClient } from "../core/utils/wsClient";

/**
 * Сервис для распознавания речи в текстовый формат (Speech-to-Text).
 * Отправляет WebSocket-запросы для расшифровки голосовых сообщений.
 *
 * @class SpeechToTextService
 */
class SpeechToTextService {
    /**
     * Запрашивает расшифровку голосового сообщения через WebSocket.
     * Отправляет пакет message.TranscribeVoice.
     *
     * @param {string} chatId - Идентификатор чата.
     * @param {string} messageId - Идентификатор сообщения.
     * @returns {boolean} Успешность отправки запроса в WebSocket.
     */
    public requestTranscription(chatId: string, messageId: string): boolean {
        return wsClient.sendIfOpen("message.TranscribeVoice", {
            chat_id: Number(chatId),
            message_id: Number(messageId),
        });
    }
}

/**
 * Синглтон-экземпляр сервиса распознавания речи.
 */
export const speechToTextService = new SpeechToTextService();
