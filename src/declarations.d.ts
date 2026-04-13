/**
 * @file declarations.d.ts
 * @description Декларации типов для нестандартных модулей (HBS, SCSS).
 */

declare module "*.hbs" {
    import { TemplateDelegate } from "handlebars";
    const template: TemplateDelegate;
    export default template;
}

declare module "*.scss" {
    const content: { [className: string]: string };
    export default content;
}

declare module "*.css" {
    const content: { [className: string]: string };
    export default content;
}
