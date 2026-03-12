import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const outputExtension = '.precompiled.js';

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('Handlebars.template')) {
        console.log(`[Patcher] Verified Handlebars usage in: ${path.relative(__dirname, filePath)}. No import patching needed.`);
    } else {
        console.warn(`[Patcher] WARNING: File ${path.relative(__dirname, filePath)} does not seem to be a Handlebars template or is unexpected.`);
    }
}

function findAndPatch(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findAndPatch(filePath);
        } else if (file.endsWith(outputExtension)) {
            patchFile(filePath);
        }
    }
}

console.log('[Patcher] Starting to patch precompiled templates...');
findAndPatch(srcDir);
console.log('[Patcher] Patching finished.');