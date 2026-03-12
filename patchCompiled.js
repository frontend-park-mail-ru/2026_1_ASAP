import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const originalImport = /import Handlebars from "handlebars\/runtime";/;
    const newImport = `import Handlebars from "/core/handlebars.js";`; 

    if (originalImport.test(content)) {
        content = content.replace(originalImport, newImport);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[Patcher] Patched: ${path.relative(__dirname, filePath)}`);
    }
}

function findAndPatch(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findAndPatch(filePath);
        } else if (file.endsWith('.precompiled.js')) {
            patchFile(filePath);
        }
    }
}

console.log('[Patcher] Starting to patch precompiled templates...');
findAndPatch(srcDir);
console.log('[Patcher] Patching finished.');