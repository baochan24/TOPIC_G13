-- ===============================
-- 1. DATABASE
-- ===============================
DROP DATABASE IF EXISTS electronic_store;
CREATE DATABASE electronic_store_system;
USE electronic_store_system;

-- ===============================
-- 2. USERS & ROLES
-- ===============================
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE roles (
    role_id VARCHAR(20) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL
);

show tables ;

CREATE TABLE user_roles (
    user_id VARCHAR(20),
    role_id VARCHAR(20),
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ===============================
-- 3. CUSTOMERS
-- ===============================
CREATE TABLE customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100),
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(100),
    address TEXT
);


-- ===============================
-- 4. CATEGORIES & PRODUCTS
-- ===============================
CREATE TABLE categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    base_price DECIMAL(12,2),
    warranty_period INT,
    category_id VARCHAR(20),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- ===============================
-- 5. ITEMS (IMEI)
-- ===============================
CREATE TABLE items (
    imei_serial CHAR(15) PRIMARY KEY,
    product_id VARCHAR(20),
    status ENUM('IN_STOCK','SOLD','WARRANTY','DEFECT') DEFAULT 'IN_STOCK',
    item_condition ENUM('NEW','USED') DEFAULT 'NEW',
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ===============================
-- 6. ORDERS
-- ===============================
CREATE TABLE orders (
    order_id VARCHAR(20) PRIMARY KEY,
    staff_id VARCHAR(20),
    customer_id VARCHAR(20),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12,2),
    FOREIGN KEY (staff_id) REFERENCES users(user_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
    order_item_id VARCHAR(30) PRIMARY KEY,
    order_id VARCHAR(20),
    imei_serial CHAR(15) UNIQUE,
    sell_price DECIMAL(12,2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (imei_serial) REFERENCES items(imei_serial)
);

-- ===============================
-- 7. PAYMENTS
-- ===============================
CREATE TABLE payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20),
    amount DECIMAL(12,2),
    payment_method ENUM('CASH','CARD','BANK_TRANSFER'),
    payment_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- ===============================
-- 8. WARRANTY
-- ===============================
CREATE TABLE warranty_tickets (
    warranty_id VARCHAR(20) PRIMARY KEY,
    imei_serial CHAR(15),
    staff_id VARCHAR(20),
    check_date DATETIME,
    note TEXT,
    FOREIGN KEY (imei_serial) REFERENCES items(imei_serial),
    FOREIGN KEY (staff_id) REFERENCES users(user_id)
);

-- ===============================
-- 9. INVENTORY
-- ===============================
CREATE TABLE inventory_tickets (
    ticket_id VARCHAR(20) PRIMARY KEY,
    staff_id VARCHAR(20),
    check_date DATETIME,
    note TEXT,
    FOREIGN KEY (staff_id) REFERENCES users(user_id)
);

CREATE TABLE inventory_ticket_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    imei_serial CHAR(15),
    actual_status ENUM('FOUND','MISSING','EXTRA'),
    FOREIGN KEY (ticket_id) REFERENCES inventory_tickets(ticket_id),
    FOREIGN KEY (imei_serial) REFERENCES items(imei_serial)
);

-- ===============================
-- 10. RETURNS
-- ===============================
CREATE TABLE return_tickets (
    return_id VARCHAR(20) PRIMARY KEY,
    order_item_id VARCHAR(30),
    reason TEXT,
    refund_amount DECIMAL(12,2),
    return_date DATETIME,
    staff_id VARCHAR(20),
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
    FOREIGN KEY (staff_id) REFERENCES users(user_id)
);

-- ===============================
-- 11. SYSTEM LOGS
-- ===============================
CREATE TABLE system_logs (
    log_id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(20),
    action VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE TABLE item_lifecycle_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imei_serial CHAR(15),
    action ENUM('IMPORTED','SOLD','WARRANTY','RETURNED'),
    ref_id VARCHAR(30),          -- order_id / warranty_id
    performed_by VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (imei_serial) REFERENCES items(imei_serial),
    FOREIGN KEY (performed_by) REFERENCES users(user_id)
);

#============ Cac update & fix loi 
ALTER TABLE warranty_tickets
CHANGE staff_Id staff_id VARCHAR(20);

ALTER TABLE warranty_tickets
CHANGE check_Date check_date DATETIME;

ALTER TABLE warranty_tickets
ADD status ENUM(
    'RECEIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'RETURNED'
) DEFAULT 'RECEIVED';

ALTER TABLE warranty_tickets
ADD service_fee DECIMAL(12,2) DEFAULT 0;

ALTER TABLE warranty_tickets
ADD CONSTRAINT fk_warranty_staff
FOREIGN KEY (staff_id) REFERENCES users(user_id);

ALTER TABLE warranty_tickets
ADD service_fee DECIMAL(12,2) DEFAULT 0;

ALTER TABLE users
ADD failed_attempts INT DEFAULT 0,
ADD is_locked TINYINT DEFAULT 0;

ALTER TABLE customers ADD customer_group VARCHAR(50);


CREATE INDEX idx_customer_name ON customers(full_name);
CREATE INDEX idx_customer_email ON customers(email);

ALTER TABLE users
ADD full_name VARCHAR(100),
ADD is_active TINYINT DEFAULT 1,
ADD created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE items
ADD imported_at DATETIME DEFAULT CURRENT_TIMESTAMP;


  -- ===========================insert data
INSERT INTO users (user_id, username, password_hash) VALUES
('NV01', 'nhanvien1', 'hash_demo_1'),
('KT01', 'kythuat1', 'hash_demo_2');

INSERT INTO roles (role_id, role_name) VALUES
('R1', 'STAFF'),
('R2', 'TECHNICIAN');

INSERT INTO user_roles (user_id, role_id) VALUES
('NV01', 'R1'),
('KT01', 'R2');

INSERT INTO categories (category_id, category_name, description)
VALUES ('C01', 'Smartphone', 'Điện thoại thông minh');

INSERT INTO products (product_id, product_name, brand, base_price, warranty_period)
VALUES ('P001', 'iPhone 13', 'Apple', 20000000, 12);

INSERT INTO items (imei_serial, product_id, status)
VALUES ('123456789012345', 'P001', 'SOLD');

INSERT INTO roles (role_id, role_name)
VALUES
(1, 'ADMIN'),
(2, 'STAFF');



INSERT INTO users (
  user_id,
  username,
  password_hash,
  full_name,
  email,
  phone,
  failed_attempts,
  is_locked
)
VALUES (
  'AD001',
  'admin',
  '$2b$12$jU.cu9hkYq/z5LOZC/7VK.DqwPrEd2QHNd4TK4DjekLNRxt7/o2bO',
  'Quản trị viên',
  'admin@gmail.com',
  '0909000000',
  0,
  0
);

SELECT user_id, username, password_hash, is_locked
FROM users
WHERE user_id = 'AD001';


INSERT INTO users (
  user_id, username, password_hash, full_name, email, phone,
  failed_attempts, is_locked
)
VALUES (
  'NV001',
  'staff01',
  '$2b$12$vqYmPIrLfxeNZgumipULLOlDWDK3dG.gpbokPO7OqIRjt0ToTR0t',
  'Nhân viên 01',
  'staff01@gmail.com',
  '0909111111',
  0,
  0
);

UPDATE users
SET password_hash = '$2b$12$jJ5g8DupzRyVNoZi0gggr.tij46ieakuv4lFQCGMiPYSwBKcDkNYu',
    failed_attempts = 0,
    is_locked = 0
WHERE user_id = 'AD001';

SELECT r.role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.role_id
WHERE ur.user_id = 'AD001';

INSERT IGNORE INTO roles (role_id, role_name)
VALUES ('R_ADMIN', 'ADMIN');

INSERT IGNORE INTO user_roles (user_id, role_id)
VALUES ('AD001', 'R_ADMIN');

SELECT u.user_id, u.username, r.role_id, r.role_name
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
WHERE u.user_id = 'AD001';
SELECT u.user_id, u.username, u.password_hash, u.is_locked, r.role_name
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
WHERE u.username = 'admin';


INSERT INTO user_roles VALUES ('NV001', 2);


INSERT INTO user_roles VALUES ('AD001', 1);

ALTER TABLE users
ADD COLUMN full_name VARCHAR(100) NOT NULL,
ADD COLUMN email VARCHAR(100),
ADD COLUMN phone VARCHAR(20);


SELECT u.user_id, u.username, r.role_name
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id;
INSERT INTO roles (role_id, role_name)
VALUES ('R_ADMIN', 'ADMIN');

DESC items;

