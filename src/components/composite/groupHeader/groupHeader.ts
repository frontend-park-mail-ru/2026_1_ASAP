import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { GroupChat } from '../../../types/chat';
import template from './groupHeader.hbs'

interface GroupHeaderProps extends IBaseComponentProps {
    chat: GroupChat;
}

/**
 * Временный компонент-заглушка для шапки группового чата.
 */
export class GroupHeader extends BaseComponent<GroupHeaderProps> {
    constructor(props: GroupHeaderProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }
}