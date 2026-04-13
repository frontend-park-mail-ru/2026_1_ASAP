/**
 * Экранирует специальные символы HTML для предотвращения XSS-атак.
 * @param {string} unsafe - Небезопасная строка с потенциальным HTML-кодом.
 * @returns {string} Безопасная строка с экранированными символами.
 */
export const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
