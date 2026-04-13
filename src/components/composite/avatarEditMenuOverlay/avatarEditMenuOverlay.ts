import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from "./avatarEditMenuOverlay.hbs";

interface AvatarEditMenuOverlayProps extends IBaseComponentProps {
    anchorRect: DOMRect;
    onUpload(): void;
    onDelete(): void;
    onClose(): void;
}

export class AvatarEditMenuOverlay extends BaseComponent<AvatarEditMenuOverlayProps> {
    private uploadButton: Button | null = null;
    private deleteButton: Button | null = null;

    constructor(props: AvatarEditMenuOverlayProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    private positionPanel(panel: HTMLElement): void {
        const { anchorRect } = this.props;
        const margin = 8;
        const w = 240;
        const h = panel.offsetHeight || 100;
        let left = anchorRect.right + margin;
        let top = anchorRect.top;
        if (left + w > window.innerWidth - margin) {
            left = anchorRect.left - w - margin;
        }
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
        if (top + h > window.innerHeight - margin) {
            top = window.innerHeight - h - margin;
        }
        top = Math.max(margin, top);
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const backdrop = this.element.querySelector('[data-component="avatar-edit-menu-backdrop"]');
        backdrop?.addEventListener("click", () => this.props.onClose());

        const panel = this.element.querySelector('[data-component="avatar-edit-menu-panel"]') as HTMLElement | null;
        if (!panel) return;

        this.uploadButton = new Button({
            label: "Загрузить изображение",
            type: "button",
            class: "avatar-edit-menu__action avatar-edit-menu__action--upload ui-button",
            onClick: () => this.props.onUpload(),
        });
        this.uploadButton.mount(panel);
        const uploadEl = this.uploadButton.element;
        if (uploadEl) {
            const icon = document.createElement("span");
            icon.className = "avatar-edit-menu__icon-upload";
            icon.setAttribute("aria-hidden", "true");
            uploadEl.insertBefore(icon, uploadEl.firstChild);
        }

        this.deleteButton = new Button({
            label: "Удалить аватар",
            icon: "/assets/images/icons/deleteAvatar.svg",
            type: "button",
            class: "avatar-edit-menu__action avatar-edit-menu__action--danger ui-button",
            onClick: () => this.props.onDelete(),
        });
        this.deleteButton.mount(panel);

        requestAnimationFrame(() => this.positionPanel(panel));
    }

    protected beforeUnmount(): void {
        this.uploadButton?.unmount();
        this.deleteButton?.unmount();
    }
}
