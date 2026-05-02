import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { Button } from '../../ui/button/button';
import template from './channelJoinFooter.hbs';
import './channelJoinFooter.scss';

interface ChannelJoinFooterProps extends IBaseComponentProps {
    onJoin: () => Promise<void>;
}

export class ChannelJoinFooter extends BaseComponent<ChannelJoinFooterProps> {
    private joinButton: Button | null = null;
    private isLoading = false;

    constructor(props: ChannelJoinFooterProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        const buttonSlot = this.element?.querySelector('[data-component="channel-join-footer-button"]');
        if (!buttonSlot) return;

        this.joinButton = new Button({
            label: 'Подписаться',
            class: 'channel-join-footer__button ui-button ui-button__primary',
            onClick: () => this.handleJoin(),
        });
        this.joinButton.mount(buttonSlot as HTMLElement);
    }

    private async handleJoin(): Promise<void> {
        if (this.isLoading) return;

        this.setLoading(true);
        try {
            await this.props.onJoin();
        } finally {
            this.setLoading(false);
        }
    }

    private setLoading(isLoading: boolean): void {
        this.isLoading = isLoading;
        if (!this.joinButton) return;

        this.joinButton.disabled = isLoading;
        this.joinButton.props.label = isLoading ? 'Подписываем...' : 'Подписаться';

        const label = this.joinButton.element?.querySelector('span');
        if (label) {
            label.textContent = this.joinButton.props.label || '';
        }
    }

    protected beforeUnmount(): void {
        this.joinButton?.unmount();
        this.joinButton = null;
    }
}
