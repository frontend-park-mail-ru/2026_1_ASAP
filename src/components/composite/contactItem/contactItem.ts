import { BaseComponent } from "../../../core/base/baseComponent";
import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import template from "./contactItem.hbs";

/**
 * @interface ContactItemProps
 * @description Свойства для компонента элемента контакта.
 * @extends IBaseFormProps
 * @property {string} [avatarUrl] - URL аватара контакта.
 * @property {string} name - Имя контакта.
 * @property {number} id - Уникальный идентификатор контакта.
 * @property {Function} [onClick] - Колбэк, вызываемый при клике на элемент.
 * @property {BaseComponent} [rightSlot] - Компонент, который будет вставлен в правый слот (например, кнопка или чекбокс).
 */
interface ContactItemProps extends IBaseFormProps {
    avatarUrl?: string;
    name: string;
    id: number;
    onClick?: (item: ContactItem) => void;
    rightSlot?: BaseComponent<any>;
};

/**
 * @class ContactItem
 * @extends BaseForm
 * @description Компонент, представляющий один элемент в списке контактов.
 * Отображает аватар, имя и может содержать дополнительный компонент в правом слоте
 * для различных действий (например, добавление, удаление).
 *
 * @property {Avatar | null} avatar - Компонент аватара контакта.
 */
export class ContactItem extends BaseForm<ContactItemProps> {
    private avatar: Avatar | null = null;

    constructor(props: ContactItemProps) {
        super(props);
    };

    public getTemplate(): (context?: object) => string {
        return template;
    }

    /**
     * Выполняется после монтирования компонента.
     * Инициализирует аватар, добавляет обработчик клика и монтирует
     * компонент в правый слот, если он предоставлен.
     * @protected
     */
    protected afterMount() {
        if (!this.element) return;

        this.avatar = new Avatar({
            src: this.props.avatarUrl,
        });
        this.avatar.mount(this.element.querySelector('[data-component="contact-item-avatar-slot"]')!);

        if (this.props.onClick) {
            this.element?.addEventListener('click', this.handleClick);
        }

        if (this.props.rightSlot) {
            const controlSlot = this.element.querySelector('[data-component="contact-item-control-slot"]');
            if (controlSlot) {
                this.props.rightSlot.mount(controlSlot as HTMLElement);
            }
        }
    };

    /**
     * Обработчик клика по элементу.
     * Вызывает колбэк `onClick`, переданный в свойствах.
     * @private
     */
    private handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick(this);
        }
    };

    /**
     * Выполняется перед размонтированием компонента.
     * Удаляет обработчик клика и размонтирует аватар.
     * @protected
     */
    protected beforeUnmount() {
        if (this.props.onClick) {
            this.element?.removeEventListener('click', this.handleClick);
        }
        this.avatar?.unmount();
    }
};