import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './voiceMessage.hbs';

/**
 * Свойства компонента голосового сообщения.
 * @interface VoiceMessageProps
 * @extends {IBaseComponentProps}
 */
export interface VoiceMessageProps extends IBaseComponentProps {
    /** URL-адрес аудиофайла голосового сообщения на сервере */
    url?: string;
    /** Заранее известная длительность сообщения в виде строки (например "0:59") */
    durationStr?: string;
    /** Уникальный идентификатор сообщения для связи с расшифровкой */
    messageId: string;
    /** Идентификатор конкретного вложения голосового сообщения */
    attachmentId?: number;
    /** Флаг возможности транскрипции (наличие активной подписки) */
    canTranscribe?: boolean;
    /** Текст расшифровки, если он уже был получен ранее */
    transcript?: string;
    /** Колбэк для инициации процесса расшифровки речи на бэкенде */
    onTranscribe?: (messageId: string, attachmentId?: number) => void;
}

/**
 * Компонент для воспроизведения голосовых сообщений и показа расшифровки текста.
 * Реализует проигрывание аудио, обновление таймера, прогресс-бара и распознавание речи (Speech-to-Text).
 *
 * @class VoiceMessage
 * @extends {BaseComponent<VoiceMessageProps>}
 */
export class VoiceMessage extends BaseComponent<VoiceMessageProps> {
    /** Ссылка на глобально воспроизводимый аудио-объект в данный момент */
    private static currentPlayingAudio: HTMLAudioElement | null = null;
    /** Ссылка на иконку воспроизведения текущего играющего голосового сообщения */
    private static currentPlayingIcon: HTMLImageElement | null = null;

    /** Локальный объект аудио для данного сообщения */
    private audio: HTMLAudioElement | null = null;
    /** Кнопка воспроизведения/паузы */
    private playBtn: HTMLButtonElement | null = null;
    /** Изображение иконки кнопки воспроизведения */
    private playIcon: HTMLImageElement | null = null;
    /** Контейнер визуализатора (звуковой волны) */
    private visualizer: HTMLElement | null = null;
    /** Элемент для отображения длительности или текущего времени */
    private durationStr: HTMLElement | null = null;

    /** Кнопка запроса расшифровки «T» */
    private sttBtn: HTMLButtonElement | null = null;
    /** Контейнер панели расшифровки */
    private transcriptContainer: HTMLElement | null = null;
    /** Контейнер текста расшифровки */
    private transcriptTextEl: HTMLElement | null = null;
    /** Анимированный лоадер расшифровки */
    private transcriptLoader: HTMLElement | null = null;

    /** Флаг активного выполнения сетевого запроса к Speech-to-Text */
    private isTranscribing = false;
    /** Состояние отображения текстовой панели расшифровки */
    private showTranscriptState = false;
    /** Идентификатор таймера ожидания ответа WebSocket */
    private sttTimeoutId: ReturnType<typeof setTimeout> | null = null;

    /**
     * Создает экземпляр VoiceMessage.
     * @param {VoiceMessageProps} props - Свойства компонента.
     */
    constructor(props: VoiceMessageProps) {
        super(props);
    }

    /**
     * Возвращает функцию рендеринга шаблона.
     * @returns {(context?: object) => string} Функция шаблонизатора.
     */
    getTemplate(): (context?: object) => string {
        return template;
    }

    /**
     * Вызывается после монтирования компонента в DOM.
     * Находит элементы, инициализирует визуализатор, загружает аудио и вешает слушатели событий.
     * @protected
     * @override
     */
    protected afterMount(): void {
        super.afterMount();
        
        if (!this.element) return;

        this.playBtn = this.element.querySelector('[data-component="voice-play"]');
        this.playIcon = this.element.querySelector('[data-component="voice-play-icon"]');
        this.visualizer = this.element.querySelector('[data-component="voice-visualizer"]');
        this.durationStr = this.element.querySelector('[data-component="voice-duration"]');

        this.sttBtn = this.element.querySelector('[data-component="voice-stt"]');
        this.transcriptContainer = this.element.querySelector('[data-component="voice-transcript"]');
        this.transcriptTextEl = this.element.querySelector('[data-component="voice-transcript-text"]');
        this.transcriptLoader = this.element.querySelector('[data-component="voice-transcript-loader"]');

        this.initVisualizer();

        if (this.props.durationStr && this.durationStr) {
            this.durationStr.textContent = this.props.durationStr;
        }

        // Если расшифровка уже пришла в свойствах, фиксируем состояние показа
        if (this.props.transcript) {
            this.showTranscriptState = true;
        }

        if (this.sttBtn) {
            this.sttBtn.addEventListener('click', this.toggleSTT);
        }

        if (!this.props.url) return;

        this.audio = new Audio(this.props.url);
        this.audio.preload = 'metadata';

        this.audio.addEventListener('loadedmetadata', this.handleLoadedMetadata);
        this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
        this.audio.addEventListener('ended', this.handleEnded);

        if (this.playBtn) {
            this.playBtn.addEventListener('click', this.togglePlay);
        }
    }

    /**
     * Форматирует время в секундах в строку формата MM:SS.
     * @param {number} time - Время в секундах.
     * @returns {string} Строка в формате MM:SS.
     * @private
     */
    private formatTime(time: number): string {
        if (isNaN(time) || !isFinite(time)) return '00:00';
        const m = Math.floor(time / 60).toString().padStart(2, '0');
        const s = Math.floor(time % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    /**
     * Инициализирует визуализатор (звуковую волну) случайными значениями высоты баров.
     * @private
     */
    private initVisualizer(): void {
        if (!this.visualizer) return;
        this.visualizer.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'voice-message__bar';
            bar.style.height = `${20 + Math.random() * 80}%`;
            this.visualizer.appendChild(bar);
        }
    }

    /**
     * Обработчик события загрузки метаданных аудио. Устанавливает начальную длительность.
     * @private
     */
    private handleLoadedMetadata = (): void => {
        if (!this.audio || !this.durationStr) return;
        if (!isFinite(this.audio.duration)) {
            if (!this.props.durationStr) {
                this.durationStr.textContent = '00:00';
            }
            return;
        }
        this.durationStr.textContent = this.formatTime(this.audio.duration);
    };

    /**
     * Обработчик события изменения текущего времени проигрывания.
     * Обновляет счетчик времени и подсвечивает бары визуализатора пропорционально прогрессу.
     * @private
     */
    private handleTimeUpdate = (): void => {
        if (!this.audio || !this.durationStr || !this.visualizer) return;
        this.durationStr.textContent = this.formatTime(this.audio.currentTime);
        const progress = this.audio.currentTime / this.audio.duration;
        const bars = this.visualizer.children;
        const activeCount = Math.floor(progress * bars.length);
        for (let i = 0; i < bars.length; i++) {
            if (i < activeCount) {
                bars[i].classList.add('voice-message__bar--active');
            } else {
                bars[i].classList.remove('voice-message__bar--active');
            }
        }
    };

    /**
     * Обработчик события завершения проигрывания аудиозаписи.
     * Возвращает аудио в начало, сбрасывает иконку и визуализатор.
     * @private
     */
    private handleEnded = (): void => {
        if (!this.audio || !this.durationStr || !this.playIcon || !this.visualizer) return;
        this.playIcon.src = '/assets/images/icons/playIcon.svg';
        
        if (!isFinite(this.audio.duration) && this.props.durationStr) {
            this.durationStr.textContent = this.props.durationStr;
        } else {
            this.durationStr.textContent = this.formatTime(this.audio.duration);
        }
        
        this.audio.currentTime = 0;
        
        const bars = this.visualizer.children;
        for (let i = 0; i < bars.length; i++) {
            bars[i].classList.remove('voice-message__bar--active');
        }
        
        if (VoiceMessage.currentPlayingAudio === this.audio) {
            VoiceMessage.currentPlayingAudio = null;
            VoiceMessage.currentPlayingIcon = null;
        }
    };

    /**
     * Переключает состояние проигрывания (Play / Pause).
     * Останавливает любое другое запущенное голосовое сообщение перед началом проигрывания.
     * @private
     */
    private togglePlay = (): void => {
        if (!this.audio || !this.playIcon) return;

        if (this.audio.paused) {
            if (VoiceMessage.currentPlayingAudio && VoiceMessage.currentPlayingAudio !== this.audio) {
                VoiceMessage.currentPlayingAudio.pause();
                if (VoiceMessage.currentPlayingIcon) {
                    VoiceMessage.currentPlayingIcon.src = '/assets/images/icons/playIcon.svg';
                }
            }
            VoiceMessage.currentPlayingAudio = this.audio;
            VoiceMessage.currentPlayingIcon = this.playIcon;
            
            this.audio.play().catch(e => console.error('Audio play error:', e));
            this.playIcon.src = '/assets/images/icons/pauseIcon.svg';
        } else {
            this.audio.pause();
            this.playIcon.src = '/assets/images/icons/playIcon.svg';
            VoiceMessage.currentPlayingAudio = null;
            VoiceMessage.currentPlayingIcon = null;
        }
    };

    /**
     * Обрабатывает нажатие на кнопку расшифровки (Speech-to-Text).
     * Сворачивает/разворачивает панель расшифровки, запрашивает перевод аудио в текст при необходимости.
     * @private
     */
    private toggleSTT = (): void => {
        if (this.isTranscribing) return;

        if (this.showTranscriptState) {
            this.hideTranscript();
            this.showTranscriptState = false;
            this.sttBtn?.classList.remove('voice-message__stt--active');
            return;
        }

        if (this.props.transcript) {
            this.showTranscript(this.props.transcript);
            this.showTranscriptState = true;
            this.sttBtn?.classList.add('voice-message__stt--active');
            return;
        }

        if (!this.props.onTranscribe) return;

        this.isTranscribing = true;
        this.sttBtn?.classList.add('voice-message__stt--loading');
        
        if (this.transcriptContainer) {
            this.transcriptContainer.classList.add('voice-message__transcript--visible');
        }
        if (this.transcriptLoader) {
            this.transcriptLoader.hidden = false;
        }
        if (this.transcriptTextEl) {
            this.transcriptTextEl.textContent = '';
            this.transcriptTextEl.style.color = '';
        }

        // Инициируем запрос к STT
        this.props.onTranscribe(this.props.messageId, this.props.attachmentId);

        // Запускаем тайм-аут ожидания ответа (15 секунд)
        this.clearSttTimeout();
        this.sttTimeoutId = setTimeout(() => {
            if (this.isTranscribing) {
                this.setTranscriptError("Не удалось дождаться ответа от сервера");
            }
        }, 15000);
    };

    /**
     * Возвращает идентификатор вложения голосового сообщения.
     * @returns {number | undefined} Идентификатор вложения.
     * @public
     */
    public getAttachmentId(): number | undefined {
        return this.props.attachmentId;
    }

    /**
     * Устанавливает успешный текст расшифровки и раскрывает панель.
     * Вызывается асинхронно при приходе WS-события.
     *
     * @param {string} text - Текст расшифровки.
     * @public
     */
    public setTranscript(text: string): void {
        this.isTranscribing = false;
        this.clearSttTimeout();

        if (this.sttBtn) {
            this.sttBtn.classList.remove('voice-message__stt--loading');
            this.sttBtn.classList.add('voice-message__stt--active');
        }

        this.showTranscript(text);
        this.showTranscriptState = true;
    }

    /**
     * Выводит ошибку расшифровки в панель.
     * Вызывается асинхронно при получении WS-ошибки.
     *
     * @param {string} errorText - Текст ошибки.
     * @public
     */
    public setTranscriptError(errorText: string): void {
        this.isTranscribing = false;
        this.clearSttTimeout();

        if (this.sttBtn) {
            this.sttBtn.classList.remove('voice-message__stt--loading');
        }

        if (this.transcriptContainer) {
            this.transcriptContainer.classList.add('voice-message__transcript--visible');
        }
        if (this.transcriptLoader) {
            this.transcriptLoader.hidden = true;
        }
        if (this.transcriptTextEl) {
            this.transcriptTextEl.textContent = errorText;
            this.transcriptTextEl.style.color = '#ff4d4f'; // Красный цвет ошибки
        }
        this.showTranscriptState = true;
    }

    /**
     * Скрывает кнопку расшифровки STT (например, при отсутствии подписки).
     * @public
     */
    public hideTranscribeButton(): void {
        if (this.sttBtn) {
            this.sttBtn.style.display = 'none';
        }
    }

    /**
     * Проверяет, выполняется ли расшифровка голосового сообщения в данный момент.
     * @returns {boolean} True, если расшифровка активна.
     * @public
     */
    public isCurrentlyTranscribing(): boolean {
        return this.isTranscribing;
    }

    /**
     * Очищает таймер ожидания ответа WebSocket.
     * @private
     */
    private clearSttTimeout(): void {
        if (this.sttTimeoutId !== null) {
            clearTimeout(this.sttTimeoutId);
            this.sttTimeoutId = null;
        }
    }

    /**
     * Показывает панель расшифровки с переданным текстом.
     * @private
     */
    private showTranscript(text: string): void {
        if (this.transcriptContainer) {
            this.transcriptContainer.classList.add('voice-message__transcript--visible');
        }
        if (this.transcriptLoader) {
            this.transcriptLoader.hidden = true;
        }
        if (this.transcriptTextEl) {
            this.transcriptTextEl.textContent = text;
            this.transcriptTextEl.style.color = '';
        }
    }

    /**
     * Сворачивает панель расшифровки.
     * @private
     */
    private hideTranscript(): void {
        if (this.transcriptContainer) {
            this.transcriptContainer.classList.remove('voice-message__transcript--visible');
        }
    }

    /**
     * Вызывается перед размонтированием компонента.
     * Останавливает аудио, снимает обработчики событий и очищает глобальные синглтон-ссылки.
     * @protected
     * @override
     */
    protected beforeUnmount(): void {
        this.clearSttTimeout();

        if (this.audio) {
            this.audio.pause();
            this.audio.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
            this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
            this.audio.removeEventListener('ended', this.handleEnded);
            
            if (VoiceMessage.currentPlayingAudio === this.audio) {
                VoiceMessage.currentPlayingAudio = null;
                VoiceMessage.currentPlayingIcon = null;
            }
        }

        if (this.playBtn) {
            this.playBtn.removeEventListener('click', this.togglePlay);
        }

        if (this.sttBtn) {
            this.sttBtn.removeEventListener('click', this.toggleSTT);
        }
    }
}
