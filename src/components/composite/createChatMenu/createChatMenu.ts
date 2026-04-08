import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createChatMenu.hbs';
import { Button } from "../../ui/button/button";


/**
 * @interface createChatMenuProps
 * @description Свойства для компонента меню создания чата.
 * @extends IBaseComponentProps
 * @property {Function} onCreateDialog - Колбэк, вызываемый при клике на "Создать диалог".
 * @property {Function} onCreateGroup - Колбэк, вызываемый при клике на "Создать группу".
 * @property {Function} onCreateChannel - Колбэк, вызываемый при клике на "Создать канал".
 * @property {Function} onClose - Колбэк для закрытия меню.
 */
interface createChatMenuProps extends IBaseComponentProps {
    onCreateDialog: () => void;
    onCreateGroup: () => void;
    onCreateChannel: () => void; // пока не используется
    onClose: () => void;
}

/**
 * @class CreateChatMenu
 * @extends BaseComponent
 * @description Компонент, представляющий собой модальное меню для создания
 * различных типов чатов: диалога, группы или канала.
 *
 * @property {Button | null} dialogButton - Кнопка "Создать диалог".
 * @property {Button | null} groupButton - Кнопка "Создать группу".
 * @property {Button | null} channelButton - Кнопка "Создать канал".
 * @property {HTMLElement | null} overlay - Оверлей для закрытия меню по клику вне его.
 */
export class CreateChatMenu extends BaseComponent<createChatMenuProps> {
    private dialogButton: Button | null = null;
    private groupButton: Button | null = null
    private channelButton: Button | null = null;
    private overlay: HTMLElement | null = null;
    
    /**
     * Обработчик клика по оверлею, вызывает закрытие меню.
     * @private
     */
    private handleOverlayClick = () => {
        this.props.onClose();
    }

    constructor (props: createChatMenuProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    /**
     * Выполняется после монтирования компонента.
     * Инициализирует и монтирует кнопки для создания чатов
     * и добавляет обработчик клика на оверлей для закрытия.
     * @protected
     */
    protected afterMount(): void {
        if (!this.element) {
            console.error("createChatMenu: нет эллемента для монтирования");
            return;
        }
        const buttonsContainer = this.element.querySelector('[data-component="create-chat__button-container"]');


        this.dialogButton = new Button({
            label: "Создать диалог",
            class: "ui-button create-chat-menu__add-button",
            onClick: this.props.onCreateDialog,
            icon: "/assets/images/icons/createChatMenuIcons/dialog.svg"
        });
        this.dialogButton.mount(buttonsContainer as HTMLElement);

        this.groupButton = new Button({
            label: "Создать группу",
            class: "ui-button create-chat-menu__add-button",
            onClick: this.props.onCreateGroup,
            icon: "/assets/images/icons/createChatMenuIcons/group.svg"

        });
        this.groupButton.mount(buttonsContainer as HTMLElement);

        this.channelButton = new Button({
            label: "Создать канал",
            class: "ui-button create-chat-menu__add-button",
            onClick: this.props.onCreateChannel,
            icon: "/assets/images/icons/createChatMenuIcons/channel.svg",   
            disabled: true // пока не используется
        })
        this.channelButton.mount(buttonsContainer as HTMLElement);

        this.overlay = this.element.querySelector('[data-component="create-chat-overlay"]')
        this.overlay.addEventListener("click", this.handleOverlayClick);
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Размонтирует все дочерние кнопки и удаляет обработчик с оверлея.
     * @protected
     */
    protected beforeUnmount(): void { 
        super.beforeUnmount();
        if (!this.element) {
            console.error("createChatMenu: нет эллемента для размонтирования");
            return;
        }
        this.dialogButton.unmount();
        this.groupButton.unmount();
        this.channelButton.unmount();
        this.overlay.removeEventListener("click", this.handleOverlayClick);
    }
}