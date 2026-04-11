import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileAdditionalInfo } from "../../../types/profile";
import { EditableField } from "../settingsProfileWindow/settingsProfileWindow";
import template from "./profileAdditionalInfoBlock.hbs"

interface ProfileAdditionalInfoBlockProps extends IBaseComponentProps {
    profileAdditionalInfo: ProfileAdditionalInfo;
    class?: string;
    onEditOverlay?: (fieldKey: EditableField, value: string) => void;
};

export class ProfileAdditionalInfoBlock extends BaseComponent<ProfileAdditionalInfoBlockProps> {
    private bioText : HTMLElement | null = null;
    private bioInfo: HTMLElement | null = null;
    private bioContainer : HTMLElement | null = null;
    private fullText: string | null = null;
    private toggleBtn: HTMLElement | null = null;
    private hiddenFlag: Boolean | null = null;
    private truncatedText: string | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private isTruncating = false;

    constructor(props: ProfileAdditionalInfoBlockProps) {
        super(props);
        this.props.class = props.class;
    };

    getTemplate() {
        return template;
    }

    private handleClick = () => {
        if (this.hiddenFlag) {
            this.resizeObserver?.disconnect();
            this.bioText.textContent = this.fullText;
            this.toggleBtn.textContent = 'Скрыть';
            this.bioContainer.classList.add('bio-container--disclosed');
            this.hiddenFlag = false;
            this.bioInfo.style.alignItems = 'flex-start';
            this.bioContainer.style.height = '';
        } else {
            this.bioText.textContent = this.truncatedText;
            this.toggleBtn.textContent = 'Читать полностью';
            this.bioContainer.classList.remove('bio-container--disclosed');
            this.hiddenFlag = true;
            this.resizeObserver?.observe(this.bioContainer);
            this.bioContainer.style.height = '4.5em';
            this.bioInfo.style.alignItems = 'flex-start'
        }
    };

    private truncate(): void {
        if (this.isTruncating) return;
        this.isTruncating = true;

        this.toggleBtn?.remove();
        this.hiddenFlag = null;
        this.bioText.textContent = this.fullText;
        this.bioContainer.classList.remove('bio-container--disclosed');

        if (this.bioContainer.scrollHeight > this.bioContainer.clientHeight) {
            this.hiddenFlag = true;
            this.toggleBtn = document.createElement('span');
            this.toggleBtn.className = 'bio-toggle';
            this.toggleBtn.textContent = 'Читать полностью';
            this.bioContainer.appendChild(this.toggleBtn);
            let lo: number = 0;
            let hi: number = this.fullText.length;
            while (lo < hi - 1) {
                let mid: number = Math.floor((lo + hi) / 2);
                this.bioText.textContent = this.fullText.slice(0, mid) + '... ';
                if (this.bioContainer.scrollHeight <= this.bioContainer.clientHeight) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            this.truncatedText = this.fullText.slice(0, lo) + '... ';
            this.bioText.textContent = this.truncatedText;
            this.toggleBtn.addEventListener('click', this.handleClick);
            this.isTruncating = false;
            this.bioInfo.style.alignItems = 'flex-start'
        } else {
            this.bioContainer.style.height = 'auto';
            this.bioInfo.style.alignItems = 'center';
        }
    };

    private handleFieldClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        if (target.closest('.bio-toggle')) return;

        const editable = target.closest('[data-editable=true]') as HTMLElement;
        if (!editable) return;

        const field = editable.dataset.field;
        if (!field || !['login', 'email', 'birthDate', 'bio'].includes(field)) return;
        const value = editable.textContent.trim() || "";

        this.props.onEditOverlay(field as EditableField, value);
    };

    protected afterMount(): void {
        this.fullText = this.props.profileAdditionalInfo.bio;
        this.bioText = this.element.querySelector('.bio-text');
        this.bioContainer = this.element.querySelector('.bio-container');
        this.bioInfo = this.element.querySelector('.bio-info');
        if (this.props.class === "settings-additional-info")
            this.element!.addEventListener("click", this.handleFieldClick);

        this.resizeObserver = new ResizeObserver(() => {
            this.truncate();
        });
        if (!this.bioContainer) {
            return;
        }
        this.resizeObserver.observe(this.bioContainer);
    };

    protected beforeUnmount(): void {
        this.resizeObserver?.disconnect();
        if (this.props.class === "settings-additional-info")
            this.element!.removeEventListener("click", this.handleFieldClick);
    };
};