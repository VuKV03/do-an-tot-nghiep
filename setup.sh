#!/bin/bash

echo "======================================================================="
echo "    TỰ ĐỘNG CÀI ĐẶT VÀ CẤU HÌNH HỆ THỐNG QUẢN LÝ SINH ĐỀ AI v2.0"
echo "======================================================================="
echo ""

# 1. Kiểm tra Git, Node, Python
command -v git >/dev/null 2>&1 || { echo "[LỖI] Chưa cài đặt Git!"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[LỖI] Chưa cài đặt Node.js!"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "[LỖI] Chưa cài đặt Python3!"; exit 1; }

echo "[1/4] Tạo file cấu hình môi trường .env..."
if [ ! -f .env ]; then
cat <<EOT > .env
PORT=3000
GEMINI_API_KEY_SINGLE="AQ.Ab8RN6J62XFnsUT2jgqQ0J2nZay41dDmWVoknKQ74TCbtHNPMg"
GEMINI_API_KEY_TRUEFALSE="AQ.Ab8RN6KoPAP0aworCdylsXIB4dtBFEOSwDMTdjlhQ6CO-W2yPA"
GEMINI_API_KEY_SHORT="AQ.Ab8RN6LQkIeGFUFQdnWm4AgMUoFfLn1M3ttOL8AHTWGQLZ54Qg"
GEMINI_API_KEY_SPARE_1=""
APP_URL="http://localhost:3000"
DB_HOST=gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com
DB_PORT=4000
DB_USER=338z5oDUxdCvTYx.root
DB_PASSWORD=zXdZ5bfA39P5Rr8r
DB_NAME=quan_ly_sinh_de_ai_v2
DB_SSL=true
EOT
    echo "[OK] Đã tạo file .env thành công!"
else
    echo "[OK] File .env đã tồn tại."
fi

echo ""
echo "[2/4] Cài đặt phụ thuộc Frontend (npm install)..."
npm install

echo ""
echo "[3/4] Khởi tạo môi trường ảo Python và cài đặt phụ thuộc Backend..."
if [ ! -d "dev" ]; then
    python3 -m venv dev
fi

dev/bin/pip install -r requirements.txt

echo ""
echo "======================================================================="
echo "[THÀNH CÔNG] ĐÃ HOÀN TẤT CÀI ĐẶT VÀ CẤU HÌNH HỆ THỐNG!"
echo "======================================================================="
echo ""
read -p "Bạn có muốn khởi chạy hệ thống ngay bây giờ? (y/n): " choice
case "$choice" in 
  y|Y ) npm run dev;;
  * ) echo "Chạy hệ thống bằng lệnh: npm run dev";;
esac
