import type { BaseComponent } from "../../../core/base/baseComponent";
import type { Router } from "../../../core/router";
import { CreateChannelWindow } from "../../../components/composite/createChannelWindow/createChannelWindow";
import { CreateDialogWindow } from "../../../components/composite/createDialogWindow/createDialogWindow";
import { CreateGroupWindow } from "../../../components/composite/createGroupWindow/createGroupWindow";
import type { CreateChatMode } from "../model/chatsViewModels";
import type { ChatCreationController } from "./chatCreationController";

interface ChatCreateWindowControllerDeps {
    creationController: ChatCreationController;
    router: Router;
    onUnknownMode: (mode: string) => void;
}

export class ChatCreateWindowController {
    constructor(private readonly deps: ChatCreateWindowControllerDeps) {}

    public async build(mode: CreateChatMode): Promise<BaseComponent | null> {
        switch (mode) {
        case "dialog":
            return new CreateDialogWindow({
                router: this.deps.router,
                contacts: await this.deps.creationController.loadContacts(),
                onSearchContacts: (query, scope) => this.deps.creationController.searchContacts(query, scope),
                onSubmit: (contactId: number, _contactName: string) =>
                    this.deps.creationController.createDialog(contactId),
            });
        case "group":
            return new CreateGroupWindow({
                router: this.deps.router,
                contacts: await this.deps.creationController.loadContacts(),
                onSearchContacts: (query, scope) => this.deps.creationController.searchContacts(query, scope),
                onSubmit: (userIds: number[], groupName: string) =>
                    this.deps.creationController.createGroup(userIds, groupName),
            });
        case "channel":
            return new CreateChannelWindow({
                router: this.deps.router,
                onSubmit: (title: string, _avatar?: File) =>
                    this.deps.creationController.createChannel(title),
            });
        default:
            this.deps.onUnknownMode(mode);
            return null;
        }
    }
}
