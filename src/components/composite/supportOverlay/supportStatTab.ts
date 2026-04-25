import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from "./supportStatTab.hbs";

interface SupportStatTabProps extends IBaseComponentProps {}

export class SupportStatTab extends BaseComponent<SupportStatTabProps> {
    constructor(props: SupportStatTabProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    }
}
