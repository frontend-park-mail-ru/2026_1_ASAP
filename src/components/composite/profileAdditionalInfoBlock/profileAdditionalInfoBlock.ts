import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileAdditionalInfo } from "../../../types/profile";
import template from "./profileAdditionalInfoBlock.hbs"

interface ProfileAdditionalInfoBlockProps extends IBaseComponentProps {
    profileAdditionalInfo: ProfileAdditionalInfo;
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

    protected afterMount(): void {
        this.fullText = this.props.profileAdditionalInfo.bio;
        this.bioText = this.element.querySelector('.bio-text');
        this.bioContainer = this.element.querySelector('.bio-container');
        this.bioInfo = this.element.querySelector('.bio-info');

        this.resizeObserver = new ResizeObserver(() => {
            this.truncate();
        });
        this.resizeObserver.observe(this.bioContainer);

    };

    protected beforeUnmount(): void {
        this.resizeObserver?.disconnect();
    };
};