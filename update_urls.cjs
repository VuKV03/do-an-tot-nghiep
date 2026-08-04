const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const API_BASE = 'https://api.quanlythi.site';
const SRC_DIR = path.join(process.cwd(), 'src');

walkDir(SRC_DIR, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace specific BASE_URL declarations
    content = content.replace(/const BASE_URL = '';/g, `const BASE_URL = '${API_BASE}';`);
    content = content.replace(/const BASE_URL = 'http:\/\/localhost:8001';/g, `const BASE_URL = '${API_BASE}';`);
    content = content.replace(/const BASE_URL = 'http:\/\/localhost:8000';/g, `const BASE_URL = '${API_BASE}';`);
    content = content.replace(/const BASE_URL = 'http:\/\/localhost:8005';/g, `const BASE_URL = '${API_BASE}';`);

    // Replace hardcoded localhost
    content = content.replace(/http:\/\/localhost:8000/g, API_BASE);
    content = content.replace(/http:\/\/localhost:8001/g, API_BASE);
    content = content.replace(/http:\/\/localhost:8005/g, API_BASE);

    // Replace fetch('/api/... with fetch('https://api.quanlythi.site/api/...
    content = content.replace(/fetch\(\s*['"](\/api\/[^'"]*)['"]/g, `fetch('${API_BASE}$1'`);
    content = content.replace(/fetch\(\s*`(\/api\/[^`]*)`/g, `fetch(\`${API_BASE}$1\``);

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + filePath);
    }
});
console.log('Done');
