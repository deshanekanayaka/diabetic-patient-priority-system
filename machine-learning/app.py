from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
import pickle
import os
from typing import Optional

app = FastAPI(
    title="Diabetic Patient Priority System API",
    description="Random Forest classification for calculating patient risk scores",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "random_forest_model.pkl"
)

try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print("Random Forest model loaded successfully")
except FileNotFoundError:
    print("Model file not found. Please run train_model.py first")
    model = None

class PatientData(BaseModel):
    """
    Validates patient data from the API before making predictions.

    Uses only 7 essential features for risk assessment:
    - HbA1c, Age, Sex, BP (systolic/diastolic), BMI, RBS

    Validation constraints:
    - ge (Greater than or Equal): Minimum value (e.g., ge=0 means >= 0)
    - le (Less than or Equal): Maximum value (e.g., le=120 means <= 120)
    - Field(...): Required field
    - Field(None): Optional field
    """

    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    sex: str = Field(..., description="Patient sex: 'male' or 'female'")
    hba1c: Optional[float] = Field(None, ge=0, le=20, description="HbA1c percentage")
    bmi: Optional[float] = Field(None, ge=10, le=60, description="BMI")
    bp_systolic: Optional[float] = Field(None, ge=50, le=250, description="Systolic BP")
    bp_diastolic: Optional[float] = Field(
        None, ge=30, le=150, description="Diastolic BP"
    )
    rbs: Optional[float] = Field(None, ge=0, le=600, description="Random Blood Sugar")

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v):
        if v.lower() not in ["male", "female"]:
            raise ValueError("Sex must be 'male' or 'female'")
        return v.lower()

class RiskPrediction(BaseModel):
    """
    Risk prediction response structure.

    Returns:
    - risk_score: 0-100 indicating overall risk
    - risk_category: "low", "medium", or "high"
    - confidence levels: Model's certainty for each category
    """

    risk_score: float
    risk_category: str
    confidence_low: float
    confidence_medium: float
    confidence_high: float


def preprocess_patient_data(data: PatientData) -> pd.DataFrame:
    patient_dict = data.model_dump()
    df = pd.DataFrame([patient_dict])

    df["Sex_Encoded"] = df["sex"].apply(lambda x: 1 if x == "male" else 0)

    df["hba1c"] = df["hba1c"].fillna(5.7)
    df["bmi"] = df["bmi"].fillna(25.0)
    df["bp_systolic"] = df["bp_systolic"].fillna(120.0)
    df["bp_diastolic"] = df["bp_diastolic"].fillna(80.0)
    df["rbs"] = df["rbs"].fillna(120.0)

    # Rename columns to match training data column names
    df = df.rename(
        columns={
            "hba1c": "HbA1c",
            "age": "Age",
            "bp_systolic": "BP_Systolic",
            "bp_diastolic": "BP_Diastolic",
            "bmi": "BMI",
            "rbs": "RBS",
        }
    )

    feature_columns = [
        "HbA1c",
        "Age",
        "Sex_Encoded",
        "BP_Systolic",
        "BP_Diastolic",
        "BMI",
        "RBS",
    ]

    return df[feature_columns]

def calculate_priority_score(probabilities: np.ndarray, predicted_class: int) -> float:
    """
    Calculates priority score from model predictions.

    Uses confidence levels to create a precise 0-100 score:
    - High risk: 70-100
    - Medium risk: 40-70
    - Low risk: 0-40
    """
    prob_low = probabilities[0]
    prob_medium = probabilities[1]
    prob_high = probabilities[2]

    if predicted_class == 2:
        priority_score = 70 + (prob_high * 30)
    elif predicted_class == 1:
        priority_score = 40 + (prob_medium * 30)
    else:
        priority_score = prob_low * 40

    return priority_score

def calculate_risk_category(priority_score: float) -> str:
    """
    Converts numeric score to risk category.

    Thresholds:
    - 70-100: High risk - immediate attention needed
    - 40-69: Medium risk - regular monitoring
    - 0-39: Low risk - routine checkups
    """
    if priority_score >= 70:
        return "high"
    elif priority_score >= 40:
        return "medium"
    else:
        return "low"

@app.get("/")
def read_root():
    """
    Health check endpoint.
    """
    return {
        "service": "Diabetic Patient Priority System - ML Model",
        "status": "running",
        "version": "1.0.0",
        "model_loaded": model is not None,
        "framework": "FastAPI",
        "ml_model": "Random Forest Classifier",
        "features_used": 7,
    }

@app.post("/predict", response_model=RiskPrediction)
def predict_risk(patient: PatientData):
    """
    Predicts risk for one patient using 7 key health indicators.

    Process:
    1. Receive patient data from backend
    2. Preprocess and fill missing values
    3. Run through Random Forest model
    4. Calculate priority score
    5. Return risk assessment
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Please run train_model.py first",
        )

    try:
        processed_data = preprocess_patient_data(patient)

        prediction = model.predict(processed_data)[0]
        probabilities = model.predict_proba(processed_data)[0]

        priority_score = calculate_priority_score(probabilities, prediction)
        risk_category = calculate_risk_category(priority_score)

        response = RiskPrediction(
            risk_score=round(priority_score, 2),
            risk_category=risk_category,
            confidence_low=round(probabilities[0] * 100, 2),
            confidence_medium=round(probabilities[1] * 100, 2),
            confidence_high=round(probabilities[2] * 100, 2),
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn

    print("Starting Diabetic Patient Priority System ML Model")
    uvicorn.run(app, host="0.0.0.0", port=8001)
