import { ConfirmModal } from "../../components/composite/confirmModal/confirmModal";
import type { BaseComponent } from "../../core/base/baseComponent";

export interface ChatsViewMobileState {
    activeChatId: string | null;
    hasCreateWindow: boolean;
    hasGroupDetailsWindow: boolean;
    hasChannelDetailsWindow: boolean;
    hasAddMemberWindow: boolean;
}

export interface NotificationPromptHandlers {
    onAllow: () => void | Promise<void>;
    onDismiss: () => void | Promise<void>;
}

export class ChatsView {
    public readonly sidebarElement: HTMLElement | null;
    public readonly mainContentArea: HTMLElement | null;
    private readonly placeholderElement: HTMLElement | null;
    private modalComponent: ConfirmModal | null = null;
    private notificationBannerEl: HTMLElement | null = null;

    constructor(private readonly rootElement: HTMLElement) {
        this.sidebarElement = rootElement.querySelector('.chat-page__sidebar');
        this.mainContentArea = rootElement.querySelector('.chat-page__mainfield');
        this.placeholderElement = this.mainContentArea?.querySelector('.empty-field') || null;
    }

    public showPlaceholder(): void {
        if (this.placeholderElement) {
            this.placeholderElement.style.display = 'block';
        }
    }

    public hidePlaceholder(): void {
        if (this.placeholderElement) {
            this.placeholderElement.style.display = 'none';
        }
    }

    public hasMainContentArea(): boolean {
        return this.mainContentArea !== null;
    }

    public mountInMain(component: BaseComponent): boolean {
        if (!this.mainContentArea) return false;
        component.mount(this.mainContentArea);
        return true;
    }

    public mountInRoot(component: BaseComponent): void {
        component.mount(this.rootElement);
    }

    public syncMobileLayoutState(state: ChatsViewMobileState): void {
        const pageRoot = this.rootElement.classList.contains('chat-page')
            ? this.rootElement
            : this.rootElement.querySelector('.chat-page');
        if (!pageRoot) return;

        const mainVisible =
            state.activeChatId !== null ||
            state.hasCreateWindow ||
            state.hasGroupDetailsWindow ||
            state.hasChannelDetailsWindow ||
            state.hasAddMemberWindow;

        const mobileFloatingBackVisible =
            state.activeChatId !== null &&
            !state.hasCreateWindow &&
            !state.hasGroupDetailsWindow &&
            !state.hasChannelDetailsWindow &&
            !state.hasAddMemberWindow;

        pageRoot.classList.toggle('chat-page--main-visible', mainVisible);
        pageRoot.classList.toggle('chat-page--mobile-floating-back', mobileFloatingBackVisible);
    }

    public showAlert(text: string, onConfirm?: () => void): void {
        this.closeModal();
        this.modalComponent = new ConfirmModal({
            text,
            confirmButtonText: "Ок",
            hideCancel: true,
            confirmButtonClass: "confirm-modal__button--submit ui-button",
            onConfirm: () => {
                this.closeModal();
                onConfirm?.();
            },
        });
        this.modalComponent.mount(document.body);
    }

    public closeModal(): void {
        if (this.modalComponent) {
            this.modalComponent.unmount();
            this.modalComponent = null;
        }
    }

    public showNotificationPrompt(handlers: NotificationPromptHandlers): void {
        this.hideNotificationPrompt();

        const banner = document.createElement('div');
        banner.className = 'notification-prompt';
        banner.innerHTML = `
            <div class="notification-prompt__icon">&#128276;</div>
            <div class="notification-prompt__body">
                <div class="notification-prompt__title">Получать уведомления?</div>
                <div class="notification-prompt__text">Чтобы не пропустить новые сообщения, пока вы в другой вкладке.</div>
            </div>
            <div class="notification-prompt__actions">
                <button type="button" class="notification-prompt__btn notification-prompt__btn--primary" data-action="allow">Включить</button>
                <button type="button" class="notification-prompt__btn" data-action="dismiss">Не сейчас</button>
            </div>
        `;

        banner.addEventListener('click', async (event) => {
            const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.notification-prompt__btn');
            if (!btn) return;

            if (btn.dataset.action === 'allow') {
                await handlers.onAllow();
            } else {
                await handlers.onDismiss();
            }
            this.hideNotificationPrompt();
        });

        document.body.appendChild(banner);
        this.notificationBannerEl = banner;
    }

    public hideNotificationPrompt(): void {
        this.notificationBannerEl?.remove();
        this.notificationBannerEl = null;
    }

    public destroy(): void {
        this.closeModal();
        this.hideNotificationPrompt();
    }
}
