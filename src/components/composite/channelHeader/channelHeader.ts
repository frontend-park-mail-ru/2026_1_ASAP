import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent.js';
import { ChannelChat } from '../../../types/chat.js';

interface ChannelHeaderProps extends IBaseComponentProps {
    chat: ChannelChat;
}

/**
 * Временный компонент-заглушка для шапки канала.
 */
export class ChannelHeader extends BaseComponent<ChannelHeaderProps> {
    constructor(props: ChannelHeaderProps) {
        super(props);
        this.tempName = 'components/composite/channelHeader/channelHeader';
    }
}