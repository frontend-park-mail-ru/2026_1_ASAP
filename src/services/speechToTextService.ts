// import { BASE_URL } from "../core/utils/apiBase";
// import { httpClient } from "../core/utils/httpClient";

/**
 * Интерфейс результата запроса расшифровки аудио.
 * @interface SpeechToTextResult
 */
export interface SpeechToTextResult {
    /** Успешность операции */
    success: boolean;
    /** Расшифрованный текст голосового сообщения */
    text?: string;
    /** Текст ошибки в случае неудачи */
    error?: string;
}

/**
 * Сервис для распознавания речи в текстовый формат (Speech-to-Text).
 * Работает через API и кэширует результаты в оперативной памяти для оптимизации трафика.
 *
 * @class SpeechToTextService
 */
class SpeechToTextService {
    /** Кэш расшифрованных сообщений в оперативной памяти (messageId -> текст) */
    private cache: Map<string, string> = new Map();

    /**
     * Запрашивает расшифровку голосового сообщения.
     * Если текст уже есть в кэше, возвращает его мгновенно.
     *
     * @param {string} messageId - Идентификатор сообщения.
     * @param {string} attachmentUrl - Ссылка на аудиофайл голосового сообщения.
     * @returns {Promise<SpeechToTextResult>} Результат распознавания.
     */
    public async transcribeVoice(messageId: string, attachmentUrl: string): Promise<SpeechToTextResult> {
        if (this.cache.has(messageId)) {
            return {
                success: true,
                text: this.cache.get(messageId),
            };
        }

        try {
            // ПРИМЕЧАНИЕ: Шаблон под будущую ручку бэкенда.
            // Когда ручка появится на бэкенде, раскомментируйте код ниже и настройте DTO.
            /*
            const response = await httpClient.request(`${BASE_URL}/api/v1/messages/${messageId}/transcribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: attachmentUrl }),
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Сервер вернул код ошибки ${response.status}`,
                };
            }

            const json = await response.json();
            const text = json?.body?.text || json?.text;

            if (typeof text !== "string") {
                return {
                    success: false,
                    error: "Некорректный формат ответа от сервера",
                };
            }

            this.cache.set(messageId, text);
            return { success: true, text };
            */

            // Имитируем сетевую задержку в 1.5 секунды для демонстрации лоадера
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // База реалистичных фраз для расшифровки
            const mockTranscripts = [
                "Привет! Как дела? Давно не виделись, давай созвонимся сегодня вечером, обсудим всё.",
                "Слушай, я сейчас немного занят на встрече. Освобожусь где-то через часик и сразу всё сделаю.",
                "Пожалуйста, пришли мне актуальный отчет по нашему проекту как можно скорее, руководство просит цифры.",
                "Да, отлично, договорились! Встретимся на том же месте у входа в офис.",
                "Это тестовое голосовое сообщение для проверки новой функции автоматического перевода речи в текст.",
            ];

            // Вычисляем стабильный индекс фразы на основе messageId
            const index = Math.abs(this.hashCode(messageId)) % mockTranscripts.length;
            const mockText = mockTranscripts[index];

            // Сохраняем в кэш
            this.cache.set(messageId, mockText);

            return {
                success: true,
                text: mockText,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Не удалось расшифровать аудиозапись",
            };
        }
    }

    /**
     * Получает расшифровку из локального кэша без сетевого запроса.
     *
     * @param {string} messageId - Идентификатор сообщения.
     * @returns {string | undefined} Текст расшифровки или undefined, если расшифровка отсутствует.
     */
    public getCached(messageId: string): string | undefined {
        return this.cache.get(messageId);
    }

    /**
     * Вспомогательный метод хеширования строки для псевдослучайного выбора фразы.
     * @private
     */
    private hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }
}

export const speechToTextService = new SpeechToTextService();
