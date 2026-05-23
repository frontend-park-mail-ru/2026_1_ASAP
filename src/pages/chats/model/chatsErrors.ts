export type ChatOperation =
    | "createDialog"
    | "createGroup"
    | "createChannel"
    | "deleteDialog"
    | "deleteGroup"
    | "deleteChannel"
    | "leaveGroup"
    | "leaveChannel"
    | "joinChannel"
    | "addMember"
    | "removeMember"
    | "updateGroup"
    | "updateChannel"
    | "sendMessage"
    | "editMessage"
    | "deleteMessage";

export interface ServiceErrorLike {
    status?: number;
    errorCode?: string;
    errorMessage?: string;
    code?: string;
    error?: string;
    message?: string;
}

const DEFAULT_OPERATION_MESSAGES: Record<ChatOperation, string> = {
    createDialog: "Не удалось создать диалог",
    createGroup: "Не удалось создать группу",
    createChannel: "Не удалось создать канал",
    deleteDialog: "Не удалось удалить диалог",
    deleteGroup: "Не удалось удалить группу",
    deleteChannel: "Не удалось удалить канал",
    leaveGroup: "Не удалось выйти из группы",
    leaveChannel: "Не удалось выйти из канала",
    joinChannel: "Не удалось подписаться на канал",
    addMember: "Не удалось добавить участника",
    removeMember: "Не удалось удалить участника",
    updateGroup: "Не удалось обновить группу",
    updateChannel: "Не удалось обновить канал",
    sendMessage: "Не удалось отправить сообщение",
    editMessage: "Не удалось изменить сообщение",
    deleteMessage: "Не удалось удалить сообщение",
};

const CODE_MESSAGES: Record<string, string> = {
    CANT_DELETE_CHAT: "У вас нет прав на удаление этого чата",
    CANT_LEAVE_OWN_CHAT: "Владелец не может выйти из собственного чата",
    MEMBER_ALREADY_IN_CHAT: "Пользователь уже есть в чате",
    USER_ALREADY_IN_CHAT: "Пользователь уже есть в чате",
    USER_NOT_FOUND: "Пользователь не найден",
    CHAT_NOT_FOUND: "Чат не найден",
    CHANNEL_NOT_FOUND: "Канал не найден",
    YOU_CANT_CHANGE_TITLE: "У вас нет прав менять название",
    YOU_CANT_CHANGE_AVATAR: "У вас нет прав менять аватар",
    YOU_CANT_CHANGE_DESCRIPTION: "У вас нет прав менять описание",
    FORBIDDEN: "Недостаточно прав для этого действия",
    VALIDATION_ERROR: "Проверьте введённые данные",
};

const OPERATION_CODE_MESSAGES: Partial<Record<ChatOperation, Record<string, string>>> = {
    deleteGroup: {
        CANT_DELETE_CHAT: "Удалить группу может только владелец",
    },
    deleteChannel: {
        CANT_DELETE_CHAT: "Удалить канал может только владелец",
    },
    leaveGroup: {
        CANT_LEAVE_OWN_CHAT: "Передайте права владельца или удалите группу",
    },
    leaveChannel: {
        CANT_LEAVE_OWN_CHAT: "Владелец может удалить канал, но не выйти из него",
    },
    addMember: {
        MEMBER_ALREADY_IN_CHAT: "Этот пользователь уже добавлен",
        USER_ALREADY_IN_CHAT: "Этот пользователь уже добавлен",
    },
    sendMessage: {
        EMPTY_TEXT: "Добавьте текст или вложение",
        TOO_MANY_ATTACHMENTS: "В одном сообщении можно отправить не больше 10 вложений",
        INVALID_ATTACHMENT: "Одно из вложений не удалось отправить",
        ATTACHMENT_NOT_OWNED: "Это вложение недоступно для отправки",
        CONTACT_NOT_FOUND: "Контакт не найден или больше не доступен",
        NOT_MEMBER_OF_CHAT: "Вы больше не участник этого чата",
        YOU_CANT_SEND_MESSAGE: "Вы не можете писать в этот чат",
        MESSAGE_TOO_LONG: "Сообщение должно быть не длиннее 2000 символов",
    },
    updateGroup: {
        YOU_CANT_CHANGE_TITLE: "Название группы может менять только владелец",
        YOU_CANT_CHANGE_AVATAR: "Аватар группы может менять только владелец",
    },
    updateChannel: {
        YOU_CANT_CHANGE_TITLE: "Название канала может менять только владелец",
        YOU_CANT_CHANGE_AVATAR: "Аватар канала может менять только владелец",
    },
};

const STATUS_MESSAGES: Record<number, string> = {
    400: "Проверьте введённые данные",
    401: "Нужно войти заново",
    403: "Недостаточно прав для этого действия",
    404: "Объект не найден или уже удалён",
    409: "Это действие конфликтует с текущим состоянием",
    500: "Сервер временно недоступен",
};

function getErrorCode(error: ServiceErrorLike | null | undefined): string | undefined {
    return error?.errorCode || error?.code || error?.error;
}

export function normalizeChatError(error: ServiceErrorLike | null | undefined): ServiceErrorLike {
    return {
        status: error?.status,
        errorCode: getErrorCode(error),
        errorMessage: error?.errorMessage || error?.message,
    };
}

export function getChatErrorMessage(
    operation: ChatOperation,
    error?: ServiceErrorLike | null,
    fallback: string = DEFAULT_OPERATION_MESSAGES[operation],
): string {
    const normalized = normalizeChatError(error);
    const code = normalized.errorCode;

    if (code) {
        const operationMessage = OPERATION_CODE_MESSAGES[operation]?.[code];
        if (operationMessage) return operationMessage;
        if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
    }

    if (normalized.errorMessage) return normalized.errorMessage;
    if (normalized.status && STATUS_MESSAGES[normalized.status]) return STATUS_MESSAGES[normalized.status];

    return fallback;
}
