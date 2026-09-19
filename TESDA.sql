CREATE DATABASE IF NOT EXISTS tesda_disbursement_db;
USE tesda_disbursement_db;

CREATE TABLE users(
user_id INT AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(50) NOT NULL UNIQUE,
password VARCHAR(50) NOT NULL,
role ENUM('Admin', 'Greenprints', 'Scholar') NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scholars(
scholar_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NULL,
id_number VARCHAR(50) NOT NULL UNIQUE,
first_name VARCHAR(50) NOT NULL,
last_name VARCHAR(50) NOT NULL,
email VARCHAR(50),
course_program VARCHAR(100) NOT NULL,
batch_number VARCHAR(20) NOT NULL,
clearance_status ENUM('Cleared', 'Pending', 'Hold') DEFAULT 'Pending',
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE material_items(
item_id INT AUTO_INCREMENT PRIMARY KEY, 
item_name VARCHAR(100) NOT NULL,
item_type ENUM('Book', 'Uniform', 'Toolkit', 'Other') NOT NULL, 
unit_price DECIMAL(10, 2) NOT NULL,
description TEXT
);

CREATE TABLE scholar_payable(
payable_id INT AUTO_INCREMENT PRIMARY KEY,
scholaar_id INT NOT NULL,
item_id INT NOT NULL,
quantity INT DEFAULT 1,
total_amount DECIMAL (10, 2) NOT NULL,
payment_status ENUM('Unpaid', 'Partially Paid', 'Paid') DEFAULT 'Unpaid',
date_issued DATE NOT NULL,
FOREIGN KEY (scholar_id) REFERENCES scholars(scholar_id) ON DELETE CASCADE,
FOREIGN KEY (item_id) REFERENCES materials(item_id) ON DELETE CASCADE
);

CREATE TABLE paayments(
payment_id INT AUTO_INCREMENT PRIMARY KEY,
payable_id INT NOT NULL,
or_number VARCHAR(50) NOT NULL UNIQUE,
amount_paid DECIMAL (10, 2) NOT NULL,
payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (payable_id) REFERENCES scholar_payables(payable_id) ON DELETE CASCADE
);

CREATE TABLE check_disbursements (
disbursement_id INT AUTO_INCREMENT PRIMARY KEY,
scholar_id INT NOT NULL,
check_number VARCHAR(50) NOT NULL UNIQUE,
batch_detail VARCHAR(50) NOT NULL,
allowance_amount DECIMAL(10, 2) NOT NULL,
disbursement_status ENUM('Pending Clearance', 'Released', 'On Hold') DEFAULT 'Pending Clearance',
FOREIGN KEY (scholar_id) REFERENCES scholars(scholar_id) ON DELETE CASCADE
);