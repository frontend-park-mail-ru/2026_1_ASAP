declare module '*.hbs' {
    const template: (context?: object) => string;
    export default template;
}