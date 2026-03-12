function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(window.Handlebars);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export const getHandlebars = loadScript('/vendor/handlebars/dist/handlebars.js');
