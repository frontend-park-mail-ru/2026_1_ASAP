import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const outputName = '.precompiled.js';

function compileTemplate(hbsFilePath) {
    const jsFilePath = hbsFilePath.replace('.hbs', outputName);
    console.log(`Compiling: ${path.relative(__dirname, hbsFilePath)} -> ${path.relative(__dirname, jsFilePath)}`);

    try {
        execSync(`handlebars "${hbsFilePath}" -f "${jsFilePath}" -m`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error compiling ${hbsFilePath}:`, error.message);
        process.exit(1);
    }
}

function findAndCompile(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            findAndCompile(filePath);
        } else if (file.endsWith('.hbs')) {
            compileTemplate(filePath);
        }
    }
}

console.log('Starting Handlebars precompilation...');
findAndCompile(srcDir);
console.log('Handlebars precompilation finished.');