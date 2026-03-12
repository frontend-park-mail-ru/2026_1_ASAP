/**
 * @file Скрипт прекомпиляции Handlebars-шаблонов.
 *
 * Рекурсивно находит все `.hbs`-файлы в `src/` и компилирует их
 * в единый файл `src/templates.js` с помощью CLI `handlebars`.
 *
 * Запуск: `node compileTemp.js`
 *
 * @module compileTemp
 */

import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(srcDir, 'templates.js');

console.log('Starting Handlebars precompilation...');
execSync(`handlebars "${srcDir}" -e hbs -f "${outputFile}"`, { stdio: 'inherit' }); 
console.log('Handlebars precompilation finished.');