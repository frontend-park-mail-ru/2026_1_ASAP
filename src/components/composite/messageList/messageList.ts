import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { FrontendMessage, User, Chat, MessageAttachment } from '../../../types/chat';
import { Message } from '../../ui/message/message';
import { MediaViewerOverlay } from '../mediaViewerOverlay/mediaViewerOverlay';
import template from './messageList.hbs';
import { getFullUrl } from '../../../core/utils/url';

/**
 * @interface MessageListProps - Свойства компонента списка сообщений.
 * @property {FrontendMessage[]} messages - Массив сообщений.
 * @property {User} currentUser - Текущий пользователь (для определения isOwn).
 * @property {Chat['type']} chatType - Тип текущего чата. 
 * @property {() => Promise<void>} [onLoadMore] - Колбэк для подгрузки старых сообщений.
*/
interface MessageListProps extends IBaseComponentProps {
    messages: FrontendMessage[];
    currentUser: User;
    chatType: Chat['type'];
    chatAvatarUrl?: string;
    onLoadMore?: () => Promise<void>;
    onRequestEdit?: (messageId: string, currentText: string) => void;
    onRequestDelete?: (messageId: string) => void;
    /** Колбэк для скачивания вложения; реализация на уровне controller */
    onDownloadAttachment?: (url: string, fileName: string) => void | Promise<void>;
    onContactClick?: (userId: number) => void;
}

/**
 * Компонент для отображения списка сообщений в диалоге.
 */
export interface UserUpdatePayload {
    id?: number;
    avatar_url?: string;
    avatarUrl?: string;
    avatar?: string;
}

export class MessageList extends BaseComponent<MessageListProps> {
    private childMessages: Message[] = [];
    private flexContainer: HTMLElement | null = null;
    private emptyStateElement: HTMLElement | null = null;
    private isLoadingMore = false;
    private messages: Map<string, Message> = new Map();
    private currentHighlightQuery = '';
    private selectedMessageEl: HTMLElement | null = null;
    private pinnedToBottom = true;
    private resizeObserver: ResizeObserver | null = null;

    private handleMediaClick = (attachments: MessageAttachment[], initialIndex: number) => {
        const overlay = new MediaViewerOverlay({
            attachments,
            initialIndex,
            onClose: () => {
                overlay.unmount();
            }
        });
        overlay.mount(document.body);
    };

    /**
     * @param {MessageListProps} props - Свойства компонента.
     */
    constructor(props: MessageListProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    /**
     * Обработчик скролла для подгрузки истории.
     * Внешний .message-list — обычный flow (без column-reverse), поэтому
     * scrollTop≈0 = «наверху списка» = пора грузить старые.
     * @private
     */
    private handleScroll = async () => {
        if (!this.element || this.isLoadingMore) return;


        this.pinnedToBottom = this.isNearBottom();

        if (!this.props.onLoadMore) return;
        if (this.element.scrollTop > 40) return;

        this.isLoadingMore = true;
        const heightBefore = this.element.scrollHeight;
        const topBefore = this.element.scrollTop;
        try {
            await this.props.onLoadMore();
            // Сохраняем визуальную позицию: смещаем scrollTop на дельту высоты,
            // иначе пользователя «вышвырнет» в самый верх и подгрузка зациклится.
            if (this.element) {
                const heightAfter = this.element.scrollHeight;
                this.element.scrollTop = topBefore + (heightAfter - heightBefore);
            }
        } finally {
            this.isLoadingMore = false;
        }
    };

    private isNearBottom(): boolean {
        if (!this.element) return false;
        return this.element.scrollHeight - this.element.scrollTop - this.element.clientHeight < 40;
    }

    /**
     * Подвешивает onload/onerror на все ещё не загруженные картинки внутри
     * flex-container. При завершении загрузки — если пользователь всё ещё
     * "приклеен к низу", добивает скролл до конца. Решает проблему "первое
     * открытие чата показывает не самые новые сообщения": к моменту первого
     * scrollToBottom() аватары/стикеры ещё грузятся, scrollHeight растёт уже после.
     */
    private anchorImagesToBottom(): void {
        if (!this.flexContainer) return;
        const imgs = this.flexContainer.querySelectorAll<HTMLImageElement>('img');
        imgs.forEach((img) => {
            if (img.complete && img.naturalWidth > 0) return;
            const onSettle = () => {
                if (this.pinnedToBottom) this.scrollToBottom();
            };
            img.addEventListener('load', onSettle, { once: true });
            img.addEventListener('error', onSettle, { once: true });
        });
    }

    public updateMessage(id: string, text: string): boolean {
        const msg = this.messages.get(id);
        if (!msg) return false;

        msg.updateText(text, true);
        return true;
    }

    public deleteMessage(id: string): boolean {
        const msg = this.messages.get(id);
        if (!msg) return false;

        msg.unmount();
        this.messages.delete(id);
        this.childMessages = this.childMessages.filter(m => m !== msg);

        if (this.childMessages.length === 0) {
            if (this.emptyStateElement) this.emptyStateElement.style.display = 'flex';
            if (this.flexContainer) this.flexContainer.style.display = 'none';
        }

        return true;
    }

    /**
     * Добавляет системное сообщение (центрированный текст без автора/времени).
     * Используется для уведомлений типа «X добавлен в чат» / «X удалён из чата».
     * Эфемерное — не сохраняется в истории, видно только в текущей сессии.
     */
    public addSystemMessage(text: string): void {
        if (!this.element || !this.flexContainer) return;

        if (this.emptyStateElement) this.emptyStateElement.style.display = 'none';
        this.flexContainer.style.display = 'flex';

        const node = document.createElement('div');
        node.className = 'message-system';
        node.textContent = text;
        this.flexContainer.prepend(node);
        this.scrollToBottom();
    }

    public updateUserAvatar(payload: UserUpdatePayload): void {
        if (!this.element || !payload.id) return;

        const avatarUrl = payload.avatar_url || payload.avatarUrl || payload.avatar;
        if (!avatarUrl) return;

        const fullAvatarUrl = getFullUrl(avatarUrl);
        
        // находим все аватарки этого пользователя в DOM списка сообщений
        const avatars = this.element.querySelectorAll(`img[data-user-id="${payload.id}"]`);
        
        avatars.forEach((img: Element) => {
            (img as HTMLImageElement).src = fullAvatarUrl;
        });
    }

    /**
     * @override
     */
    afterMount() {
        if (!this.element) {
            console.error("MessageList: компонент не имеет элемента при afterMount.");
            return;
        }

        this.flexContainer = this.element.querySelector('.message-list__flex-container'); 
        this.emptyStateElement = this.element.querySelector('.message-list__empty-state');

        if (!this.flexContainer) {
            console.error("MessageList: flex-container не найден.");
            return;
        }

        this.element.addEventListener('scroll', this.handleScroll);

        // Список сжимается, когда поднимается мобильная клавиатура. Если юзер
        // был у нижнего края — удерживаем его там же, иначе свежие сообщения
        // уходят под клавиатуру и становятся не видны.
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.pinnedToBottom) this.scrollToBottom();
            });
            this.resizeObserver.observe(this.element);
        }

        this.setMessages(this.props.messages);
        this.scrollToBottom();
    }

    /**
     * Рендерит сообщения в список (полная замена текущих сообщений).
     * @param {FrontendMessage[]} messages - Массив сообщений для отображения.
     */
    public setMessages(messages: FrontendMessage[]): void {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];
        this.messages.clear();

        const showAuthor = this.props.chatType === 'group';

        if (messages.length === 0) {
            if (this.emptyStateElement) this.emptyStateElement.style.display = 'flex';
            if (this.flexContainer) this.flexContainer.style.display = 'none';
        } else {
            if (this.emptyStateElement) this.emptyStateElement.style.display = 'none';
            if (this.flexContainer) this.flexContainer.style.display = 'flex';
        }

        // В column-reverse новые сообщения должны быть первыми в DOM (визуальный низ).
        messages.forEach(msgData => {
            if (msgData.isOwn && this.props.currentUser?.avatarUrl) {
                msgData.sender.avatarUrl = this.props.currentUser.avatarUrl;
            }
            const messageComponent = new Message({
                message: msgData,
                isOwn: msgData.isOwn || false,
                showAuthor: showAuthor,
                chatAvatarUrl: this.props.chatAvatarUrl,
                onEdit: (id) => this.props.onRequestEdit?.(id, msgData.text),
                onDelete: (id) => this.props.onRequestDelete?.(id),
                onDownloadAttachment: this.props.onDownloadAttachment,
                onMediaClick: this.handleMediaClick,
                onContactClick: this.props.onContactClick,
            });
            messageComponent.mount(this.flexContainer!);
            this.messages.set(msgData.id, messageComponent);
            if (messageComponent.element) {
                this.flexContainer!.prepend(messageComponent.element);
            }
            if (this.currentHighlightQuery) messageComponent.applyHighlight(this.currentHighlightQuery);
            this.childMessages.unshift(messageComponent);
        });
        this.pinnedToBottom = true;
        this.scrollToBottom();
        this.anchorImagesToBottom();
    }

    /**
     * Добавляет новые сообщения в начало списка без скачков скролла.
     * @param {FrontendMessage[]} messages - Массив старых сообщений.
     */
    public prependMessages(messages: FrontendMessage[]): void {
        if (!this.element || !this.flexContainer || messages.length === 0) return;

        const fragment = document.createDocumentFragment();
        const newComponents: Message[] = [];

        const showAuthor = this.props.chatType === 'group';

        messages.forEach(msgData => {
            const comp = new Message({
                message: msgData,
                isOwn: msgData.isOwn || false,
                showAuthor,
                chatAvatarUrl: this.props.chatAvatarUrl,
                onEdit: (id) => this.props.onRequestEdit?.(id, msgData.text),
                onDelete: (id) => this.props.onRequestDelete?.(id),
                onDownloadAttachment: this.props.onDownloadAttachment,
                onMediaClick: this.handleMediaClick,
                onContactClick: this.props.onContactClick,
            });
            const tempDiv = document.createElement('div');
            comp.mount(tempDiv);
            this.messages.set(msgData.id, comp)
            if (this.currentHighlightQuery) comp.applyHighlight(this.currentHighlightQuery);
            if (comp.element) fragment.appendChild(comp.element);
            newComponents.push(comp);
        });

        this.flexContainer.appendChild(fragment);
        this.childMessages = [...this.childMessages, ...newComponents];
    }

    /**
     * Добавляет новое сообщение в список и прокручивает вниз.
     * @param {FrontendMessage} newMessage - Новое сообщение.
     */
    public addMessage(newMessage: FrontendMessage): void {
        if (!this.element) {
            console.error("MessageList: контейнер для сообщений не найден при добавлении сообщения.");
            return;
        }

        if (this.emptyStateElement) {
            this.emptyStateElement.style.display = 'none';
        }
        if (this.flexContainer) {
            this.flexContainer.style.display = 'flex';
        }

        const showAuthor = this.props.chatType === 'group';
        if (newMessage.isOwn && this.props.currentUser?.avatarUrl) {
            newMessage.sender.avatarUrl = this.props.currentUser.avatarUrl;
        }
        const messageComponent = new Message({
            message: newMessage,
            isOwn: newMessage.isOwn || false,
            showAuthor: showAuthor,
            chatAvatarUrl: this.props.chatAvatarUrl,
            onEdit: (id) => this.props.onRequestEdit?.(id, newMessage.text),
            onDelete: (id) => this.props.onRequestDelete?.(id),
            onDownloadAttachment: this.props.onDownloadAttachment,
            onMediaClick: this.handleMediaClick,
            onContactClick: this.props.onContactClick,
        });

        const wasAtBottom = this.isNearBottom();

        // Новое сообщение всегда в начало DOM (визуальный низ)
        messageComponent.mount(this.flexContainer!);
        if (this.currentHighlightQuery) messageComponent.applyHighlight(this.currentHighlightQuery);
        this.messages.set(newMessage.id, messageComponent);
        if (messageComponent.element) {
            this.flexContainer!.prepend(messageComponent.element);
        }
        this.childMessages.unshift(messageComponent);

        if (newMessage.isOwn || wasAtBottom) {
            this.pinnedToBottom = true;
            this.scrollToBottom();
            this.anchorImagesToBottom();
        }
    }

    /**
     * Заменяет ID ранее добавленного (оптимистичного) сообщения на ID, присланный сервером.
     * Используется, чтобы при приходе серверного broadcast `message.New` не создавать дубликат DOM.
     * @returns true, если сообщение с `oldId` было найдено и обновлено.
     */
    public getLoadedMessages(): FrontendMessage[] {
        return Array.from(this.messages.values()).map(m => m.props.message);
    }

    public setHighlightQuery(query: string): void {
        this.currentHighlightQuery = query;
        this.childMessages.forEach(m => m.applyHighlight(query));
        if (!query && this.selectedMessageEl) {
            this.selectedMessageEl.classList.remove('message--flash');
            this.selectedMessageEl = null;
        }
    }

    public scrollToMessage(messageId: string): boolean {
        const msg = this.messages.get(messageId);
        if (!msg?.element) return false;

        if (this.selectedMessageEl && this.selectedMessageEl !== msg.element) {
            this.selectedMessageEl.classList.remove('message--flash');
        }
        this.selectedMessageEl = msg.element;
        msg.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        msg.element.classList.add('message--flash');
        return true;
    }

    public replaceMessageId(oldId: string, newId: string, newTimestamp?: Date): boolean {
        const target = this.childMessages.find((m) => m.getId() === oldId);
        if (!target) return false;
        this.messages.delete(oldId);
        target.setId(newId);
        this.messages.set(newId, target);
        if (newTimestamp) target.updateTimestamp(newTimestamp);
        target.setStatus('sent');
        return true;
    }

    public getLatestMessageData(): FrontendMessage | null {
        return this.childMessages[0]?.props.message ?? null;
    }

    /**
     * Отмечает «прочитано» все собственные сообщения с id <= lastReadId.
     * Вызывается из обработчика `message.Read` когда кто-то другой прочитал.
     */
    public markOwnMessagesRead(lastReadId: number): void {
        this.childMessages.forEach(msg => {
            const id = Number(msg.getId());
            if (msg.props.isOwn && !Number.isNaN(id) && id <= lastReadId) {
                msg.setStatus('read');
            }
        });
    }

    public scrollToBottom(): void {
        if (!this.element) return;
        const el = this.element;
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
        });
    }

    /**
     * @override
     */
    beforeUnmount() {
        if (this.element) {
            this.element.removeEventListener('scroll', this.handleScroll);
        }
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];
        this.messages.clear();
    }
}
