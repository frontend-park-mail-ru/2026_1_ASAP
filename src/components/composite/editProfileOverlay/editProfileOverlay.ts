import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { PROFILE_BIO_MAX_LENGTH, validationService } from "../../../services/validationService";
import {
    birthDateDigitsOnly,
    formatBirthDateMaskFromDigits,
    initialBirthDateMask,
} from "../../../utils/birthDateInput";
import { sanitizeBioText } from "../../../utils/sanitizeBioText";
import { Button } from "../../ui/button/button";
import { Input } from "../../ui/input/input";
import template from "./editProfileOverlay.hbs";

interface EditProfileOverlayProps extends IBaseComponentProps {
    fieldKey: "login" | "email" | "birthDate" | "bio";
    value?: string;
    inputType: "text" | "email" | "date" | "textarea";
    onSave: (newValue: string) => void;
    onClose: () => void;
}

export class EditProfileOverlay extends BaseComponent<EditProfileOverlayProps> {
    private saveButton: Button | null = null;
    private closeButton: Button | null = null;
    private editInput: Input | null = null;
    private birthDateInputEl: HTMLInputElement | null = null;
    private overlay: HTMLElement | null = null;
    private validationErrorEl: HTMLParagraphElement | null = null;
    private boundContainerInput: (() => void) | null = null;
    private bioCharCountEl: HTMLSpanElement | null = null;

    constructor(props: EditProfileOverlayProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    private readonly onBirthDateInputBound = (e: Event) => {
        const el = e.target as HTMLInputElement;
        const digits = birthDateDigitsOnly(el.value);
        el.value = formatBirthDateMaskFromDigits(digits);
        this.clearValidationError();
    };

    private readonly onBirthDateKeydownBound = (e: KeyboardEvent) => {
        const nav = [
            "Backspace",
            "Delete",
            "Tab",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
        ];
        if (nav.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    private getEditTitle(): string {
        switch (this.props.fieldKey) {
            case "login":
                return "Редактирование логина";
            case "email":
                return "Редактирование почты";
            case "birthDate":
                return "Редактирование даты рождения";
            case "bio":
                return "Редактирование «О себе»";
            default:
                return "Редактирование";
        }
    }

    private validateField(raw: string): { ok: true; value: string } | { ok: false; message: string } {
        const value = raw ?? "";
        switch (this.props.fieldKey) {
            case "login": {
                const r = validationService.validateLogin(value.trim());
                return r.isValid ? { ok: true as const, value: value.trim() } : { ok: false as const, message: r.message };
            }
            case "email": {
                const r = validationService.validateEmail(value.trim());
                return r.isValid ? { ok: true as const, value: value.trim() } : { ok: false as const, message: r.message };
            }
            case "birthDate": {
                const r = validationService.validateBirthDate(value);
                return r.isValid ? { ok: true as const, value: value.trim() } : { ok: false as const, message: r.message };
            }
            case "bio": {
                const cleaned = sanitizeBioText(value).trim();
                const r = validationService.validateBio(cleaned);
                return r.isValid ? { ok: true as const, value: cleaned } : { ok: false as const, message: r.message };
            }
            default:
                return { ok: true as const, value };
        }
    }

    private showValidationError(message: string): void {
        if (!this.validationErrorEl) return;
        this.validationErrorEl.textContent = message;
        this.validationErrorEl.hidden = false;
    }

    private clearValidationError(): void {
        if (!this.validationErrorEl) return;
        this.validationErrorEl.textContent = "";
        this.validationErrorEl.hidden = true;
    }

    protected afterMount(): void {
        const container = this.element!.querySelector(".edit-profile__edit-container") as HTMLElement | null;
        if (!container) return;

        this.closeButton = new Button({
            icon: "/assets/images/icons/deleteIcon.svg",
            class: "edit-profile__close-btn",
            onClick: () => this.props.onClose(),
        });
        this.closeButton.mount(container);

        const titleEl = container.querySelector(".edit-title");
        if (titleEl) {
            titleEl.textContent = this.getEditTitle();
        }

        let inputParent: HTMLElement = container;
        if (this.props.fieldKey === "bio") {
            const bioBlock = document.createElement("div");
            bioBlock.className = "edit-profile__bio-block";
            const counterRow = document.createElement("div");
            counterRow.className = "edit-profile__bio-counter-row";
            this.bioCharCountEl = document.createElement("span");
            this.bioCharCountEl.className = "edit-profile__char-count";
            counterRow.appendChild(this.bioCharCountEl);
            bioBlock.appendChild(counterRow);
            container.style.minWidth = "480px";
            container.appendChild(bioBlock);
            inputParent = bioBlock;
        }

        if (this.props.fieldKey === "birthDate") {
            const wrap = document.createElement("div");
            wrap.className = "edit-profile__birth-date-field";
            const hint = document.createElement("p");
            hint.className = "edit-profile__birth-date-hint";
            hint.textContent = "Вводите только цифры; точки расставляются сами (ДД.ММ.ГГГГ)";
            const input = document.createElement("input");
            input.type = "text";
            input.className = "edit-profile__birth-date-input";
            input.name = "edit-birth-date";
            input.setAttribute("inputmode", "numeric");
            input.setAttribute("autocomplete", "bday");
            input.setAttribute("spellcheck", "false");
            input.setAttribute("aria-label", "Дата рождения, формат день месяц год");
            input.maxLength = 10;
            input.value = initialBirthDateMask(this.props.value);
            input.addEventListener("input", this.onBirthDateInputBound);
            input.addEventListener("keydown", this.onBirthDateKeydownBound);
            wrap.appendChild(hint);
            wrap.appendChild(input);
            inputParent.appendChild(wrap);
            this.birthDateInputEl = input;
        } else {
            this.editInput = new Input({
                value: this.props.value,
                type: this.props.inputType,
                class: "edit-profile__edit-input",
                name: "edit-field",
                placeholder: "",
                ...(this.props.fieldKey === "bio"
                    ? { maxLength: PROFILE_BIO_MAX_LENGTH }
                    : {}),
            });
            this.editInput.mount(inputParent);
            this.editInput.element.style.height = "270px";
        }

        const updateBioCharCount = () => {
            if (!this.bioCharCountEl) return;
            const n = sanitizeBioText(this.editInput?.value ?? "").trim().length;
            this.bioCharCountEl.textContent = `${n} / ${PROFILE_BIO_MAX_LENGTH}`;
        };

        this.validationErrorEl = document.createElement("p");
        this.validationErrorEl.className = "edit-profile__validation-error";
        this.validationErrorEl.setAttribute("role", "alert");
        this.validationErrorEl.hidden = true;
        container.appendChild(this.validationErrorEl);

        this.boundContainerInput = () => {
            this.clearValidationError();
            updateBioCharCount();
        };
        container.addEventListener("input", this.boundContainerInput);
        updateBioCharCount();

        this.saveButton = new Button({
            type: "button",
            onClick: () => {
                const raw =
                    this.props.fieldKey === "birthDate"
                        ? (this.birthDateInputEl?.value ?? "").trim()
                        : (this.editInput?.value ?? "");
                const check = this.validateField(raw);
                if (check.ok === false) {
                    this.showValidationError(check.message);
                    return;
                }
                this.clearValidationError();
                this.props.onSave(check.value);
            },
            class: "save-field-button",
            label: "Сохранить",
        });
        this.saveButton.mount(container);

        this.overlay = this.element!.querySelector(".edit-profile__overlay");
        this.overlay?.addEventListener("click", this.props.onClose);
    }

    protected beforeUnmount(): void {
        const container = this.element?.querySelector(".edit-profile__edit-container") as HTMLElement | null;
        if (container && this.boundContainerInput) {
            container.removeEventListener("input", this.boundContainerInput);
        }
        this.boundContainerInput = null;
        this.bioCharCountEl = null;
        if (this.birthDateInputEl) {
            this.birthDateInputEl.removeEventListener("input", this.onBirthDateInputBound);
            this.birthDateInputEl.removeEventListener("keydown", this.onBirthDateKeydownBound);
            this.birthDateInputEl = null;
        }
        this.editInput?.unmount();
        this.closeButton?.unmount();
        this.saveButton?.unmount();
        this.overlay?.removeEventListener("click", this.props.onClose);
    }
}
