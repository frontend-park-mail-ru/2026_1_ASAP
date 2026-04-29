import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createChatMenu.hbs';
import { Button } from "../../ui/button/button";
import { replayAnimation } from "../../../core/utils/replayAnimation";


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
    onContact: () => void;
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
    private contactButton: Button | null = null;
    private overlay: HTMLElement | null = null;

    private hoverHandlers: Array<{ el: HTMLElement; enter: () => void; leave: () => void }> = [];

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
            class: "create-chat-menu__add-button",
            onClick: this.props.onCreateDialog,
            icon: "/assets/images/icons/createChatMenuIcons/dialog.svg"
        });
        this.dialogButton.mount(buttonsContainer as HTMLElement);

        this.groupButton = new Button({
            label: "Создать группу",
            class: "create-chat-menu__add-button",
            onClick: this.props.onCreateGroup,
            icon: "/assets/images/icons/createChatMenuIcons/group.svg"

        });
        this.groupButton.mount(buttonsContainer as HTMLElement);

        this.channelButton = new Button({
            label: "Создать канал",
            class: "create-chat-menu__add-button",
            onClick: this.props.onCreateChannel,
            icon: "/assets/images/icons/createChatMenuIcons/channel.svg",
        })
        this.channelButton.mount(buttonsContainer as HTMLElement);

        this.contactButton = new Button({
            label: "Добавить контакт",
            class: "create-chat-menu__add-button",
            onClick: this.props.onContact,
            icon: "/assets/images/icons/createChatMenuIcons/contact.svg"
        });
        this.contactButton.mount(buttonsContainer as HTMLElement);

        [this.dialogButton, this.groupButton, this.channelButton, this.contactButton].forEach(btn => {
            const el = btn?.element;
            const img = el?.querySelector('img') as HTMLImageElement | null;
            if (!el || !img) return;

            const enter = () => replayAnimation(img, 'icon-anim--spring-pop');
            const leave = () => img.classList.remove('icon-anim--spring-pop');

            el.addEventListener('mouseenter', enter);
            el.addEventListener('mouseleave', leave);
            this.hoverHandlers.push({ el, enter, leave });
        });

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
        this.hoverHandlers.forEach(({ el, enter, leave }) => {
            el.removeEventListener('mouseenter', enter);
            el.removeEventListener('mouseleave', leave);
        });
        this.hoverHandlers = [];
        if (!this.element) {
            console.error("createChatMenu: нет эллемента для размонтирования");
            return;
        }
        this.dialogButton.unmount();
        this.groupButton.unmount();
        this.channelButton.unmount();
        this.contactButton?.unmount();
        this.overlay.removeEventListener("click", this.handleOverlayClick);
    }
}