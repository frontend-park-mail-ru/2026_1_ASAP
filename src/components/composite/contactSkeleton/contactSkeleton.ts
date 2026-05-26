import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './contactSkeleton.hbs';

export interface ContactSkeletonProps extends IBaseComponentProps {
    name?: string;
    avatarUrl?: string;
}

export class ContactSkeleton extends BaseComponent<ContactSkeletonProps> {
    constructor(props: ContactSkeletonProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    }
}
