from db import get_db_connection
import uuid

conn = get_db_connection()
cursor = conn.cursor()

# Categories
cursor.execute("""
INSERT IGNORE INTO categories (category_id, category_name)
VALUES
('C01','Điện thoại'),
('C02','Laptop'),
('C03','Tablet')
""")


# Products
cursor.execute("""
INSERT IGNORE INTO products (product_id, product_name, brand, category_id)
VALUES
('P01','iPhone 14','Apple','C01'),
('P02','Samsung S23','Samsung','C01')
""")


# Customers
cursor.execute("""
INSERT IGNORE INTO customers (customer_id, full_name, phone_number)
VALUES
('CUS01','Nguyễn Văn A','0901111111'),
('CUS02','Trần Thị B','0902222222')
""")



conn.commit()
cursor.close()
conn.close()

print("Seed data inserted")
