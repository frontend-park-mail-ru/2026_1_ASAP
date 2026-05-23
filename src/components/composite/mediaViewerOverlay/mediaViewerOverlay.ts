import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { MessageAttachment } from "../../../types/chat";
import { Button } from "../../ui/button/button";
import template from "./mediaViewerOverlay.hbs";

interface MediaViewerOverlayProps extends IBaseComponentProps {
    attachments: MessageAttachment[];
    initialIndex: number;
    onClose: () => void;
}

/**
 * Компонент для полноэкранного просмотра фото и видео (лайтбокс).
 */
export class MediaViewerOverlay extends BaseComponent<MediaViewerOverlayProps> {
    private currentIndex: number;
    private closeButton: Button | null = null;
    private prevButton: Button | null = null;
    private nextButton: Button | null = null;

    constructor(props: MediaViewerOverlayProps) {
        super(props);
        this.currentIndex = props.initialIndex;
    }

    getTemplate() {
        return template;
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            this.props.onClose();
        } else if (e.key === 'ArrowLeft') {
            this.showPrev();
        } else if (e.key === 'ArrowRight') {
            this.showNext();
        }
    };

    private handleBackdropClick = (e: MouseEvent) => {
        if (e.target === this.element || (e.target as HTMLElement).classList.contains('media-viewer-overlay__content-wrapper')) {
            this.props.onClose();
        }
    };

    private showPrev = () => {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderCurrentMedia();
            this.updateNavButtons();
        }
    };

    private showNext = () => {
        if (this.currentIndex < this.props.attachments.length - 1) {
            this.currentIndex++;
            this.renderCurrentMedia();
            this.updateNavButtons();
        }
    };

    private updateNavButtons() {
        if (!this.element) return;
        const prevEl = this.element.querySelector('.media-viewer-overlay__prev') as HTMLElement;
        const nextEl = this.element.querySelector('.media-viewer-overlay__next') as HTMLElement;
        
        if (prevEl) prevEl.hidden = this.currentIndex === 0;
        if (nextEl) nextEl.hidden = this.currentIndex === this.props.attachments.length - 1;
    }

    private renderCurrentMedia() {
        const container = this.element?.querySelector('.media-viewer-overlay__content-wrapper');
        if (!container) return;

        const attachment = this.props.attachments[this.currentIndex];
        container.innerHTML = '';

        if (attachment.type === 'photo') {
            const img = document.createElement('img');
            img.src = attachment.url || '';
            img.className = 'media-viewer-overlay__media media-viewer-overlay__media--photo';
            img.alt = attachment.fileName || 'Фото';
            img.draggable = false;
            
            img.addEventListener('error', () => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'media-viewer-overlay__error';
                errorDiv.textContent = 'Не удалось загрузить изображение';
                if (container.contains(img)) container.replaceChild(errorDiv, img);
            }, { once: true });

            container.appendChild(img);
        } else if (attachment.type === 'video') {
            const video = document.createElement('video');
            video.src = attachment.url || '';
            video.className = 'media-viewer-overlay__media media-viewer-overlay__media--video';
            video.controls = true;
            video.autoplay = true;

            video.addEventListener('error', () => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'media-viewer-overlay__error';
                errorDiv.textContent = 'Не удалось загрузить видео';
                if (container.contains(video)) container.replaceChild(errorDiv, video);
            }, { once: true });

            container.appendChild(video);
        }
        
        const counter = this.element?.querySelector('.media-viewer-overlay__counter');
        if (counter) {
            if (this.props.attachments.length > 1) {
                counter.textContent = `${this.currentIndex + 1} из ${this.props.attachments.length}`;
            } else {
                counter.textContent = '';
            }
        }
    }

    protected afterMount(): void {
        if (!this.element) return;

        // X-кнопка закрытия
        this.closeButton = new Button({
            icon: "/assets/images/icons/deleteIcon.svg",
            class: "media-viewer-overlay__close-btn",
            onClick: () => this.props.onClose(),
        });
        const closeContainer = this.element.querySelector('.media-viewer-overlay__close-container');
        if (closeContainer) {
            this.closeButton.mount(closeContainer as HTMLElement);
        }

        // Кнопки навигации только если вложений больше 1
        if (this.props.attachments.length > 1) {
            this.prevButton = new Button({
                icon: "/assets/images/icons/backArrow.svg",
                class: "media-viewer-overlay__nav-btn media-viewer-overlay__prev",
                onClick: this.showPrev,
            });
            const prevContainer = this.element.querySelector('.media-viewer-overlay__prev-container');
            if (prevContainer) this.prevButton.mount(prevContainer as HTMLElement);

            this.nextButton = new Button({
                icon: "/assets/images/icons/backArrow.svg",
                class: "media-viewer-overlay__nav-btn media-viewer-overlay__next",
                onClick: this.showNext,
            });
            const nextContainer = this.element.querySelector('.media-viewer-overlay__next-container');
            if (nextContainer) {
                this.nextButton.mount(nextContainer as HTMLElement);
            }
        }

        this.renderCurrentMedia();
        this.updateNavButtons();

        document.addEventListener('keydown', this.handleKeyDown);
        this.element.addEventListener('click', this.handleBackdropClick);
        
        // Фокус для перехвата событий клавиатуры
        this.element.setAttribute('tabindex', '-1');
        this.element.focus();

        // Блокировка прокрутки страницы
        document.body.style.overflow = 'hidden';
    }

    protected beforeUnmount(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.element) {
            this.element.removeEventListener('click', this.handleBackdropClick);
        }
        this.closeButton?.unmount();
        this.prevButton?.unmount();
        this.nextButton?.unmount();

        // Разблокировка прокрутки страницы
        document.body.style.overflow = '';
    }
}
