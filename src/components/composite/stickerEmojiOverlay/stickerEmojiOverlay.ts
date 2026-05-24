import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Sticker, StickerPack } from "../../../types/chat";
import { stickerService } from "../../../services/stickerService";
import template from "./stickerEmojiOverlay.hbs";

type Tab = "stickers" | "emojis";

interface EmojiCategory {
    title: string;
    emojis: string[];
}

interface StickerEmojiOverlayProps extends IBaseComponentProps {
    anchorRect: DOMRect;
    initialTab?: Tab;
    onSelectSticker: (sticker: Sticker) => void;
    onSelectEmoji: (emoji: string) => void;
    onClose: () => void;
}

const RECENT_EMOJI_KEY = "recent_emojis";
const RECENT_EMOJI_LIMIT = 16;

const EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        title: "Смайлики",
        emojis: [
            "😀","😃","😄","😁","😆","😅","😂","🤣",
            "😊","😇","🙂","🙃","😉","😌","😍","🥰",
            "😘","😗","😙","😚","😋","😛","😝","😜",
            "🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳",
            "😏","😒","😞","😔","😟","😕","🙁","☹️",
            "😣","😖","😫","😩","🥺","😢","😭","😤",
            "😠","😡","🤬","🤯","😳","🥵","🥶","😱",
            "😨","😰","😥","😓","🫣","🤗","🫡","🤔",
        ],
    },
    {
        title: "Животные",
        emojis: [
            "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼",
            "🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈",
            "🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆",
            "🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝",
        ],
    },
    {
        title: "Знаки",
        emojis: [
            "❤️","🧡","💛","💚","💙","💜","🖤","🤍",
            "💔","❣️","💕","💞","💓","💗","💖","💘",
            "✅","❌","⚠️","🔔","🔕","🚫","✔️","✖️",
            "❓","❗","‼️","⁉️","💯","🔥","✨","🎉",
        ],
    },
    {
        title: "Флаги",
        emojis: [
            "🏳️","🏴","🏁","🚩","🇷🇺","🇺🇸","🇬🇧","🇩🇪",
            "🇫🇷","🇪🇸","🇮🇹","🇯🇵","🇨🇳","🇰🇷","🇧🇷",
        ],
    },
];

export class StickerEmojiOverlay extends BaseComponent<StickerEmojiOverlayProps> {
    private currentTab: Tab;
    private panel: HTMLElement | null = null;
    private contentEl: HTMLElement | null = null;
    private tabButtons: HTMLButtonElement[] = [];
    private stickerPacks: StickerPack[] = [];

    private handleBackdropClick = (): void => this.props.onClose();
    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === "Escape") this.props.onClose();
    };
    private handleResize = (): void => this.positionPanel();

    constructor(props: StickerEmojiOverlayProps) {
        super(props);
        this.currentTab = props.initialTab || "stickers";
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.panel = this.element.querySelector(".sticker-emoji-overlay__panel");
        this.contentEl = this.element.querySelector('[data-component="sticker-emoji-content"]');

        const backdrop = this.element.querySelector(".sticker-emoji-overlay__backdrop");
        backdrop?.addEventListener("click", this.handleBackdropClick);

        this.tabButtons = Array.from(this.element.querySelectorAll(".sticker-emoji-overlay__tab"));
        this.tabButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const tab = btn.dataset.tab as Tab;
                if (tab && tab !== this.currentTab) {
                    this.currentTab = tab;
                    this.renderTabState();
                    this.renderContent();
                }
            });
        });

        document.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("resize", this.handleResize);
        window.visualViewport?.addEventListener("resize", this.handleResize);

        this.renderTabState();
        this.renderContent();

        // Стикеры подгружаем асинхронно; если ещё нет — покажем заглушку
        stickerService.getStickerPacks().then((packs) => {
            this.stickerPacks = packs;
            if (this.currentTab === "stickers") this.renderContent();
        });

        requestAnimationFrame(() => this.positionPanel());
    }

    private renderTabState(): void {
        this.tabButtons.forEach((btn) => {
            const isActive = btn.dataset.tab === this.currentTab;
            btn.classList.toggle("sticker-emoji-overlay__tab--active", isActive);
        });
    }

    private renderContent(): void {
        if (!this.contentEl) return;
        this.contentEl.innerHTML = "";

        if (this.currentTab === "stickers") {
            this.renderStickers();
        } else {
            this.renderEmojis();
        }

        this.contentEl.scrollTop = 0;
    }

    private renderStickers(): void {
        if (!this.contentEl) return;

        if (this.stickerPacks.length === 0) {
            const empty = document.createElement("div");
            empty.className = "sticker-emoji-overlay__empty";
            empty.textContent = "Стикеры загружаются...";
            this.contentEl.appendChild(empty);
            return;
        }

        const frag = document.createDocumentFragment();

        this.stickerPacks.forEach((pack) => {
            const title = document.createElement("div");
            title.className = "sticker-emoji-overlay__pack-title";
            title.textContent = pack.title || pack.name;
            frag.appendChild(title);

            const grid = document.createElement("div");
            grid.className = "sticker-emoji-overlay__sticker-grid";

            pack.stickers.forEach((sticker) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "sticker-emoji-overlay__sticker-button";
                btn.setAttribute("aria-label", sticker.slug || sticker.emoji || "стикер");

                const img = document.createElement("img");
                img.src = sticker.fileUrl;
                img.alt = sticker.emoji || sticker.slug || "";
                img.loading = "lazy";
                btn.appendChild(img);

                btn.addEventListener("click", () => this.props.onSelectSticker(sticker));
                grid.appendChild(btn);
            });

            frag.appendChild(grid);
        });

        this.contentEl.appendChild(frag);
    }

    private renderEmojis(): void {
        if (!this.contentEl) return;
        const frag = document.createDocumentFragment();

        const recent = this.getRecentEmojis();
        const categories: EmojiCategory[] = [
            ...(recent.length ? [{ title: "Недавние", emojis: recent }] : []),
            ...EMOJI_CATEGORIES,
        ];

        categories.forEach((cat) => {
            const wrap = document.createElement("div");
            wrap.className = "sticker-emoji-overlay__emoji-category";

            const title = document.createElement("div");
            title.className = "sticker-emoji-overlay__emoji-category-title";
            title.textContent = cat.title;
            wrap.appendChild(title);

            const grid = document.createElement("div");
            grid.className = "sticker-emoji-overlay__emoji-category-grid";

            cat.emojis.forEach((emoji) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "sticker-emoji-overlay__emoji-button";
                btn.textContent = emoji;
                btn.setAttribute("aria-label", emoji);
                btn.addEventListener("click", () => {
                    this.pushRecentEmoji(emoji);
                    this.props.onSelectEmoji(emoji);
                });
                grid.appendChild(btn);
            });

            wrap.appendChild(grid);
            frag.appendChild(wrap);
        });

        this.contentEl.appendChild(frag);
    }

    private getRecentEmojis(): string[] {
        try {
            const raw = localStorage.getItem(RECENT_EMOJI_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.slice(0, RECENT_EMOJI_LIMIT) : [];
        } catch {
            return [];
        }
    }

    private pushRecentEmoji(emoji: string): void {
        try {
            const current = this.getRecentEmojis().filter((e) => e !== emoji);
            current.unshift(emoji);
            localStorage.setItem(
                RECENT_EMOJI_KEY,
                JSON.stringify(current.slice(0, RECENT_EMOJI_LIMIT)),
            );
        } catch {
            // localStorage недоступен (private mode) — игнорируем
        }
    }

    private positionPanel(): void {
        if (!this.panel) return;
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        // На мобиле панель прижата CSS-ом к низу, JS-позиционирование пропускаем.
        if (isMobile) return;

        const { anchorRect } = this.props;
        const margin = 8;
        const w = this.panel.offsetWidth || 340;
        const h = this.panel.offsetHeight || 460;

        // Открываем над якорем (кнопкой), выровнено по его левому краю.
        let left = anchorRect.left;
        let top = anchorRect.top - h - margin;

        if (top < margin) {
            top = anchorRect.bottom + margin;
        }
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
        top = Math.max(margin, top);

        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
    }

    protected beforeUnmount(): void {
        document.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("resize", this.handleResize);
        window.visualViewport?.removeEventListener("resize", this.handleResize);

        const backdrop = this.element?.querySelector(".sticker-emoji-overlay__backdrop");
        backdrop?.removeEventListener("click", this.handleBackdropClick);
    }
}
