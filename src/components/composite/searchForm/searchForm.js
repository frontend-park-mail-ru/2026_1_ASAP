import { BaseForm } from '../../../core/base/baseForm.js';
import { Input } from '../../ui/input/input.js';
import { Button } from '../../ui/button/button.js';
import { Avatar } from '../../ui/avatar/avatar.js';

export class SearchForm extends BaseForm {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'search';
        wrapper.innerHTML = `
            <div class="search-panel"></div>
            <div class="add-button-cont"></div>
        `;
        return wrapper;
    }

    afterMount() {
        this.searchImg = new Avatar({
            src: "../../../assets/images/icons/searchIcon.svg",
            class: "search-icon",
        });
        this.searchImg.mount(this.element.querySelector('.search-panel'));
        this.input = new Input({
            type: "text", 
            placeholder: "Поиск", 
            name: "search", 
            class: "search-line",
            showErrorText: false,
        });
        
        this.input.mount(this.element.querySelector('.search-panel'));

        this.deleteButton = new Button({
            class: "delete-button",
            icon: "../../../assets/images/icons/deleteIcon.svg",
        });
        this.deleteButton.mount(this.element.querySelector('.search-panel'));

        this.addButton = new Button({
            class: "add-button",
            icon: "../../../assets/images/icons/deleteIcon.svg",
            daughterClass: "add-icon",
        });
        this.addButton.mount(this.element.querySelector('.add-button-cont'));
    }
}