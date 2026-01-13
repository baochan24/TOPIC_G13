import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",        # đổi nếu khác
        password="1234",  # đổi theo máy bạn
        database="elcetronic_store"
    )
if __name__ == "__main__":
    conn = get_db_connection()
    print("KẾT NỐI DB OK")
    conn.close()
