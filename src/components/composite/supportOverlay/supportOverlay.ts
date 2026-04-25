import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Router } from "../../../core/router";
import { Button } from "../../ui/button/button";
import template from "./supportOverlay.hbs";

interface SupportOverlayProps extends IBaseComponentProps {
};

export class SupportOverlay extends BaseComponent<SupportOverlayProps> {
    private state: 'menu' | 'newChat' | 'stats' | null = null;
    private buttonExit: Button | null = null;

    constructor(props: SupportOverlayProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        
    };

    protected beforeUnmount(): void {
        
    };
};