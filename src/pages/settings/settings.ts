import template from "./settings.hbs";
import { BasePage, IBasePageProps } from "../../core/base/basePage";
import { MenuBar } from "../../components/composite/menuBar/menuBar";
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { SettingsListWrapper } from "../../components/composite/settingsListWrapper/settingsListWrapper";
import { contactService } from "../../services/contactService";
import { SettingsProfileWindow } from "../../components/composite/settingsProfileWindow/settingsProfileWindow";

/**
 * @interface SettingsPageProps
 * @description Свойства для компонента страницы настроек.
 * @extends IBasePageProps
 * @property {string} [currentPath] - Текущий URL-путь для внутреннего роутинга.
 */
interface SettingsPageProps extends IBasePageProps {
    currentPath?: string;
};

/**
 * @class SettingsPage
 * @extends BasePage
 * @description Страница настроек приложения. Позволяет пользователю просматривать
 * и редактировать свой профиль и другие параметры.
 *
 * @property {SearchForm | null} searchForm - Форма поиска (может быть неактивна).
 * @property {SettingsListWrapper | null} settingsListWrapper - Обертка для списка разделов настроек.
 * @property {MenuBar | null} menuBar - Нижнее меню навигации.
 * @property {SettingsProfileWindow | null} settingsWindow - Окно с настройками профиля.
 * @property {string | null} activeSetting - Идентификатор текущего активного раздела настроек.
 */
export class SettingsPage extends BasePage<SettingsPageProps> {
    private searchForm: SearchForm | null = null;
    private settingsListWrapper: SettingsListWrapper | null = null;
    private menuBar: MenuBar | null = null;
    private mainContentArea: HTMLElement | null = null;
    private placeHolder: HTMLElement | null = null;
    private activeSetting: string | null = null;
    private settingsWindow: SettingsProfileWindow | null = null;

    constructor(props: SettingsPageProps) {
        super(props);
    };

    getTemplate() {
        return template;
    }

    /**
     * Выполняется после монтирования страницы.
     * Инициализирует все компоненты и запускает внутренний роутер
     * для отображения нужного раздела настроек.
     * @protected
     */
    protected async afterMount(): Promise<void> {
        if (!this.element) return;

        this.searchForm = new SearchForm({
            router: this.props.router,
        });
        this.searchForm.mount(this.element!.querySelector('.settings-page__sidebar'));

        this.settingsListWrapper = new SettingsListWrapper({
            router: this.props.router,
            onProfileClick: () => this.openSetting('profile'),
        });
        this.settingsListWrapper.mount(this.element!.querySelector('.settings-page__sidebar'));

        this.menuBar = new MenuBar({
            onContactsClick: () => this.props.router.navigate('/contacts'),
            onMessagesClick: () => this.props.router.navigate('/chats'),
            onSettingsClick: () => this.props.router.navigate('/settings'),
        });
        this.menuBar.mount(this.element!.querySelector('.settings-page__sidebar'));
        this.menuBar.setActiveButton('settings');

        this.mainContentArea = this.element.querySelector('.settings-page__mainfield') || null;
        if (!this.mainContentArea) {
            console.error("Отсутствует элемент contacts-page__mainfield");
            return;
        }

        this.placeHolder = this.element.querySelector('.empty-field');
        this.placeHolder.style.display = 'none'; // временно, пока у нас только профиль в настройках

        await this.handleSettingsRoute();

    };

    /**
     * Обновляет свойства и перезапускает внутренний роутер.
     * @param {SettingsPageProps} newProps - Новые свойства.
     */
    public async updateProps(newProps: SettingsPageProps): Promise<void> {
        this.props = {...this.props, ...newProps};
        await this.handleSettingsRoute();
    }

    /**
     * Обрабатывает внутренний роутинг на странице настроек.
     * Определяет, какой раздел настроек открыть, на основе URL.
     * @private
     */
    private async handleSettingsRoute(): Promise<void> {
        const path = this.props.currentPath || window.location.pathname;
        const pathParts = path.split('/');
        const settingType = pathParts[pathParts.length - 1];

        const target = (settingType === 'settings' || settingType === 'profile') 
            ? 'profile' 
            : settingType;
        
        this.activeSetting = target;
        await this.openSetting(this.activeSetting);
    };

    /**
     * Открывает окно с определенным разделом настроек.
     * На данный момент реализовано только открытие профиля.
     * @param {string} activeSetting - Идентификатор раздела ('profile').
     * @private
     */
    private async openSetting(activeSetting: string): Promise<void> {
        if (!this.mainContentArea) {
            console.error("Отсутствует элемент mainContentArea");
            return;
        }

        if (this.placeHolder) {
            this.placeHolder.style.display = "none";
        }

        if (this.settingsWindow) {
            this.settingsWindow.unmount();
            this.settingsWindow = null;
        }

        if (activeSetting === "profile") {
            const userProfile = await contactService.getMyProfile();

            this.settingsWindow = new SettingsProfileWindow({
                profileAdditionalInfo: userProfile.additionalInfo,
                profileMainInfo: userProfile.mainInfo,
                closeWindow: this.closeSetting
            });
            this.settingsWindow.mount(this.mainContentArea!);
        } else {
            this.placeHolder.style.display = "block";
        }
    };

    /**
     * Закрывает текущее открытое окно настроек и показывает плейсхолдер.
     * @private
     */
    private closeSetting = (): void => {
        if (!this.settingsWindow) return;
        this.settingsWindow!.unmount();
        if (this.placeHolder)
            this.placeHolder.style.display = "block";
        this.activeSetting = null;
    };

    protected beforeUnmount(): void {
        this.searchForm?.unmount();
        this.menuBar?.unmount();
    };
};