import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo, ProfileAdditionalInfo } from "../../../types/profile";
import { ProfileAdditionalInfoBlock } from "../profileAdditionalInfoBlock/profileAdditionalInfoBlock";
import { ProfileHeader } from "../profileHeader/profileHeader";
import { ProfileMainInfoBlock } from "../profileMainInfoBlock/profileMainInfoBlock";
import { Button } from "../../ui/button/button";
import { ConfirmModal } from "../confirmModal/confirmModal";
import { contactService } from "../../../services/contactService";
import { chatService } from "../../../services/chatService";
import template from "./profileWindow.hbs"

interface ProfileWindowProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    profileAdditionalInfo: ProfileAdditionalInfo;
    closeWindow: (event: MouseEvent) => void;
    router?: any;
    onContactsChanged?: () => void;
};

export class ProfileWindow extends BaseComponent<ProfileWindowProps> {
    private profileHeader: ProfileHeader | null = null;
    private profileMainInfoBlock: ProfileMainInfoBlock | null = null;
    private profileAdditionalInfoBlock: ProfileAdditionalInfoBlock | null = null;
    private actionsSlot: HTMLElement | null = null;
    private messageButton: Button | null = null;
    private contactToggleButton: Button | null = null;
    private removeConfirmModal: ConfirmModal | null = null;
    private isContact: boolean = false;

    constructor(props: ProfileWindowProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.profileHeader = new ProfileHeader({
            closeWindow: this.props.closeWindow,
            label: "Профиль пользователя"
        });
        this.profileHeader.mount(this.element!);

        this.profileMainInfoBlock = new ProfileMainInfoBlock({
            profileMainInfo: this.props.profileMainInfo,
            type: "contact"
        });
        this.profileMainInfoBlock.mount(this.element!);

        this.actionsSlot = document.createElement("div");
        this.actionsSlot.className = "profile-window__actions";
        this.element!.appendChild(this.actionsSlot);

        this.profileAdditionalInfoBlock = new ProfileAdditionalInfoBlock({
            profileAdditionalInfo: this.props.profileAdditionalInfo
        });
        this.profileAdditionalInfoBlock.mount(this.element!);

        this.setupActions();
    };

    private async setupActions(): Promise<void> {
        if (!this.actionsSlot) return;

        const profileId = this.props.profileAdditionalInfo.id;
        const myId = await contactService.getMyId();
        if (!this.actionsSlot) return;
        if (myId === profileId) return;

        const contacts = await contactService.getContacts();
        if (!this.actionsSlot) return;

        this.isContact = contacts.some(c => c.contact_user_id === profileId);
        this.renderActions();
    }

    private renderActions(): void {
        if (!this.actionsSlot) return;

        this.messageButton?.unmount();
        this.contactToggleButton?.unmount();

        this.messageButton = new Button({
            label: "Написать сообщение",
            class: "ui-button ui-button__primary",
            onClick: () => this.handleSendMessage(),
        });
        this.messageButton.mount(this.actionsSlot);

        this.contactToggleButton = this.isContact
            ? new Button({
                label: "Удалить из контактов",
                class: "ui-button ui-button__secondary",
                onClick: () => this.handleRemoveContact(),
            })
            : new Button({
                label: "Добавить в контакты",
                class: "ui-button ui-button__secondary",
                onClick: () => this.handleAddContact(),
            });
        this.contactToggleButton.mount(this.actionsSlot);
    }

    private async handleAddContact(): Promise<void> {
        if (!this.contactToggleButton) return;
        this.contactToggleButton.disabled = true;

        const { login, id } = this.props.profileAdditionalInfo;
        const res = await contactService.addContact(login, id);
        if (!this.actionsSlot) return;

        if (res.success) {
            this.isContact = true;
            this.renderActions();
            this.props.onContactsChanged?.();
            return;
        }

        this.contactToggleButton.disabled = false;
    }

    private handleRemoveContact(): void {
        const { firstName, lastName } = this.props.profileMainInfo;
        const name = `${firstName ?? ''} ${lastName ?? ''}`.trim() || this.props.profileAdditionalInfo.login;

        this.closeRemoveConfirm();
        this.removeConfirmModal = new ConfirmModal({
            text: `Удалить ${name} из контактов?`,
            confirmButtonText: "Удалить",
            cancelButtonText: "Отмена",
            confirmButtonClass: "confirm-modal__button--submit ui-button exit-button",
            onConfirm: () => {
                this.closeRemoveConfirm();
                this.deleteContact();
            },
            onCancel: () => {
                this.closeRemoveConfirm();
            },
        });
        this.removeConfirmModal.mount(document.body);
    }

    private closeRemoveConfirm(): void {
        this.removeConfirmModal?.unmount();
        this.removeConfirmModal = null;
    }

    private async deleteContact(): Promise<void> {
        if (!this.contactToggleButton) return;
        this.contactToggleButton.disabled = true;

        const { id } = this.props.profileAdditionalInfo;
        const res = await contactService.deleteContact(id);
        if (!this.actionsSlot) return;

        if (res.success) {
            this.isContact = false;
            this.renderActions();
            this.props.onContactsChanged?.();
            return;
        }

        this.contactToggleButton.disabled = false;
    }

    private async handleSendMessage(): Promise<void> {
        if (!this.messageButton) return;
        this.messageButton.disabled = true;

        const { id, login } = this.props.profileAdditionalInfo;
        const res = await chatService.createChat([id], "dialog");
        if (!this.actionsSlot) return;

        let chatId: string | number | undefined = res.body?.id;

        // TODO: бэк на 409 не возвращает chat_id.
        // когда это появится, удалить findExistingDialogId и читать chatId напрямую из res.body.id.
        if (!chatId && res.status === 409) {
            chatId = await this.findExistingDialogId(id, login);
        }

        if (chatId && this.props.router) {
            this.props.router.navigate(`/chats/${chatId}`);
            return;
        }

        this.messageButton.disabled = false;
    }

    // TODO: удалить, когда бэк начнёт возвращать chat_id в 409
    private async findExistingDialogId(targetId: number, targetLogin: string): Promise<string | undefined> {
        const chats = await chatService.getChats();
        const dialogs = chats.filter(c => c.type === 'dialog');

        const byLogin = dialogs.find(c => (c as any).interlocutor?.login === targetLogin);
        if (byLogin) return byLogin.id;

        for (const d of dialogs) {
            const members = await chatService.getChatMembers(d.id);
            if (members.includes(targetId)) return d.id;
        }

        return undefined;
    }

    protected beforeUnmount(): void {
        this.closeRemoveConfirm();
        this.messageButton?.unmount();
        this.contactToggleButton?.unmount();
        this.messageButton = null;
        this.contactToggleButton = null;
        this.actionsSlot = null;
        this.profileHeader?.unmount();
        this.profileMainInfoBlock?.unmount();
        this.profileAdditionalInfoBlock?.unmount();
    };
};