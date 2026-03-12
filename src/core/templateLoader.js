import HandlebarsPromise from './handlebars.js';

const tempCahce = new Map();
let Handlebars = null;

export async function loadTemplate(modulePath) {
    if (!Handlebars) {
        Handlebars = await HandlebarsPromise;
    }

    if (tempCahce.has(modulePath)) {
        return tempCahce.get(modulePath);
    }

    try {
        const response = await fetch(modulePath); 
       
        if (!response.ok) {
            throw new Error(`Шаблон не найден ${modulePath}`);
        }

        const jsCode = await response.text();
        eval(jsCode);

        const tempName = modulePath
            .replace('/src', '')
            .replace('.precompiled.js', '.hbs')
            .replace(/^\//, ''); 

        const temp = Handlebars.templates[tempName]; 


        if (typeof temp !== 'function') {
            throw new Error(`Модуль ${modulePath} не экспортирует шаблон по умолчанию`);
        }

        tempCahce.set(modulePath, temp);
        return temp;
    } catch (error) {
        console.error(`Ошибка при загрузке шаблона ${modulePath}:`, error); 
        throw error;
    }
}