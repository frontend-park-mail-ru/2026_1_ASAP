import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import { Input } from "../../ui/input/input";
import { supportService, ComplaintType } from "../../../services/supportService";
import template from "./supportOverlay.hbs";

interface SupportOverlayProps extends IBaseComponentProps {
    onCloseClick: (event: MouseEvent) => void;
}

type SupportIssueType = ComplaintType;
type SupportNavSection = "new" | "my" | "stat";

export class SupportOverlay extends BaseComponent<SupportOverlayProps> {
    private issueType: SupportIssueType = "bug";
    private navSection: SupportNavSection = "new";

    private buttonExit: Button | null = null;
    private emailInput: Input | null = null;
    private nameInput: Input | null = null;
    private textInput: Input | null = null;
    private filesInput: Input | null = null;
    private confirmButton: Button | null = null;
    private newButton: Button | null = null;
    private myButton: Button | null = null;
    private statButton: Button | null = null;

    private bugTypeButton: Button | null = null;
    private suggestionTypeButton: Button | null = null;
    private complaintTypeButton: Button | null = null;

    constructor(props: SupportOverlayProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.buttonExit = new Button({
            class: "support-overlay__close-btn",
            icon: "/assets/images/icons/deleteIcon.svg",
            label: "",
            onClick: this.props.onCloseClick
        });
        this.buttonExit.mount(this.element.querySelector(".support-overlay__header-actions") as HTMLElement);

        this.newButton = new Button({
            class: "support-overlay__nav-btn",
            label: "Новое обращение",
            type: "button",
            onClick: () => this.setNavSection("new")
        });
        this.newButton.mount(this.element.querySelector(".support-overlay__nav-buttons") as HTMLElement);

        this.myButton = new Button({
            class: "support-overlay__nav-btn",
            label: "Мои обращения",
            type: "button",
            onClick: () => this.setNavSection("my")
        });
        this.myButton.mount(this.element.querySelector(".support-overlay__nav-buttons") as HTMLElement);

        this.statButton = new Button({
            class: "support-overlay__nav-btn",
            label: "Статистика обращений",
            type: "button",
            onClick: () => this.setNavSection("stat")
        });
        this.statButton.mount(this.element.querySelector(".support-overlay__nav-buttons") as HTMLElement);
        this.setNavSection("new");

        const typeContainer = this.element.querySelector(".support-overlay__issue-type-buttons") as HTMLElement;
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
            class: "ui-input",
            name: "support_name",
            required: true,
            type: "text",
            placeholder: "Ваше имя"
        });
        this.nameInput.mount(this.element!.querySelector('.support-overlay__name-input'));

        this.emailInput = new Input({
            class: "ui-input",
            name: "support_email",
            required: true,
            type: "email",
            placeholder: "Например, name@mail.ru",
            autocomplete: "email"
        });
        this.emailInput.mount(this.element.querySelector(".support-overlay__email-input") as HTMLElement);

        this.textInput = new Input({
            class: "edit-profile__edit-input",
            name: "support_message",
            placeholder: "Например: при отправке голосового сообщения интерфейс зависает…",
            required: true,
            type: "text"
        });
        this.textInput.mount(this.element.querySelector(".support-overlay__issue-input") as HTMLElement);

        this.filesInput = new Input({
            class: "ui-input",
            name: "support_files",
            required: false,
            type: "file"
        });
        this.filesInput.mount(this.element.querySelector(".support-overlay__files-input") as HTMLElement);

        this.confirmButton = new Button({
            class: "ui-button ui-button__primary support-overlay__submit",
            label: "Отправить обращение",
            type: "button",
            onClick: () => {
                void this.handleSubmit();
            }
        });
        this.confirmButton.mount(this.element.querySelector(".support-overlay__confirm") as HTMLElement);
    }

    private collectFile(): File | null {
        const list = this.filesInput?.files;
        if (list && list.length > 0) {
            return list[0];
        }
        return null;
    }

    private clearFieldErrors(): void {
        this.nameInput?.clearError();
        this.emailInput?.clearError();
        this.textInput?.clearError();
    }

    private validateForm(): boolean {
        this.clearFieldErrors();
        let ok = true;
        const name = this.nameInput?.value?.trim() ?? "";
        if (!name) {
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
        const text = this.textInput?.value?.trim() ?? "";
        if (!text) {
            this.textInput?.setError("Опишите обращение");
            ok = false;
        }
        return ok;
    }

    private async handleSubmit(): Promise<void> {
        if (!this.confirmButton) return;
        if (this.navSection !== "new") {
            return;
        }
        if (!this.validateForm()) {
            return;
        }

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
            window.alert(result.error);
            return;
        }
        if (this.nameInput) this.nameInput.value = "";
        if (this.emailInput) this.emailInput.value = "";
        if (this.textInput) this.textInput.value = "";
        const fileEl = this.element?.querySelector<HTMLInputElement>(
            ".support-overlay__files-input input[type=file]"
        );
        if (fileEl) fileEl.value = "";
        this.clearFieldErrors();
        window.alert("Обращение успешно отправлено. Спасибо!");
    }

    /** Выбранный тип обращения (для будущей отправки на API). */
    public get selectedIssueType(): SupportIssueType {
        return this.issueType;
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

    private setNavSection(section: SupportNavSection): void {
        this.navSection = section;
        const map: { btn: Button | null; value: SupportNavSection }[] = [
            { btn: this.newButton, value: "new" },
            { btn: this.myButton, value: "my" },
            { btn: this.statButton, value: "stat" }
        ];
        for (const { btn, value } of map) {
            btn?.element?.classList.toggle("support-overlay__nav-btn--active", value === section);
        }
    }

    public get selectedNavSection(): SupportNavSection {
        return this.navSection;
    }

    protected beforeUnmount(): void {
        this.buttonExit?.unmount();
        this.newButton?.unmount();
        this.myButton?.unmount();
        this.statButton?.unmount();
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
