import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './onboardingEmpty.hbs';

interface OnboardingEmptyProps extends IBaseComponentProps {
    onComplete: () => void;
}

const TOTAL_STEPS = 4;
const TRANSITION_MS = 200;

const PROGRESS: Array<{ label: string; pct: string; value: string }> = [
    { label: '1', pct: '25%',  value: '1' },
    { label: '2', pct: '50%',  value: '2' },
    { label: '3', pct: '75%',  value: '3' },
    { label: '4', pct: '100%', value: '4' },
];

export class OnboardingEmpty extends BaseComponent<OnboardingEmptyProps> {
    private step = 0;
    private transitioning = false;
    private checkTimers: ReturnType<typeof setTimeout>[] = [];

    constructor(props: OnboardingEmptyProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this._element) return;

        this._element.querySelector('.onboarding__skip')
            ?.addEventListener('click', this.handleSkip);

        this._element.querySelectorAll('.onboarding__dot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const goto = parseInt(target.dataset.goto ?? '0', 10);
                this.goTo(goto);
            });
        });

        this._element.querySelectorAll('.onboarding__cta').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                if (idx === TOTAL_STEPS - 1) {
                    this.handleComplete();
                } else {
                    this.goTo(idx + 1);
                }
            });
        });
    }

    protected beforeUnmount(): void {
        this.checkTimers.forEach(t => clearTimeout(t));
        this.checkTimers = [];
        this._element?.querySelector('.onboarding__skip')
            ?.removeEventListener('click', this.handleSkip);
    }

    private readonly handleSkip = (): void => {
        this._props.onComplete();
    };

    private handleComplete(): void {
        this._props.onComplete();
    }

    private goTo(next: number): void {
        if (this.transitioning || next === this.step || !this._element) return;
        this.transitioning = true;

        this._element.classList.add('onboarding--transitioning');

        setTimeout(() => {
            if (!this._element) return;
            this.step = next;
            this._element.dataset.step = String(next);
            this.updateProgress();
            this._element.classList.remove('onboarding--transitioning');
            this.transitioning = false;

            if (next === 3) {
                this.animateChecklist();
            }
        }, TRANSITION_MS);
    }

    private updateProgress(): void {
        if (!this._element) return;
        const p = PROGRESS[this.step];

        const stepNum = this._element.querySelector('.ob-step-num');
        if (stepNum) stepNum.textContent = p.label;

        const pctEl = this._element.querySelector('.onboarding__progress-pct');
        if (pctEl) pctEl.textContent = p.pct;

        const bar = this._element.querySelector<HTMLElement>('.onboarding__progress-bar');
        if (bar) bar.style.width = p.pct;

        const progressEl = this._element.querySelector<HTMLProgressElement>('.onboarding__progress-a11y');
        if (progressEl) progressEl.value = parseInt(p.value, 10);

        this._element.querySelectorAll('.onboarding__dot').forEach((dot, i) => {
            dot.classList.toggle('onboarding__dot--active', i <= this.step);
        });
    }

    private animateChecklist(): void {
        this.checkTimers.forEach(t => clearTimeout(t));
        this.checkTimers = [];

        [0, 1, 2].forEach(i => {
            const t = setTimeout(() => {
                const item = this._element?.querySelector(`.ob-check__item--${i}`);
                item?.classList.add('ob-check__item--done');
            }, 600 + i * 700);
            this.checkTimers.push(t);
        });
    }
}
