import template from "./avatar.hbs";
import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";

/**
 * @interface AvatarProps - Свойства компонента аватара.
 * @property {string} [class] - CSS-класс.
 * @property {string} [src] - URL изображения.
 */
export interface AvatarProps extends IBaseComponentProps {
    class?: string;
    src?: string;
}

/**
 * Компонент аватара (изображение).
 */
export class Avatar extends BaseComponent<AvatarProps> {
    /**
     * @param {AvatarProps} [props={}] - Свойства.
     */
    constructor(props: AvatarProps = {}) {
        super(props);
        this.props.class = props.class;
        this.props.src = props.src;
    }

    getTemplate() {
        return template;
    }
}