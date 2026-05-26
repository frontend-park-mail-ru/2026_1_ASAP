import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { MessageAttachment } from "../../../types/chat";
import { Button } from "../../ui/button/button";
import template from "./mediaViewerOverlay.hbs";

interface MediaViewerOverlayProps extends IBaseComponentProps {
    attachments: MessageAttachment[];
    initialIndex: number;
    onClose: () => void;
    /** Подписчик ли пользователь — нужно для NSFW-блюра. */
    isPremium?: boolean;
    /** Общий Set разблюренных вложений (тот же, что в messageList). */
    revealedAttachments?: Set<string>;
    /** Префикс ключа разблюра (messageId), чтобы совпадал с messageList. */
    revealKeyPrefix?: string;
    /** Клик по CTA подписки на заблюренном вложении (без подписки). */
    onPremiumRequired?: () => void;
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

    private blurKey(index: number): string {
        return `${this.props.revealKeyPrefix ?? ''}:${index}`;
    }

    private isAttachmentBlurred(index: number): boolean {
        const attachment = this.props.attachments[index];
        if (!attachment.isBlur) return false;
        return !this.props.revealedAttachments?.has(this.blurKey(index));
    }

    /** Навешивает NSFW-блюр на текущее медиа во вьюере (если не разблюрено). */
    private applyBlurGate(container: Element, media: HTMLElement, index: number): void {
        if (!this.isAttachmentBlurred(index)) return;

        const isPremium = this.props.isPremium ?? false;
        media.classList.add('media-viewer-overlay__media--blurred');

        const overlay = document.createElement('div');
        overlay.className = 'media-viewer-overlay__blur';
        overlay.setAttribute('role', 'button');
        overlay.setAttribute('tabindex', '0');

        const label = document.createElement('span');
        label.className = 'media-viewer-overlay__blur-label';
        label.textContent = isPremium
            ? 'Чрезвычайно милый контент. Нажмите, чтобы показать'
            : 'Доступно с подпиской ImPulse';
        overlay.appendChild(label);
        overlay.setAttribute('aria-label', label.textContent);

        const activate = (e: Event): void => {
            e.stopPropagation();
            e.preventDefault();
            if (isPremium) {
                this.props.revealedAttachments?.add(this.blurKey(index));
                media.classList.remove('media-viewer-overlay__media--blurred');
                if (container.contains(overlay)) overlay.remove();
            } else {
                this.props.onPremiumRequired?.();
            }
        };

        overlay.addEventListener('click', activate);
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') activate(e);
        });

        container.appendChild(overlay);
    }

    private renderCurrentMedia() {
        const container = this.element?.querySelector('.media-viewer-overlay__content-wrapper');
        if (!container) return;

        const attachment = this.props.attachments[this.currentIndex];
        container.innerHTML = '';

        if (attachment.type === 'photo') {
            const loader = document.createElement('div');
            loader.className = 'media-viewer-overlay__spinner';
            container.appendChild(loader);

            const img = document.createElement('img');
            img.className = 'media-viewer-overlay__media media-viewer-overlay__media--photo media-viewer-overlay__media--loading';
            img.src = attachment.url || '';
            img.alt = attachment.fileName || 'Фото';
            img.draggable = false;
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';

            img.addEventListener('load', () => {
                img.classList.remove('media-viewer-overlay__media--loading');
                img.style.opacity = '1';
                loader.remove();
            }, { once: true });
            
            img.addEventListener('error', () => {
                img.classList.remove('media-viewer-overlay__media--loading');
                img.style.opacity = '1';
                loader.remove();
                const errorDiv = document.createElement('div');
                errorDiv.className = 'media-viewer-overlay__error';
                errorDiv.textContent = 'Не удалось загрузить изображение';
                if (container.contains(img)) container.replaceChild(errorDiv, img);
            }, { once: true });

            container.appendChild(img);
            this.applyBlurGate(container, img, this.currentIndex);
        } else if (attachment.type === 'video') {
            const loader = document.createElement('div');
            loader.className = 'media-viewer-overlay__spinner';
            container.appendChild(loader);

            const video = document.createElement('video');
            video.className = 'media-viewer-overlay__media media-viewer-overlay__media--video media-viewer-overlay__media--loading';
            video.src = attachment.url || '';
            video.controls = true;
            video.autoplay = true;
            video.style.opacity = '0';
            video.style.transition = 'opacity 0.3s ease';

            video.addEventListener('loadeddata', () => {
                video.classList.remove('media-viewer-overlay__media--loading');
                video.style.opacity = '1';
                loader.remove();
            }, { once: true });

            video.addEventListener('error', () => {
                video.classList.remove('media-viewer-overlay__media--loading');
                video.style.opacity = '1';
                loader.remove();
                const errorDiv = document.createElement('div');
                errorDiv.className = 'media-viewer-overlay__error';
                errorDiv.textContent = 'Не удалось загрузить видео';
                if (container.contains(video)) container.replaceChild(errorDiv, video);
            }, { once: true });

            container.appendChild(video);
            this.applyBlurGate(container, video, this.currentIndex);
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
