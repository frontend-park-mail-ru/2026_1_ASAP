import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent.js';
import { GroupChat } from '../../../types/chat.js';

interface GroupHeaderProps extends IBaseComponentProps {
    chat: GroupChat;
}

/**
 * Временный компонент-заглушка для шапки группового чата.
 */
export class GroupHeader extends BaseComponent<GroupHeaderProps> {
    constructor(props: GroupHeaderProps) {
        super(props);
        this.tempName = 'components/composite/groupHeader/groupHeader';
    }
}