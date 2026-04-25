USE diabetic_db;

DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS clinicians;

CREATE TABLE patients (
                          patient_id    INT PRIMARY KEY AUTO_INCREMENT,
                          clerk_id      VARCHAR(100) NOT NULL,
                          age           INT NOT NULL,
                          sex           VARCHAR(10) NOT NULL,
                          social_life   VARCHAR(10) NOT NULL,
                          cholesterol   DECIMAL(6,2) NOT NULL,
                          triglycerides DECIMAL(6,2) NOT NULL,
                          hdl           DECIMAL(6,2) NOT NULL,
                          ldl           DECIMAL(6,2) NOT NULL,
                          vldl          DECIMAL(6,2) NOT NULL,
                          bp_systolic   DECIMAL(5,2) NOT NULL,
                          bp_diastolic  DECIMAL(5,2) NOT NULL,
                          hba1c         DECIMAL(4,2) NOT NULL,
                          bmi           DECIMAL(5,2) NOT NULL,
                          rbs           DECIMAL(6,2) NOT NULL,
                          risk_score    DECIMAL(5,2),
                          risk_category VARCHAR(10),
    -- Stores the 3 clinical factors that contributed most to the risk score,
    -- serialised as JSON so they can be read back as an array on the frontend.
                          top_factors   JSON,
                          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clerk_id ON patients (clerk_id);

SHOW TABLES;
DESCRIBE patients;