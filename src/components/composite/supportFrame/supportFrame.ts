import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { PULSE_SUPPORT_CLOSE } from "../../../core/constants/supportIframe";
import template from "./supportFrame.hbs";
import "./supportFrame.scss";

interface SupportFrameProps extends IBaseComponentProps {
    fullsize?: boolean;
    onCloseClick?: () => void;
}

export class SupportFrame extends BaseComponent<SupportFrameProps> {
    private isVisible: boolean;
    private iFrame: HTMLIFrameElement | null;

    constructor(props: SupportFrameProps = {}) {
        super(props);
        this.isVisible = false;
        this.iFrame = null;
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        this.iFrame = this.element?.querySelector('iframe') || null;

        if (this.props.fullsize) {
            this.element?.classList.add('support-frame--fullsize');
            this.show();
        } else if (!this.isVisible) {
            this.hide();
        }

        window.addEventListener('message', event => {
            if (event.data?.type === PULSE_SUPPORT_CLOSE) {
                this.hide();
                this.props.onCloseClick();
            }
        });

    }

    public show() {
        console.log("SupportFrame: show() called");
        this.isVisible = true;
        this.element?.classList.add('support-frame--visible');
    }

    public hide() {
        this.isVisible = false;
        this.element?.classList.remove('support-frame--visible');
    }

}