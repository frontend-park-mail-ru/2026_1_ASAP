import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent.js';

/**
 * @interface ButtonProps - Свойства кнопки.
 * @property {string} [class=''] - CSS-класс.
 * @property {string} [label=''] - Текст кнопки.
 * @property {string} [icon=''] - URL иконки.
 * @property {'button' | 'submit' | 'reset'} [type='button'] - Тип кнопки.
 * @property {Function} [onClick] - Обработчик клика.
 * @property {string} [daughterClass] - Дополнительный класс для дочернего элемента (например, иконки).
 * @property {boolean} [disabled=false] - Состояние активности кнопки.
 */
export interface ButtonProps extends IBaseComponentProps {
    class?: string;
    label?: string;
    icon?: string;
    type?: 'button' | 'submit' | 'reset';
    onClick?: (event: MouseEvent) => void;
    daughterClass?: string;
    disabled?: boolean;
}

/**
 * Компонент кнопки. Поддерживает текстовую метку, иконку и обработчик клика.
 */
export class Button extends BaseComponent<ButtonProps> {
    /**
     * @param {ButtonProps} [props={}] - Свойства кнопки.
     */
    constructor(props: ButtonProps = {}) {
        super(props);
        this.tempName = "components/ui/button/button";

        this.props.class = props.class || "";
        this.props.label = props.label || "";
        this.props.icon = props.icon || "";
        this.props.type = props.type || "button";
        this.props.daughterClass = props.daughterClass;
        this.props.disabled = props.disabled || false;
    }

    /**
     * @override
     */
    protected afterMount(): void {
        if (this.props.onClick) {
            this.element?.addEventListener("click", this.props.onClick as EventListener);
        }
        this.updateDisabledState();
    }

    /**
     * Обновляет состояние disabled кнопки.
     * @param {boolean} isDisabled - Если true, кнопка будет отключена.
     */
    public set disabled(isDisabled: boolean) {
        this.props.disabled = isDisabled;
        this.updateDisabledState();
    }

    /**
     * Получает текущее состояние disabled кнопки.
     * @returns {boolean}
     */
    public get disabled(): boolean {
        return this.props.disabled || false;
    }

    /**
     * Применяет состояние disabled к HTML-элементу.
     */
    private updateDisabledState(): void {
        if (this.element instanceof HTMLButtonElement) {
            this.element.disabled = this.props.disabled || false;
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
        if (this.props.onClick) {
            this.element?.removeEventListener("click", this.props.onClick as EventListener);
        }
    }
}