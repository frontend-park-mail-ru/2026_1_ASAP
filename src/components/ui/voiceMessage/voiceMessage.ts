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
}

/**
 * Компонент для воспроизведения голосовых сообщений.
 * Реализует проигрывание аудио, обновление таймера и прогресс-бара визуализатора.
 * Гарантирует воспроизведение только одного голосового сообщения в один момент времени.
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

        this.initVisualizer();

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
        this.durationStr.textContent = this.formatTime(this.audio.duration);
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
     * Вызывается перед размонтированием компонента.
     * Останавливает аудио, снимает обработчики событий и очищает глобальные синглтон-ссылки, если они указывали на этот объект.
     * @protected
     * @override
     */
    protected beforeUnmount(): void {
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
    }
}
