-- seed.sql
-- Diabetic Risk Classification System — Full Reseed
-- 3 Clinicians | 6 Patients (2 per clinician)
-- Run AFTER schema.sql
--
-- ⚠️  BEFORE RUNNING:
--     Replace each PLAINTEXT_PASSWORD_HERE with your bcrypt hash
--     using your encryption script, then run this file.
USE diabetic_db;
-- ─────────────────────────────────────────────
-- STEP 1: Full reset (children first, then parents)
-- ─────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM patients;
DELETE FROM clinicians;
ALTER TABLE patients AUTO_INCREMENT = 1;
ALTER TABLE clinicians AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;
-- ─────────────────────────────────────────────
-- STEP 2: Insert clinicians
-- Replace each password value with your generated bcrypt hash
-- ─────────────────────────────────────────────
INSERT INTO clinicians (name, email, password)
VALUES (
        'Sarah Johnson',
        'sarah.johnson@clinic.com',
        'Test123!'
    ),
    (
        'Michael Chen',
        'michael.chen@clinic.com',
        'Test123!'
    ),
    (
        'Emily Davis',
        'emily.davis@clinic.com',
        'Test123!'
    );
-- ─────────────────────────────────────────────
-- STEP 3: Insert patients
-- Columns: age, sex, social_life, cholesterol, triglycerides, hdl, ldl, vldl,
--          bp_systolic, bp_diastolic, hba1c, bmi, rbs,
--          genetic_family_history, risk_score, risk_category, clinician_id
-- ─────────────────────────────────────────────
-- ── Clinician 1: Sarah Johnson ──────────────
-- Patient 1 | High risk | Male, 52, city
INSERT INTO patients (
        age,
        sex,
        social_life,
        cholesterol,
        triglycerides,
        hdl,
        ldl,
        vldl,
        bp_systolic,
        bp_diastolic,
        hba1c,
        bmi,
        rbs,
        genetic_family_history,
        risk_score,
        risk_category,
        clinician_id
    )
VALUES (
        52,
        'male',
        'city',
        238.00,
        195.00,
        36.00,
        155.00,
        39.00,
        148.00,
        93.00,
        8.10,
        30.80,
        172.00,
        'father',
        82.40,
        'high',
        1
    );
-- Patient 2 | Low risk | Female, 29, village
INSERT INTO patients (
        age,
        sex,
        social_life,
        cholesterol,
        triglycerides,
        hdl,
        ldl,
        vldl,
        bp_systolic,
        bp_diastolic,
        hba1c,
        bmi,
        rbs,
        genetic_family_history,
        risk_score,
        risk_category,
        clinician_id
    )
VALUES (
        29,
        'female',
        'village',
        165.00,
        95.00,
        62.00,
        85.00,
        19.00,
        112.00,
        74.00,
        5.10,
        21.80,
        92.00,
        NULL,
        22.50,
        'low',
        1
    );
-- ── Clinician 2: Michael Chen ───────────────
-- Patient 3 | High risk | Male, 60, city
INSERT INTO patients (
        age,
        sex,
        social_life,
        cholesterol,
        triglycerides,
        hdl,
        ldl,
        vldl,
        bp_systolic,
        bp_diastolic,
        hba1c,
        bmi,
        rbs,
        genetic_family_history,
        risk_score,
        risk_category,
        clinician_id
    )
VALUES (
        60,
        'male',
        'city',
        245.00,
        210.00,
        33.00,
        162.00,
        42.00,
        155.00,
        97.00,
        8.60,
        32.40,
        188.00,
        'mother',
        91.20,
        'high',
        2
    );
-- Patient 4 | Medium risk | Female, 44, village
INSERT INTO patients (
        age,
        sex,
        social_life,
        cholesterol,
        triglycerides,
        hdl,
        ldl,
        vldl,
        bp_systolic,
        bp_diastolic,
        hba1c,
        bmi,
        rbs,
        genetic_family_history,
        risk_score,
        risk_category,
        clinician_id
    )
VALUES (
        44,
        'female',
        'village',
        192.00,
        140.00,
        48.00,
        115.00,
        28.00,
        128.00,
        83.00,
        6.40,
        25.60,
        118.00,
        'uncle_paternal',
        54.70,
        'medium',
        2
    );
-- ── Clinician 3: Emily Davis ─────────────────
-- Patient 5 | Medium risk | Male, 48, city
INSERT INTO patients (
        age,
        sex,
        social_life,
        cholesterol,
        triglycerides,
        hdl,
        ldl,
        vldl,
        bp_systolic,
        bp_diastolic,
        hba1c,
        bmi,
        rbs,
        genetic_family_history,
        risk_score,
        risk_category,
        clinician_id
    )
VALUES (
        48,
        'male',
        'city',
        205.00,
        158.00,
        42.00,
        122.00,
        31.00,
        132.00,
        86.00,
        6.80,
        27.30,
        128.00,
        'uncle_maternal',
        61.90,
        'medium',
        3
    );
-- Patient 6 | Low risk | Female, 35, village
INSERT INTO patients (
        age,
        sex,
        social_life,
        cholesterol,
        triglycerides,
        hdl,
        ldl,
        vldl,
        bp_systolic,
        bp_diastolic,
        hba1c,
        bmi,
        rbs,
        genetic_family_history,
        risk_score,
        risk_category,
        clinician_id
    )
VALUES (
        35,
        'female',
        'village',
        172.00,
        108.00,
        58.00,
        92.00,
        21.00,
        118.00,
        77.00,
        5.40,
        23.10,
        98.00,
        NULL,
        28.30,
        'low',
        3
    );
-- ─────────────────────────────────────────────
-- STEP 4: Verify
-- ─────────────────────────────────────────────
SELECT 'Clinicians:' AS '';
SELECT clinician_id,
    full_name,
    email
FROM clinicians
ORDER BY clinician_id;
SELECT 'Patients:' AS '';
SELECT patient_id,
    age,
    sex,
    social_life,
    hba1c,
    bmi,
    risk_score,
    risk_category,
    clinician_id
FROM patients
ORDER BY clinician_id,
    patient_id;