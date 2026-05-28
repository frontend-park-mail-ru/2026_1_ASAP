import { describe, expect, it } from 'vitest';
import {
    ATTACHMENT_SIDEBAR_ICONS,
    getLastMessagePreview,
    isAttachmentPlaceholderText,
    isNonVoiceAttachmentPlaceholderText,
} from '../../../src/utils/lastMessagePreview';

describe('attachment placeholder text', () => {
    it('распознает последовательность служебных labels вложений', () => {
        expect(isNonVoiceAttachmentPlaceholderText('[Фото] [Файл] [Контакт]')).toBe(true);
        expect(isNonVoiceAttachmentPlaceholderText('[Фото] [Видео] [Контакт] [Файл]')).toBe(true);
    });

    it('не считает пользовательский текст placeholder-ом', () => {
        expect(isNonVoiceAttachmentPlaceholderText('смотри [Фото]')).toBe(false);
        expect(isNonVoiceAttachmentPlaceholderText('[Фото] отчет')).toBe(false);
    });

    it('не удаляет voice placeholder, чтобы не потерять длительность ГС', () => {
        expect(isAttachmentPlaceholderText('[Голосовое сообщение 00:12]')).toBe(true);
        expect(isNonVoiceAttachmentPlaceholderText('[Голосовое сообщение 00:12]')).toBe(false);
    });

    it('строит sidebar preview из placeholder даже без attachments после refresh', () => {
        expect(getLastMessagePreview({
            id: '1',
            sender: { id: 1, login: 'alice' },
            text: '[Фото] [Файл] [Контакт]',
            timestamp: new Date('2026-05-28T10:00:00Z'),
            isOwn: false,
        })).toEqual({
            text: 'Фото',
            kind: 'photo',
            iconSrc: ATTACHMENT_SIDEBAR_ICONS.media,
        });
    });

    it('строит sidebar preview для sticker без текстовой подмены', () => {
        expect(getLastMessagePreview({
            id: '1',
            sender: { id: 1, login: 'alice' },
            text: '',
            timestamp: new Date('2026-05-28T10:00:00Z'),
            isOwn: false,
            sticker: { id: 1, packId: 2, fileUrl: '/sticker.webp', emoji: '🔥' },
        })).toEqual({
            text: 'Стикер',
            kind: 'sticker',
            iconSrc: ATTACHMENT_SIDEBAR_ICONS.sticker,
        });
    });
});
