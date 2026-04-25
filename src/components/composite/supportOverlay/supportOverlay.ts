import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import { Input } from "../../ui/input/input";
import template from "./supportOverlay.hbs";

interface SupportOverlayProps extends IBaseComponentProps {
};

export class SupportOverlay extends BaseComponent<SupportOverlayProps> {
    private state: 'menu' | 'newChat' | 'stats' | null = null;
    private buttonExit: Button | null = null;
    private emailInput: Input | null = null;
    private textInput: Input | null = null;
    private filesInput: Input | null = null;

    constructor(props: SupportOverlayProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.buttonExit = new Button({
            icon: '/assets/icons/deleteIcon.svg'
        });
        this.buttonExit.mount(this.element!);

        this.emailInput = new Input({
            required: true
        });
        this.emailInput.mount(this.element!);

        this.textInput = new Input({
            placeholder: "Например: при отправке голосового сообщения\nинтерфейс зависает на 3-4 секунды...",
            required: true,
        });
        this.textInput.mount(this.element!);

        this.filesInput = new Input({
            required: true
        });
        this.filesInput.mount(this.element!);
    };

    protected beforeUnmount(): void {
        this.buttonExit?.unmount();
        this.emailInput?.unmount();
        this.textInput?.unmount();
        this.filesInput?.unmount();
    };
};