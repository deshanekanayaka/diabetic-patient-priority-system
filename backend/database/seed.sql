USE diabetic_db;

-- Clear existing data
DELETE FROM patients;

-- Reset auto-increment so IDs stay predictable in dev
ALTER TABLE patients AUTO_INCREMENT = 1;

-- Seed patients (data from your CSV export)
INSERT INTO patients
(clerk_id, age, sex, social_life, cholesterol, triglycerides, hdl, ldl, vldl,
 bp_systolic, bp_diastolic, hba1c, bmi, rbs, risk_score, risk_category)
VALUES
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 52, 'male',   'city',    238.00, 195.00, 36.00, 155.00, 39.00, 148.00, 93.00, 8.10, 30.80, 172.00, 82.40, 'high'),
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 60, 'male',   'city',    245.00, 210.00, 33.00, 162.00, 42.00, 155.00, 97.00, 8.60, 32.40, 188.00, 91.20, 'high'),
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 44, 'female', 'village', 192.00, 140.00, 48.00, 115.00, 28.00, 128.00, 83.00, 6.40, 25.60, 118.00, 54.70, 'medium'),
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 48, 'male',   'city',    205.00, 158.00, 42.00, 122.00, 31.00, 132.00, 86.00, 6.80, 27.30, 128.00, 61.90, 'medium'),
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 35, 'female', 'village', 172.00, 108.00, 58.00,  92.00, 21.00, 118.00, 77.00, 5.40, 23.10,  98.00, 28.30, 'low'),
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 40, 'male',   'village',  50.00,  50.00, 50.00,  50.00, 50.00,  50.00, 50.00,10.00, 50.00, 100.00, 65.96, 'medium'),
    ('user_3BUc8irbsRLEN45Gdo4jInGbnjW', 30, 'male',   'city',     30.00,  30.00, 30.00,  30.00, 30.00,  50.00, 30.00, 1.00, 10.00,  50.00, 38.70, 'low');

SELECT CONCAT('Seeded ', COUNT(*), ' patients') AS status FROM patients;