import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import { Input } from "../../ui/input/input";
import { supportService, ComplaintType } from "../../../services/supportService";
import template from "./supportNewTab.hbs";

interface SupportNewTabProps extends IBaseComponentProps {}

type SupportIssueType = ComplaintType;

export class SupportNewTab extends BaseComponent<SupportNewTabProps> {
    private issueType: SupportIssueType = "bug";

    private nameInput: Input | null = null;
    private emailInput: Input | null = null;
    private textInput: Input | null = null;
    private filesInput: Input | null = null;
    private confirmButton: Button | null = null;

    private bugTypeButton: Button | null = null;
    private suggestionTypeButton: Button | null = null;
    private complaintTypeButton: Button | null = null;

    constructor(props: SupportNewTabProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const typeContainer = this.element.querySelector(".support-new-tab__issue-type-buttons") as HTMLElement;

        this.bugTypeButton = new Button({
            class: "support-overlay__issue-type-btn",
            label: "Баг",
            type: "button",
            onClick: () => this.setIssueType("bug")
        });
        this.suggestionTypeButton = new Button({
            class: "support-overlay__issue-type-btn",
            label: "Предложение",
            type: "button",
            onClick: () => this.setIssueType("suggestion")
        });
        this.complaintTypeButton = new Button({
            class: "support-overlay__issue-type-btn",
            label: "Жалоба",
            type: "button",
            onClick: () => this.setIssueType("complaint")
        });
        this.bugTypeButton.mount(typeContainer);
        this.suggestionTypeButton.mount(typeContainer);
        this.complaintTypeButton.mount(typeContainer);
        this.setIssueType("bug");

        this.nameInput = new Input({
            class: "support-overlay__input",
            name: "support_name",
            required: true,
            type: "text",
            placeholder: "Ваше имя"
        });
        this.nameInput.mount(this.element.querySelector(".support-new-tab__name-input") as HTMLElement);

        this.emailInput = new Input({
            class: "support-overlay__input",
            name: "support_email",
            required: true,
            type: "email",
            placeholder: "Например, name@mail.ru",
            autocomplete: "email"
        });
        this.emailInput.mount(this.element.querySelector(".support-new-tab__email-input") as HTMLElement);

        this.textInput = new Input({
            class: "edit-profile__edit-input",
            name: "support_message",
            placeholder: "Например: при отправке голосового сообщения интерфейс зависает…",
            required: true,
            type: "text"
        });
        this.textInput.mount(this.element.querySelector(".support-new-tab__issue-input") as HTMLElement);

        this.filesInput = new Input({
            class: "ui-input",
            name: "support_files",
            required: false,
            type: "file"
        });
        this.filesInput.mount(this.element.querySelector(".support-new-tab__files-input") as HTMLElement);

        const filesContainer = this.element.querySelector(".support-new-tab__files-input") as HTMLElement;
        const nativeInput = filesContainer?.querySelector("input[type=file]") as HTMLInputElement | null;
        if (nativeInput) {
            const wrapper = nativeInput.closest(".ui-input-wrapper") ?? nativeInput;
            (wrapper as HTMLElement).classList.add("support-overlay__file-input--hidden");

            const label = document.createElement("label");
            label.className = "support-overlay__file-label";
            label.htmlFor = "support_files_id";
            nativeInput.id = "support_files_id";

            const icon = document.createElement("img");
            icon.src = "/assets/images/icons/upload.svg";
            icon.alt = "Загрузить файл";
            icon.className = "support-overlay__file-icon";

            const text = document.createElement("span");
            text.className = "support-overlay__file-name";
            text.textContent = "Прикрепить файл";

            label.appendChild(icon);
            label.appendChild(text);
            filesContainer.appendChild(label);

            nativeInput.addEventListener("change", () => {
                const file = nativeInput.files?.[0];
                text.textContent = file ? file.name : "Прикрепить файл";
            });
        }

        this.confirmButton = new Button({
            class: "ui-button ui-button__primary support-overlay__submit",
            label: "Отправить обращение",
            type: "button",
            onClick: () => { void this.handleSubmit(); }
        });
        this.confirmButton.mount(this.element.querySelector(".support-new-tab__confirm") as HTMLElement);
    }

    private collectFile(): File | null {
        const list = this.filesInput?.files;
        return list && list.length > 0 ? list[0] : null;
    }

    private clearFieldErrors(): void {
        this.nameInput?.clearError();
        this.emailInput?.clearError();
        this.textInput?.clearError();
    }

    private validateForm(): boolean {
        this.clearFieldErrors();
        let ok = true;

        if (!this.nameInput?.value?.trim()) {
            this.nameInput?.setError("Укажите имя");
            ok = false;
        }
        const email = this.emailInput?.value?.trim() ?? "";
        if (!email) {
            this.emailInput?.setError("Укажите email");
            ok = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.emailInput?.setError("Некорректный email");
            ok = false;
        }
        if (!this.textInput?.value?.trim()) {
            this.textInput?.setError("Опишите обращение");
            ok = false;
        }
        return ok;
    }

    private async handleSubmit(): Promise<void> {
        if (!this.confirmButton || !this.validateForm()) return;

        this.confirmButton.disabled = true;
        const result = await supportService.createComplaint({
            type: this.issueType,
            feedbackName: this.nameInput?.value?.trim() ?? "",
            feedbackEmail: this.emailInput?.value?.trim() ?? "",
            body: this.textInput?.value?.trim() ?? "",
            file: this.collectFile()
        });
        this.confirmButton.disabled = false;

        if (result.success === false) {
            const msg = result.error;
            window.alert(msg);
            return;
        }

        if (this.nameInput) this.nameInput.value = "";
        if (this.emailInput) this.emailInput.value = "";
        if (this.textInput) this.textInput.value = "";
        const fileEl = this.element?.querySelector<HTMLInputElement>(".support-new-tab__files-input input[type=file]");
        if (fileEl) fileEl.value = "";
        this.clearFieldErrors();
        window.alert("Обращение успешно отправлено. Спасибо!");
    }

    private setIssueType(type: SupportIssueType): void {
        this.issueType = type;
        const map: { btn: Button | null; value: SupportIssueType }[] = [
            { btn: this.bugTypeButton, value: "bug" },
            { btn: this.suggestionTypeButton, value: "suggestion" },
            { btn: this.complaintTypeButton, value: "complaint" }
        ];
        for (const { btn, value } of map) {
            btn?.element?.classList.toggle("support-overlay__issue-type-btn--active", value === type);
        }
    }

    protected beforeUnmount(): void {
        this.bugTypeButton?.unmount();
        this.suggestionTypeButton?.unmount();
        this.complaintTypeButton?.unmount();
        this.nameInput?.unmount();
        this.emailInput?.unmount();
        this.textInput?.unmount();
        this.filesInput?.unmount();
        this.confirmButton?.unmount();
    }
}
