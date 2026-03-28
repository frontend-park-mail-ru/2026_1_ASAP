import { BaseComponent } from '../../../core/base/baseComponent';
import { BaseComponent as AnyComponent } from '../../../core/base/baseComponent';
import template from './chatWindow.hbs';

/**
 * @interface ChatWindowProps - Свойства компонента окна чата.
 * @property {AnyComponent} headerComponent - Компонент для отображения шапки чата.
 * @property {AnyComponent} messageListComponent - Компонент для отображения списка сообщений.
 * @property {AnyComponent} inputComponent - Компонент для формы ввода сообщения.
 */
interface ChatWindowProps {
    headerComponent: AnyComponent;
    messageListComponent: AnyComponent;
    inputComponent: AnyComponent;
}

/**
 * Гибкий компонент-контейнер для отображения окна чата,
 * состоящий из шапки, списка сообщений и формы ввода.
 */
export class ChatWindow extends BaseComponent {
    /**
     * @param {ChatWindowProps} props - Свойства компонента.
     */
    constructor(props: ChatWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    /**
     * @override
     */
    protected afterMount(): void {
        if (!this.element) {
            console.error("ChatWindow: элемент не найден для монтирования.");
            return;
        }

        const headerSlot = this.element.querySelector('[data-component="chat-header-slot"]');
        if (headerSlot) {
            this.props.headerComponent.mount(headerSlot as HTMLElement);
        } else {
            console.error("ChatWindow: хедер чата не найдена.");
        }

        const messageListSlot = this.element.querySelector('[data-component="message-list-slot"]');
        if (messageListSlot) {
            this.props.messageListComponent.mount(messageListSlot as HTMLElement);
        } else {
            console.error("ChatWindow: слот для списка сообщений не найден.");
        }

        const messageInputSlot = this.element.querySelector('[data-component="message-input-slot"]');
        if (messageInputSlot) {
            this.props.inputComponent.mount(messageInputSlot as HTMLElement);
        } else {
            console.error("ChatWindow: слот для формы ввода сообщения не найден.");
        }
    }

    /**
     * @override
     */
    beforeUnmount() {
        this.props.headerComponent.unmount();
        this.props.messageListComponent.unmount();
        this.props.inputComponent.unmount();
    }
}