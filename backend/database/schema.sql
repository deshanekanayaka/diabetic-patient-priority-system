-- schema.sql
-- Database structure for Diabetic Risk Classification System
USE diabetic_db;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS clinicians;
CREATE TABLE clinicians (
    clinician_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);
CREATE TABLE patients (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    age INT NOT NULL,
    sex VARCHAR(10) NOT NULL,
    social_life VARCHAR(10) NOT NULL,
    cholesterol DECIMAL(6, 2),
    triglycerides DECIMAL(6, 2),
    hdl DECIMAL(6, 2),
    ldl DECIMAL(6, 2),
    vldl DECIMAL(6, 2),
    bp_systolic DECIMAL(5, 2),
    bp_diastolic DECIMAL(5, 2),
    hba1c DECIMAL(4, 2),
    bmi DECIMAL(5, 2),
    rbs DECIMAL(6, 2),
    genetic_family_history VARCHAR(20),
    risk_score DECIMAL(5, 2),
    risk_category VARCHAR(10),
    clinician_id INT NOT NULL,
    FOREIGN KEY (clinician_id) REFERENCES clinicians(clinician_id)
);
SHOW TABLES;
DESCRIBE clinicians;
DESCRIBE patients;