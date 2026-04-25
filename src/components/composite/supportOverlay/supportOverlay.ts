import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import { SupportNewTab } from "./supportNewTab";
import { SupportMyTab } from "./supportMyTab";
import { SupportStatTab } from "./supportStatTab";
import template from "./supportOverlay.hbs";
import { authService } from "../../../services/authService";

interface SupportOverlayProps extends IBaseComponentProps {
    onCloseClick: (event: MouseEvent) => void;
}

type SupportNavSection = "new" | "my" | "stat";

export class SupportOverlay extends BaseComponent<SupportOverlayProps> {
    private navSection: SupportNavSection = "new";

    private buttonExit: Button | null = null;
    private newButton: Button | null = null;
    private myButton: Button | null = null;
    private statButton: Button | null = null;

    private activeTab: BaseComponent | null = null;

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

        const navContainer = this.element.querySelector(".support-overlay__nav-buttons") as HTMLElement;

        this.newButton = new Button({
            class: "support-overlay__nav-btn",
            label: "+ Новое",
            type: "button",
            onClick: () => this.setNavSection("new")
        });
        this.newButton.mount(navContainer);

        this.setNavSection("new");
        void this.mountAuthedNavButtons();
    }

    private async mountAuthedNavButtons(): Promise<void> {
        const authed = await authService.checkAuth();
        if (!authed || !this.element?.isConnected) return;

        const navContainer = this.element.querySelector(".support-overlay__nav-buttons") as HTMLElement | null;
        if (!navContainer) return;

        this.myButton = new Button({
            class: "support-overlay__nav-btn",
            label: "Мои",
            type: "button",
            onClick: () => this.setNavSection("my")
        });
        this.myButton.mount(navContainer);

        this.statButton = new Button({
            class: "support-overlay__nav-btn",
            label: "Статистика",
            type: "button",
            onClick: () => this.setNavSection("stat")
        });
        this.statButton.mount(navContainer);

        this.setNavSection(this.navSection);
    }

    private setNavSection(section: SupportNavSection): void {
        this.navSection = section;

        const navMap: { btn: Button | null; value: SupportNavSection }[] = [
            { btn: this.newButton, value: "new" },
            { btn: this.myButton, value: "my" },
            { btn: this.statButton, value: "stat" }
        ];
        for (const { btn, value } of navMap) {
            btn?.element?.classList.toggle("support-overlay__nav-btn--active", value === section);
        }

        this.mountTab(section);
    }

    private mountTab(section: SupportNavSection): void {
        const container = this.element?.querySelector(".support-overlay__tab-content") as HTMLElement | null;
        if (!container) return;

        this.activeTab?.unmount();
        this.activeTab = null;

        let tab: BaseComponent;
        switch (section) {
            case "new":
                tab = new SupportNewTab({});
                break;
            case "my":
                tab = new SupportMyTab({});
                break;
            case "stat":
                tab = new SupportStatTab({});
                break;
        }

        tab.mount(container);
        this.activeTab = tab;
    }

    public get selectedNavSection(): SupportNavSection {
        return this.navSection;
    }

    protected beforeUnmount(): void {
        this.buttonExit?.unmount();
        this.newButton?.unmount();
        this.myButton?.unmount();
        this.statButton?.unmount();
        this.activeTab?.unmount();
        this.activeTab = null;
    }
}
