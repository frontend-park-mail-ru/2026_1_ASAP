import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './voiceRecorder.hbs';

/**
 * Свойства компонента записи голосового сообщения.
 * @interface VoiceRecorderProps
 * @extends {IBaseComponentProps}
 */
export interface VoiceRecorderProps extends IBaseComponentProps {
    /** Колбэк, вызываемый после успешного окончания записи и формирования файла */
    onRecorded: (file: File) => void;
    /** Колбэк, вызываемый при отмене записи пользователем */
    onCancel: () => void;
    /** Колбэк для вывода сообщений об ошибках (например, отказ в доступе к микрофону) */
    onError: (msg: string) => void;
}

/**
 * Компонент записи голосовых сообщений.
 * Запрашивает доступ к микрофону, записывает аудиопоток с помощью MediaRecorder,
 * ведет отсчет времени записи и осуществляет визуализацию звуковой волны в реальном времени.
 *
 * @class VoiceRecorder
 * @extends {BaseComponent<VoiceRecorderProps>}
 */
export class VoiceRecorder extends BaseComponent<VoiceRecorderProps> {
    /** Объект записи медиа-потока браузера */
    private mediaRecorder: MediaRecorder | null = null;
    /** Медиа-поток аудио с микрофона */
    private recordStream: MediaStream | null = null;
    /** Массив записанных фрагментов (чанков) аудиоданных */
    private audioChunks: Blob[] = [];
    
    /** Таймстемп начала записи (миллисекунды) */
    private recordStartTime = 0;
    /** ID интервала для обновления таймера записи */
    private recordTimerId: number | null = null;
    /** ID таймаута для обновления анимации визуализатора */
    private visualizerTimerId: number | null = null;
    /** Флаг, указывающий, идет ли запись в данный момент */
    private isRecording = false;
    /** Флаг отмены записи (если true, файл отправлен не будет) */
    private isCancelled = false;

    /**
     * Создает экземпляр VoiceRecorder.
     * @param {VoiceRecorderProps} props - Свойства компонента.
     */
    constructor(props: VoiceRecorderProps) {
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
     * Вешает слушатели событий и запрашивает доступ к микрофону пользователя.
     * @protected
     * @override
     * @returns {Promise<void>}
     */
    protected async afterMount(): Promise<void> {
        super.afterMount();
        
        const cancelBtn = this.element?.querySelector('[data-component="voice-cancel"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancel);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.startRecording(stream);
        } catch (err) {
            this.props.onError('Не удалось получить доступ к микрофону');
            this.props.onCancel();
        }
    }

    /**
     * Инициализирует MediaRecorder и начинает запись аудиопотока.
     * Запускает таймер записи и анимацию визуализатора.
     * @param {MediaStream} stream - Входящий аудиопоток с микрофона.
     * @private
     */
    private startRecording(stream: MediaStream): void {
        this.recordStream = stream;
        
        let options: MediaRecorderOptions | undefined;
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            options = { mimeType: 'audio/ogg' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
        }
        
        this.mediaRecorder = new MediaRecorder(stream, options);
        this.audioChunks = [];
        this.isRecording = true;
        this.isCancelled = false;

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
            // Освобождаем треки микрофона ЗДЕСЬ — после получения всех чанков
            if (this.recordStream) {
                this.recordStream.getTracks().forEach(track => track.stop());
                this.recordStream = null;
            }

            if (!this.isCancelled && this.audioChunks.length > 0) {
                /**
                 * Нормализуем реальный MIME-тип из MediaRecorder.
                 * ВАЖНО: нельзя подменять тип (например, оборачивать MP4-байты в audio/webm),
                 * т.к. FFmpeg на бэкенде проверяет содержимое, а не только заголовок.
                 * Бэкенд принимает: audio/webm, audio/ogg, audio/mp4, audio/x-m4a.
                 */
                let actualMimeType = this.mediaRecorder?.mimeType || options?.mimeType || 'audio/webm';
                // Убираем параметры кодеков: "audio/webm;codecs=opus" → "audio/webm"
                actualMimeType = actualMimeType.split(';')[0].trim().toLowerCase();
                // Safari для аудио-only потоков иногда ставит video/* вместо audio/*
                if (actualMimeType === 'video/mp4') actualMimeType = 'audio/mp4';
                if (actualMimeType === 'video/webm') actualMimeType = 'audio/webm';
                // Если вдруг получили неизвестный или пустой тип — fallback на webm
                const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a'];
                if (!allowedTypes.includes(actualMimeType)) actualMimeType = 'audio/webm';

                const extMap: Record<string, string> = {
                    'audio/webm': 'webm',
                    'audio/ogg': 'ogg',
                    'audio/mp4': 'mp4',
                    'audio/mpeg': 'mp3',
                    'audio/x-m4a': 'm4a',
                };
                const ext = extMap[actualMimeType] ?? 'webm';

                const blob = new Blob(this.audioChunks, { type: actualMimeType });
                const file = new File([blob], `voice.${ext}`, { type: actualMimeType });
                this.props.onRecorded(file);
            }
        };

        this.mediaRecorder.start(100);

        this.recordStartTime = Date.now();
        this.recordTimerId = window.setInterval(this.updateTimer, 1000);
        this.updateTimer();
        this.startVisualizer();
    }

    /**
     * Обновляет текстовое представление таймера записи (MM:SS) в DOM.
     * @private
     */
    private updateTimer = (): void => {
        const timeEl = this.element?.querySelector('[data-component="voice-time"]');
        if (!timeEl) return;

        const diff = Math.floor((Date.now() - this.recordStartTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        timeEl.textContent = `${m}:${s}`;

        if (diff >= 50) {
            timeEl.classList.add('voice-recorder__time--limit');
        } else {
            timeEl.classList.remove('voice-recorder__time--limit');
        }

        if (diff >= 60) {
            this.finishRecording();
        }
    };

    /**
     * Создает бары визуализации звуковой волны и запускает цикл их случайной анимации.
     * @private
     */
    private startVisualizer(): void {
        const visEl = this.element?.querySelector('[data-component="voice-visualizer"]');
        if (!visEl) return;

        visEl.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'voice-recorder__bar';
            visEl.appendChild(bar);
        }

        const updateBars = () => {
            if (!this.isRecording) return;
            const bars = visEl.children;
            for (let i = 0; i < bars.length; i++) {
                const height = 20 + Math.random() * 80;
                (bars[i] as HTMLElement).style.height = `${height}%`;
            }
            this.visualizerTimerId = window.setTimeout(updateBars, 150);
        };
        updateBars();
    }

    /**
     * Обработчик нажатия кнопки отмены записи.
     * Останавливает запись с флагом отмены, вызывая колбэк onCancel.
     * @param {Event} e - Событие клика.
     * @private
     */
    private handleCancel = (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
        this.isCancelled = true;
        this.stopRecording();
        this.props.onCancel();
    };

    /**
     * Завершает запись и инициирует сохранение аудиофайла.
     * Данный метод вызывается из родительских компонентов для принудительного сохранения (например, при клике на Отправить).
     * @public
     */
    public finishRecording(): void {
        this.isCancelled = false;
        this.stopRecording();
    }

    /**
     * Внутренний метод для остановки процессов записи:
     * сброс таймеров, остановка MediaRecorder, освобождение треков стрима микрофона.
     * @private
     */
    private stopRecording(): void {
        this.isRecording = false;

        if (this.recordTimerId !== null) {
            clearInterval(this.recordTimerId);
            this.recordTimerId = null;
        }
        if (this.visualizerTimerId !== null) {
            clearTimeout(this.visualizerTimerId);
            this.visualizerTimerId = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            // Треки стрима останавливаем только ПОСЛЕ того, как MediaRecorder
            // завершит сброс всех данных (onstop срабатывает после последнего ondataavailable)
        } else if (this.recordStream) {
            // Если recorder уже неактивен — освобождаем стрим немедленно
            this.recordStream.getTracks().forEach(track => track.stop());
            this.recordStream = null;
        }
    }

    /**
     * Вызывается перед размонтированием компонента из DOM.
     * Гарантирует остановку записи и освобождение ресурсов микрофона, а также снимает обработчики событий.
     * @protected
     * @override
     */
    protected beforeUnmount(): void {
        this.isCancelled = true;
        this.stopRecording();
        
        const cancelBtn = this.element?.querySelector('[data-component="voice-cancel"]');
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', this.handleCancel);
        }
    }
}
