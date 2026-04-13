import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from "./checkbox.hbs";

export interface CheckboxProps extends IBaseComponentProps {
    label?: string;
    name?: string;
    checked?: boolean;
    onChange?: (isChecked: boolean) => void;
}

/**
 * Компонент чекбокса.
 */
export class Checkbox extends BaseComponent<CheckboxProps> {

    /**
     * @param {object} [props={}] - Свойства.
     * @param {string} [props.label=''] - Текст метки.
     * @param {string} [props.name=''] - Имя для FormData.
     * @param {boolean} [props.checked=false] - Начальное состояние.
     */
    constructor(props: CheckboxProps) {
        super(props);
        this.props.label = props.label || "";
        this.props.name = props.name || "";
        this.props.checked = props.checked || false;
    }
      
    getTemplate() {
        return template;
    }

    private inputElement: HTMLInputElement | null = null;
    private onChangeHandler: ((e: Event) => void) | null = null;

    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    protected afterMount() {
        if (!this.element) {
            console.error("Checkbox: компонент не имеет элемента при afterMount.");
            return;
        }
        this.inputElement = this.element.querySelector('.ui-checkbox__input');
        this.onChangeHandler = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (this.props.onChange) {
                this.props.onChange(target.checked);
            }
        };
        this.inputElement.addEventListener("change", this.onChangeHandler);
    }


    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    protected beforeUnmount(): void {
        if (this.inputElement && this.onChangeHandler) {
            this.inputElement.removeEventListener("change", this.onChangeHandler);
        }
    }

    /**
     * Текущее состояние чекбокса.
     * @type {boolean}
     */
    public get value(): boolean {
        const input = this.inputElement;
        return input ? input.checked : false;
    }
}