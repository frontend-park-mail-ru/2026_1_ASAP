const tempCahce = new Map();

export async function loadTemplate(modulePath) {
    if (tempCahce.has(modulePath)) {
        return tempCahce.get(modulePath);
    }

    try {
        const module = await import(modulePath);
        const temp = module.default;

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