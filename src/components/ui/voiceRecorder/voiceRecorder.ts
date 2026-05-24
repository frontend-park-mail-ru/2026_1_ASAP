import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './voiceRecorder.hbs';

export interface VoiceRecorderProps extends IBaseComponentProps {
    onRecorded: (file: File) => void;
    onCancel: () => void;
    onError: (msg: string) => void;
}

export class VoiceRecorder extends BaseComponent<VoiceRecorderProps> {
    private mediaRecorder: MediaRecorder | null = null;
    private recordStream: MediaStream | null = null;
    private audioChunks: Blob[] = [];
    
    private recordStartTime = 0;
    private recordTimerId: number | null = null;
    private visualizerTimerId: number | null = null;
    private isRecording = false;
    private isCancelled = false;

    constructor(props: VoiceRecorderProps) {
        super(props);
    }

    getTemplate(): (context?: object) => string {
        return template;
    }

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

    private startRecording(stream: MediaStream): void {
        this.recordStream = stream;
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
        this.isRecording = true;
        this.isCancelled = false;

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
            if (!this.isCancelled && this.audioChunks.length > 0) {
                const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                const blob = new Blob(this.audioChunks, { type: mimeType });
                let ext = 'webm';
                if (mimeType.includes('mp4')) ext = 'mp4';
                const file = new File([blob], `voice.${ext}`, { type: mimeType });
                this.props.onRecorded(file);
            }
        };

        this.mediaRecorder.start(100);

        this.recordStartTime = Date.now();
        this.recordTimerId = window.setInterval(this.updateTimer, 1000);
        this.updateTimer();
        this.startVisualizer();
    }

    private updateTimer = (): void => {
        const timeEl = this.element?.querySelector('[data-component="voice-time"]');
        if (!timeEl) return;

        const diff = Math.floor((Date.now() - this.recordStartTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        timeEl.textContent = `${m}:${s}`;
    };

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

    private handleCancel = (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
        this.isCancelled = true;
        this.stopRecording();
        this.props.onCancel();
    };

    /**
     * Вызывается извне (MessageInput), когда нужно успешно завершить запись.
     */
    public finishRecording(): void {
        this.isCancelled = false;
        this.stopRecording();
    }

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
        }

        if (this.recordStream) {
            this.recordStream.getTracks().forEach(track => track.stop());
            this.recordStream = null;
        }
    }

    protected beforeUnmount(): void {
        this.isCancelled = true;
        this.stopRecording();
        
        const cancelBtn = this.element?.querySelector('[data-component="voice-cancel"]');
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', this.handleCancel);
        }
    }
}
