CREATE DATABASE IF NOT EXISTS soul_mate_connect
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE soul_mate_connect;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  county VARCHAR(100) NOT NULL,
  occupation VARCHAR(120) NOT NULL,
  relationship_preference VARCHAR(80) NOT NULL,
  bio TEXT NOT NULL,
  interests VARCHAR(255) DEFAULT '',
  image_url VARCHAR(1000) DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_public_profiles (is_approved, is_available),
  INDEX idx_age (age),
  INDEX idx_county (county),
  INDEX idx_occupation (occupation),
  INDEX idx_relationship (relationship_preference)
);
