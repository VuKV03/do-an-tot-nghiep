import sqlite3

def main():
    conn = sqlite3.connect("backend/shared/database.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, code, name FROM cognitive_levels")
    print("cognitive_levels:", cursor.fetchall())
    
    cursor.execute("SELECT id, code, name FROM competency_components LIMIT 5")
    print("competency_components:", cursor.fetchall())
    
    conn.close()

if __name__ == "__main__":
    main()
