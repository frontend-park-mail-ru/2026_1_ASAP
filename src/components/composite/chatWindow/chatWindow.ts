import { BaseComponent } from '../../../core/base/baseComponent.js';
import { BaseComponent as AnyComponent } from '../../../core/base/baseComponent.js';

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
        this.tempName = 'components/composite/chatWindow/chatWindow';
    }

    /**
     * @override
     */
    afterMount() {
        if (!this.element) {
            console.error("ChatWindow: компонент не имеет элемента при afterMount.");
            return;
        }
        this.props.headerComponent.mount(this.element.querySelector('[data-component="chat-header-slot"]'));
        this.props.messageListComponent.mount(this.element.querySelector('[data-component="message-list-slot"]'));
        this.props.inputComponent.mount(this.element.querySelector('[data-component="message-input-slot"]'));
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