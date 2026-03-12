
import { getHandlebars } from './handlebars-wrapper.js';

let HandlebarsInstance = null;

export const initHandlebars = (async () => {
    HandlebarsInstance = await getHandlebars;
    
    if (!HandlebarsInstance) {
        throw new Error("Handlebars instance not available after loading wrapper.");
    }

    HandlebarsInstance.registerHelper('eq', function (v1, v2) {
        return v1 === v2;
    });

    HandlebarsInstance.registerHelper('and', function (...args) {
        const options = args.pop(); 
        return args.every(Boolean);
    });

    return HandlebarsInstance;
})();

export default initHandlebars;