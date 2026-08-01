import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

const isWindows = os.platform() === 'win32';
const venvDir = 'dev';
const pythonCmd = isWindows ? `${venvDir}\\Scripts\\python.exe` : `${venvDir}/bin/python`;
const pipCmd = isWindows ? `${venvDir}\\Scripts\\pip.exe` : `${venvDir}/bin/pip`;

// 1. Kiểm tra môi trường ảo đã tồn tại chưa
if (!fs.existsSync(venvDir) || !fs.existsSync(pythonCmd)) {
    console.log("🛠️ Chưa tìm thấy môi trường Python ảo (hoặc môi trường bị lỗi). Đang tạo tự động...");
    
    // Xóa thư mục dev cũ nếu có nhưng bị lỗi (thiếu file thực thi)
    if (fs.existsSync(venvDir)) {
        fs.rmSync(venvDir, { recursive: true, force: true });
    }

    try {
        execSync(`python -m venv ${venvDir}`, { stdio: 'inherit' });
        console.log("📦 Đang cài đặt các thư viện Python...");
        execSync(`${pipCmd} install -r requirements.txt`, { stdio: 'inherit' });
    } catch (error) {
        console.error("❌ Lỗi trong quá trình tạo môi trường ảo Python. Vui lòng đảm bảo bạn đã cài đặt Python trên máy.");
        process.exit(1);
    }
}

// 2. Chạy frontend và backend
console.log("🚀 Đang khởi động dự án (Frontend Admin, Frontend Portal và Backend)...");
try {
    execSync(`npx concurrently "vite" "vite --port 5174" "${pythonCmd} start_services.py"`, { stdio: 'inherit' });
} catch (error) {
    // Process exits normally when terminated
}
