const tempCahce = new Map();

export async function loadTemplate(path) {
    if (tempCahce.has(path)) {
        return tempCahce.get(path);
    }
    const resp = await fetch(path)
    if (!resp.ok) {
        throw new Error(`Шаблон не найден ${path}`);
    }
    const temp = Handlebars.compile(await resp.text());
    tempCahce.set(path, temp);

    return temp;
}
