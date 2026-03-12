import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(srcDir, 'templates.js');

console.log('Starting Handlebars precompilation...');
execSync(`handlebars "${srcDir}" -e hbs -f "${outputFile}"`, { stdio: 'inherit' }); 
console.log('Handlebars precompilation finished.');