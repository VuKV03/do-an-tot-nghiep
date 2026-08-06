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

const SRC_DIR = path.join(process.cwd(), 'src');
const CONFIG_PATH = path.join(process.cwd(), 'src', 'config', 'apiConfig');

walkDir(SRC_DIR, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    if (filePath.endsWith('apiConfig.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    if (!content.includes('https://api.quanlythi.site')) return;

    // 1. Replace single/double quoted 'https://api.quanlythi.site/api/...' -> `${API_BASE_URL}/...`
    content = content.replace(/['"]https:\/\/api\.quanlythi\.site\/api(\/[^'"]*)?['"]/g, (match, subPath) => {
        return subPath ? `\`\${API_BASE_URL}${subPath}\`` : `API_BASE_URL`;
    });

    // 2. Replace inside existing template strings: `https://api.quanlythi.site/api/...` -> `${API_BASE_URL}/...`
    content = content.replace(/https:\/\/api\.quanlythi\.site\/api/g, '${API_BASE_URL}');

    // 3. Replace single/double quoted 'https://api.quanlythi.site/...' (without /api) -> `${BASE_URL}/...`
    content = content.replace(/['"]https:\/\/api\.quanlythi\.site(\/[^'"]*)?['"]/g, (match, subPath) => {
        return subPath ? `\`\${BASE_URL}${subPath}\`` : `BASE_URL`;
    });

    // 4. Replace remaining template strings: `https://api.quanlythi.site/...` -> `${BASE_URL}/...`
    content = content.replace(/https:\/\/api\.quanlythi\.site/g, '${BASE_URL}');

    if (content !== original) {
        let fileDir = path.dirname(filePath);
        let relPath = path.relative(fileDir, CONFIG_PATH).replace(/\\/g, '/');
        if (!relPath.startsWith('.')) {
            relPath = './' + relPath;
        }

        const needApiBaseUrl = content.includes('API_BASE_URL');
        const needBaseUrl = content.includes('BASE_URL');

        // Check if apiConfig is already imported in this file
        const apiConfigImportRegex = /import\s+{[^}]*}\s+from\s+['"][^'"]*apiConfig['"];?/;
        const match = content.match(apiConfigImportRegex);

        if (match) {
            // Update existing import to include missing symbols
            let currentImport = match[0];
            let importsToSet = new Set();
            if (currentImport.includes('API_BASE_URL') || needApiBaseUrl) importsToSet.add('API_BASE_URL');
            if (currentImport.includes('BASE_URL') || needBaseUrl) importsToSet.add('BASE_URL');
            let newImport = `import { ${Array.from(importsToSet).join(', ')} } from '${relPath}';`;
            content = content.replace(currentImport, newImport);
        } else {
            // Add new import statement at the top of file
            let importsToSet = [];
            if (needApiBaseUrl) importsToSet.push('API_BASE_URL');
            if (needBaseUrl) importsToSet.push('BASE_URL');
            if (importsToSet.length > 0) {
                let importStmt = `import { ${importsToSet.join(', ')} } from '${relPath}';\n`;
                content = importStmt + content;
            }
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + path.relative(process.cwd(), filePath));
    }
});
console.log('Finished updating API URLs.');
