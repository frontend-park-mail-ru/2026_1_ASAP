import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './chatSkeleton.hbs';

export interface ChatSkeletonProps extends IBaseComponentProps {
    title: string;
    avatarUrl?: string;
}


export class ChatSkeleton extends BaseComponent<ChatSkeletonProps> {
    constructor(props: ChatSkeletonProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }
}
