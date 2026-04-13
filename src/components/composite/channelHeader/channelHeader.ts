import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { ChannelChat } from '../../../types/chat';
import template from './channelHeader.hbs';

interface ChannelHeaderProps extends IBaseComponentProps {
    chat: ChannelChat;
}

/**
 * Временный компонент-заглушка для шапки канала.
 */
export class ChannelHeader extends BaseComponent<ChannelHeaderProps> {
    constructor(props: ChannelHeaderProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }
}