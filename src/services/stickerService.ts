/**
 * @file Сервис стикеров: REST GET /api/v1/sticker-packs + WS message.SendSticker.
 * @module services/stickerService
 */

import { httpClient } from "../core/utils/httpClient";
import { wsClient, StickerDto, StickerPackDto } from "../core/utils/wsClient";
import { BASE_URL } from "../core/utils/apiBase";
import { Sticker, StickerPack } from "../types/chat";

function mapSticker(dto: StickerDto): Sticker {
    return {
        id: dto.id,
        packId: dto.pack_id,
        fileUrl: dto.file_url,
        slug: dto.slug,
        emoji: dto.emoji,
        width: dto.width,
        height: dto.height,
    };
}

function mapPack(dto: StickerPackDto): StickerPack {
    return {
        id: dto.id,
        name: dto.name,
        title: dto.title,
        slug: dto.slug,
        thumbnailUrl: dto.thumbnail_url,
        stickers: (dto.stickers || []).map(mapSticker),
    };
}

class StickerService {
    private packsCache: StickerPack[] | null = null;
    private inflight: Promise<StickerPack[]> | null = null;

    /**
     * Загружает доступные стикерпаки. Кэшируется на время сессии:
     * список меняется крайне редко, тянуть его при каждом открытии пикера незачем.
     */
    public async getStickerPacks(): Promise<StickerPack[]> {
        if (this.packsCache) return this.packsCache;
        if (this.inflight) return this.inflight;

        this.inflight = (async () => {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/sticker-packs`, {
                    method: "GET",
                });

                if (!response.ok) {
                    console.warn("stickerService: GET /sticker-packs status", response.status);
                    return [];
                }

                const data = await response.json();
                const packs = Array.isArray(data?.body?.packs) ? data.body.packs : [];
                const mapped = packs.map((p: StickerPackDto) => mapPack(p));
                this.packsCache = mapped;
                return mapped;
            } catch (err) {
                console.error("stickerService.getStickerPacks failed", err);
                return [];
            } finally {
                this.inflight = null;
            }
        })();

        return this.inflight;
    }

    /**
     * Сбрасывает кэш — например, при logout / на dev-перезагрузке стикеров.
     */
    public clearCache(): void {
        this.packsCache = null;
        this.inflight = null;
    }

    /**
     * Отправляет стикер в чат через WS message.SendSticker.
     * Возвращает true, если WS был открыт и пакет ушёл.
     */
    public sendSticker(chatId: string | number, stickerId: number): boolean {
        return wsClient.sendIfOpen("message.SendSticker", {
            chat_id: Number(chatId),
            sticker_id: stickerId,
        });
    }
}

export const stickerService = new StickerService();
