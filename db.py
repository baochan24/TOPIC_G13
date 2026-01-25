import mysql.connector
from contextlib import contextmanager

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="electronic_store_system"
    )

@contextmanager
def db_cursor():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
