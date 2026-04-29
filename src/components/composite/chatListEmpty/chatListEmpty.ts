import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './chatListEmpty.hbs';

export class ChatListEmpty extends BaseComponent<IBaseComponentProps> {
    getTemplate() {
        return template;
    }
}
