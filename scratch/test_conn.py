import pymysql

passwords = ["", "root", "123456", "12345678", "admin", "mysql"]
success = False

for pwd in passwords:
    try:
        conn = pymysql.connect(
            host="localhost",
            port=3306,
            user="root",
            password=pwd,
            database="quan_ly_sinh_de_ai_v2"
        )
        print(f"[SUCCESS] Password: '{pwd}'")
        conn.close()
        success = True
        break
    except Exception as e:
        print(f"[FAILED] Password: '{pwd}' - {e}")

if not success:
    print("[FAILED] Could not connect with common passwords.")
