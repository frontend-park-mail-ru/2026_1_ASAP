import type { FrontendMessage, MessageAttachment } from "../types/chat";

export type LastMessagePreviewKind =
    | "text"
    | "photo"
    | "video"
    | "file"
    | "contact"
    | "voice"
    | "sticker"
    | "empty";

export interface LastMessagePreview {
    text: string;
    kind: LastMessagePreviewKind;
    iconSrc?: string;
}

export const ATTACHMENT_SIDEBAR_ICONS = {
    media: "/assets/images/icons/attachments/sidebar-media.svg",
    file: "/assets/images/icons/attachments/sidebar-file.svg",
    contact: "/assets/images/icons/attachments/sidebar-profile.svg",
    voice: "/assets/images/icons/attachments/sidebar-voice.svg",
    sticker: "/assets/images/icons/attachments/sidebar-smile.svg",
} as const;

const ATTACHMENT_PLACEHOLDER_TEXT =
    /^\s*(?:\[(?:Фото|Видео|Файл|Контакт|Вложение|Стикер|Голосовое(?:\s+сообщение)?[^\]]*)\]\s*)+$/iu;
const NON_VOICE_ATTACHMENT_PLACEHOLDER_TEXT =
    /^\s*(?:\[(?:Фото|Видео|Файл|Контакт|Вложение)\]\s*)+$/iu;

export function isAttachmentPlaceholderText(text?: string): boolean {
    return ATTACHMENT_PLACEHOLDER_TEXT.test((text || "").trim());
}

export function isNonVoiceAttachmentPlaceholderText(text?: string): boolean {
    return NON_VOICE_ATTACHMENT_PLACEHOLDER_TEXT.test((text || "").trim());
}

function getContactPreview(attachment: MessageAttachment): string {
    return [attachment.contactFirstName, attachment.contactLastName].filter(Boolean).join(" ") || "Контакт";
}

function getAttachmentPreview(attachment: MessageAttachment): LastMessagePreview {
    switch (attachment.type) {
        case "photo":
            return { text: "Фото", kind: "photo", iconSrc: ATTACHMENT_SIDEBAR_ICONS.media };
        case "video":
            return { text: "Видео", kind: "video", iconSrc: ATTACHMENT_SIDEBAR_ICONS.media };
        case "file":
            return { text: attachment.fileName || "Файл", kind: "file", iconSrc: ATTACHMENT_SIDEBAR_ICONS.file };
        case "contact":
            return { text: getContactPreview(attachment), kind: "contact", iconSrc: ATTACHMENT_SIDEBAR_ICONS.contact };
        case "voice":
            return { text: "Голосовое сообщение", kind: "voice", iconSrc: ATTACHMENT_SIDEBAR_ICONS.voice };
        default:
            return { text: "", kind: "empty" };
    }
}

function getPlaceholderPreview(text: string): LastMessagePreview | null {
    const match = text.match(/\[(Фото|Видео|Файл|Контакт|Вложение|Стикер|Голосовое(?:\s+сообщение)?[^\]]*)\]/iu);
    const label = match?.[1]?.toLowerCase() || '';

    if (label.startsWith('фото')) {
        return { text: "Фото", kind: "photo", iconSrc: ATTACHMENT_SIDEBAR_ICONS.media };
    }
    if (label.startsWith('видео')) {
        return { text: "Видео", kind: "video", iconSrc: ATTACHMENT_SIDEBAR_ICONS.media };
    }
    if (label.startsWith('файл')) {
        return { text: "Файл", kind: "file", iconSrc: ATTACHMENT_SIDEBAR_ICONS.file };
    }
    if (label.startsWith('контакт')) {
        return { text: "Контакт", kind: "contact", iconSrc: ATTACHMENT_SIDEBAR_ICONS.contact };
    }
    if (label.startsWith('голосовое')) {
        return { text: "Голосовое сообщение", kind: "voice", iconSrc: ATTACHMENT_SIDEBAR_ICONS.voice };
    }
    if (label.startsWith('вложение')) {
        return { text: "Вложение", kind: "file", iconSrc: ATTACHMENT_SIDEBAR_ICONS.file };
    }
    if (label.startsWith('стикер')) {
        return { text: "Стикер", kind: "sticker", iconSrc: ATTACHMENT_SIDEBAR_ICONS.sticker };
    }

    return null;
}

export function getLastMessagePreview(message?: FrontendMessage): LastMessagePreview {
    if (!message) return { text: "", kind: "empty" };

    const text = (message.text || "").trim();
    const hasRichPayload = Boolean(message.sticker || message.attachments?.length);
    if (text && isAttachmentPlaceholderText(text)) {
        const attachment = message.attachments?.[0];
        if (attachment) return getAttachmentPreview(attachment);

        const placeholderPreview = getPlaceholderPreview(text);
        if (placeholderPreview) return placeholderPreview;
    }

    if (text && (!hasRichPayload || !isAttachmentPlaceholderText(text))) {
        return { text, kind: "text" };
    }

    const attachment = message.attachments?.[0];
    if (attachment) return getAttachmentPreview(attachment);

    if (message.sticker) {
        return { text: "Стикер", kind: "sticker", iconSrc: ATTACHMENT_SIDEBAR_ICONS.sticker };
    }

    return text ? { text, kind: "text" } : { text: "", kind: "empty" };
}
