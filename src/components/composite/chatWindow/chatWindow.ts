import { BaseComponent } from '../../../core/base/baseComponent';
import template from './chatWindow.hbs';

type ChildComponent = BaseComponent<object>;

/**
 * @interface ChatWindowProps - Свойства компонента окна чата.
 * @property {ChildComponent} headerComponent - Компонент для отображения шапки чата.
 * @property {ChildComponent} messageListComponent - Компонент для отображения списка сообщений.
 * @property {ChildComponent} [inputComponent] - Компонент для формы ввода сообщения (не монтируется для каналов-только-чтения).
 */
interface ChatWindowProps {
    headerComponent: ChildComponent;
    messageListComponent: ChildComponent;
    inputComponent?: ChildComponent;
    onFilesDropped?: (files: FileList) => void;
}

/**
 * @class ChatWindow
 * @extends BaseComponent
 * @description Гибкий компонент-контейнер для отображения полноценного окна чата.
 * Он состоит из трех основных частей: шапки, списка сообщений и поля для ввода.
 * Конкретные реализации этих частей передаются через свойства (props),
 * что позволяет использовать этот компонент для разных типов чатов (диалоги, группы, каналы).
 */
export class ChatWindow extends BaseComponent<ChatWindowProps> {

    constructor(props: ChatWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    /**
     * Выполняется после монтирования компонента.
     * Находит в шаблоне слоты для шапки, списка сообщений и поля ввода,
     * а затем монтирует в них соответствующие компоненты, переданные в `props`.
     * @protected
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

        if (this.props.inputComponent) {
            const messageInputSlot = this.element.querySelector('[data-component="message-input-slot"]');
            if (messageInputSlot) {
                this.props.inputComponent.mount(messageInputSlot as HTMLElement);
            } else {
                console.error("ChatWindow: слот для формы ввода сообщения не найден.");
            }
        }

        if (this.props.onFilesDropped) {
            this.element.addEventListener('dragover', this.handleDragOver);
            this.element.addEventListener('dragleave', this.handleDragLeave);
            this.element.addEventListener('drop', this.handleDrop);
        }
    }

    private isFileDrag(event: DragEvent): boolean {
        return !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');
    }

    private readonly handleDragOver = (event: DragEvent): void => {
        if (!this.isFileDrag(event)) return;
        event.preventDefault();
        event.dataTransfer!.dropEffect = 'copy';
        this.element?.classList.add('chat-window--drag-over');
    };

    private readonly handleDragLeave = (event: DragEvent): void => {
        // Снимаем подсветку только когда курсор реально покинул окно чата.
        if (event.relatedTarget && this.element?.contains(event.relatedTarget as Node)) return;
        this.element?.classList.remove('chat-window--drag-over');
    };

    private readonly handleDrop = (event: DragEvent): void => {
        if (!this.isFileDrag(event)) return;
        event.preventDefault();
        this.element?.classList.remove('chat-window--drag-over');
        this.props.onFilesDropped?.(event.dataTransfer!.files);
    };

    /**
     * Выполняется перед размонтированием компонента.
     * Размонтирует все дочерние компоненты (шапку, список сообщений, поле ввода)
     * для очистки ресурсов и предотвращения утечек памяти.
     * @protected
     */
    beforeUnmount() {
        this.element?.removeEventListener('dragover', this.handleDragOver);
        this.element?.removeEventListener('dragleave', this.handleDragLeave);
        this.element?.removeEventListener('drop', this.handleDrop);
        this.props.headerComponent.unmount();
        this.props.messageListComponent.unmount();
        this.props.inputComponent?.unmount();
    }
}
