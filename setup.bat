@echo off
chcp 65001 > nul
echo =======================================================================
echo     TỰ ĐỘNG CÀI ĐẶT VÀ CẤU HÌNH HỆ THỐNG QUẢN LÝ SINH ĐỀ AI v2.0
echo =======================================================================
echo.

REM 1. Kiểm tra Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa cài đặt Git! Vui lòng cài Git trước.
    pause
    exit /b 1
)

REM 2. Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa cài đặt Node.js! Vui lòng cài Node.js trước.
    pause
    exit /b 1
)

REM 3. Kiểm tra Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa cài đặt Python! Vui lòng cài Python và tích chọn "Add Python to PATH".
    pause
    exit /b 1
)

echo [1/4] Tạo file cấu hình môi trường .env...
if not exist ".env" (
    (
        echo PORT=3000
        echo GEMINI_API_KEY_SINGLE="AQ.Ab8RN6J62XFnsUT2jgqQ0J2nZay41dDmWVoknKQ74TCbtHNPMg"
        echo GEMINI_API_KEY_TRUEFALSE="AQ.Ab8RN6KoPAP0aworCdylsXIB4dtBFEOSwDMTdjlhQ6CO-W2yPA"
        echo GEMINI_API_KEY_SHORT="AQ.Ab8RN6LQkIeGFUFQdnWm4AgMUoFfLn1M3ttOL8AHTWGQLZ54Qg"
        echo GEMINI_API_KEY_SPARE_1=""
        echo APP_URL="http://localhost:3000"
        echo DB_HOST=gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com
        echo DB_PORT=4000
        echo DB_USER=338z5oDUxdCvTYx.root
        echo DB_PASSWORD=zXdZ5bfA39P5Rr8r
        echo DB_NAME=quan_ly_sinh_de_ai_v2
        echo DB_SSL=true
    ) > .env
    echo [OK] Đã tạo file .env thành công với cấu hình TiDB Cloud!
) else (
    echo [OK] File .env đã tồn tại, bỏ qua bước khởi tạo .env.
)

echo.
echo [2/4] Cài đặt phụ thuộc Frontend (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [LỖI] Cài đặt npm dependencies thất bại!
    pause
    exit /b 1
)

echo.
echo [3/4] Khởi tạo môi trường ảo Python và cài đặt phụ thuộc Backend...
if not exist "dev" (
    python -m venv dev
)

call dev\Scripts\pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [LỖI] Cài đặt Python requirements thất bại!
    pause
    exit /b 1
)

echo.
echo =======================================================================
echo [THÀNH CÔNG] ĐÃ HOÀN TẤT CÀI ĐẶT VÀ CẤU HÌNH HỆ THỐNG!
echo =======================================================================
echo.
set /p CHOICE="Bạn có muốn khởi chạy hệ thống ngay bây giờ? (Y/N): "
if /i "%CHOICE%"=="Y" (
    echo Đang khởi chạy hệ thống...
    npm run dev
) else (
    echo Bạn có thể khởi chạy hệ thống bất cứ lúc nào bằng lệnh: npm run dev
    pause
)
