import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from './confirmModal.hbs';

/**
 * @interface ConfirmModalProps
 * @description Пропсы для универсального модального окна подтверждения.
 * @property {string} text - Текст вопроса/предупреждения.
 * @property {string} confirmButtonText - Текст кнопки подтверждения (красная).
 * @property {Function} onConfirm - Коллбэк при подтверждении действия.
 * @property {Function} [onCancel] - Коллбэк при отмене (закрытии модалки).
 * @property {boolean} [hideCancel] - Не показывать кнопку отмены (клик по оверлею всё равно вызывает onCancel, если передан).
 */
interface ConfirmModalProps extends IBaseComponentProps {
    text: string;
    confirmButtonText: string;
    cancelButtonText?: string;
    onConfirm(): void;
    onCancel?(): void;
    hideCancel?: boolean;
    confirmButtonClass?: string;
}

/**
 * @class ConfirmModal
 * @extends BaseComponent
 * @description Универсальный компонент модального окна подтверждения.
 * Переиспользуется для любых подтверждений: удаление чата, выход из группы,
 * исключение участника и т.д. Принимает текст и текст кнопки через пропсы.
 */
export class ConfirmModal extends BaseComponent<ConfirmModalProps> {
    private cancelButton: Button | null = null;
    private confirmButton: Button | null = null;
    private closeButton: Button | null = null;

    constructor(props: ConfirmModalProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("confirmModal: нет элемента для монтирования");
            return;
        }

        const overlay = this.element.querySelector('[data-component="confirm-modal-overlay"]');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.props.onCancel?.();
            });
        }

        document.addEventListener('keydown', this.handleKeyDown);

        const mainContainer = this.element.querySelector('[data-component="confirm-modal__container"]');
        if (!mainContainer) return;

        this.closeButton = new Button({
            icon: "/assets/images/icons/deleteIcon.svg",
            class: "confirm-modal__close-btn",
            onClick: () => this.props.onCancel?.(),
        });
        this.closeButton.mount(mainContainer as HTMLElement);

        const textContainer = mainContainer.querySelector('[data-component="confirm-modal-info-container"]');
        if (textContainer) {
            textContainer.textContent = this.props.text;
        }

        const buttonsContainer = mainContainer.querySelector('[data-component="confirm-modal-buttons-container"]');
        if (!buttonsContainer) return;

        if (!this.props.hideCancel) {
            this.cancelButton = new Button({
                label: this.props.cancelButtonText ?? "Отмена",
                class: "confirm-modal__button--cancel ui-button ui-button__secondary2",
                onClick: () => {
                    this.props.onCancel?.();
                },
            });
            this.cancelButton.mount(buttonsContainer as HTMLElement);
        }

        this.confirmButton = new Button({
            label: this.props.confirmButtonText,
            class: this.props.confirmButtonClass || "confirm-modal__button--submit ui-button",
            onClick: () => {
                this.props.onConfirm();
            },
        });
        this.confirmButton.mount(buttonsContainer as HTMLElement);
    }

    /**
     * Обработчик нажатия клавиш.
     * @param {KeyboardEvent} event - Событие клавиатуры.
     * @private
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            this.props.onCancel?.();
        }
    };

    protected beforeUnmount(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.closeButton?.unmount();
        this.cancelButton?.unmount();
        this.confirmButton?.unmount();
    }
}