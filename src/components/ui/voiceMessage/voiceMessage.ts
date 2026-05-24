import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './voiceMessage.hbs';

export interface VoiceMessageProps extends IBaseComponentProps {
    url?: string;
}

export class VoiceMessage extends BaseComponent<VoiceMessageProps> {
    private static currentPlayingAudio: HTMLAudioElement | null = null;
    private static currentPlayingIcon: HTMLImageElement | null = null;

    private audio: HTMLAudioElement | null = null;
    private playBtn: HTMLButtonElement | null = null;
    private playIcon: HTMLImageElement | null = null;
    private visualizer: HTMLElement | null = null;
    private durationStr: HTMLElement | null = null;

    constructor(props: VoiceMessageProps) {
        super(props);
    }

    getTemplate(): (context?: object) => string {
        return template;
    }

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

    private formatTime(time: number): string {
        if (isNaN(time) || !isFinite(time)) return '00:00';
        const m = Math.floor(time / 60).toString().padStart(2, '0');
        const s = Math.floor(time % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

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

    private handleLoadedMetadata = (): void => {
        if (!this.audio || !this.durationStr) return;
        this.durationStr.textContent = this.formatTime(this.audio.duration);
    };

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
