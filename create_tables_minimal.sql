-- Chạy file này trong MySQL nếu chưa có bảng (ví dụ: mysql -u root -p electronic_store_system < create_tables_minimal.sql)
-- Tạo database:  CREATE DATABASE IF NOT EXISTS electronic_store_system; USE electronic_store_system;

-- Bảng roles
CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL
);
INSERT IGNORE INTO roles (role_id, role_name) VALUES (1,'ADMIN'),(2,'STAFF'),(3,'MANAGER'),(4,'ACCOUNTANT');

-- Bảng users (cột tối thiểu cho đăng nhập)
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  failed_attempts INT DEFAULT 0,
  is_locked TINYINT(1) DEFAULT 0
);

-- Bảng user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(50),
  role_id INT,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- Bảng system_logs (cho auth và các module ghi log)
CREATE TABLE IF NOT EXISTS system_logs (
  log_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(255),
  ip_address VARCHAR(50) DEFAULT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
