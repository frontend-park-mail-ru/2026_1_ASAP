import { IBaseComponentProps } from "../../../core/base/baseComponent";
import { BaseForm } from "../../../core/base/baseForm";
import { Router } from '../../../core/router';
import { SettingsListItem } from "../settingsListItem/settingsListItem";
import template from "./settingsListWrapper.hbs";

/**
 * @interface SettingsListWrapperProps - Свойства компонента обертки списка чатов.
 * @property {Router} router - Экземпляр роутера.
 */
interface SettingsListWrapperProps extends IBaseComponentProps {
    router: Router;
    onProfileClick: () => void;
};

/**
 * Обёртка для списка чатов (SettingsListItem).
 */
export class SettingsListWrapper extends BaseForm<SettingsListWrapperProps> {
    private settingsListItem: SettingsListItem | null = null;

    /**
     * @param {SettingsListWrapperProps} props - Свойства компонента.
     */
    constructor(props: SettingsListWrapperProps) {
        super(props);
    }

    getTemplate() {
        return template;
    };

    public setActiveByKey(setting: string) {
        this.settingsListItem.setActiveByKey(setting);
    }

    /**
     * @override
     */
    afterMount() {
        if (!this.element) {
            console.error("SettingsListWrapper: компонент не имеет элемента при afterMount.");
            return;
        }

        this.settingsListItem = new SettingsListItem({
            router: this.props.router,
            onProfileClick: this.props.onProfileClick,
        });
        this.settingsListItem.mount(this.element!);
    };

    /**
     * @override
     */
    beforeUnmount() {
        this.settingsListItem?.unmount();
    };
}