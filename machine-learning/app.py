from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
import pickle
import os
from typing import Optional

# Creates the FastAPI application instance
app = FastAPI(
    title="Diabetic Patient Priority System API",
    description="Random Forest classification for calculating patient risk scores",
    version="1.0.0",
)

# Allows cross-origin requests from any domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Builds absolute path to model file regardless of where the script is run from
MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "random_forest_model.pkl"
)

# Loads serialised model from disk at startup, sets model=None if file missing
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print("Random Forest model loaded successfully")
except FileNotFoundError:
    print("Model file not found. Please run train_model.py first")
    model = None


# Pydantic model that validates incoming JSON request body before prediction
# FastAPI automatically runs this validation when PatientData is used as a type hint
# Called via: def predict_risk(patient: PatientData)
class PatientData(BaseModel):

    # ge = greater than or equal, le = less than or equal
    # Field(...) = required, Field(None) = optional
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    sex: str = Field(..., description="Patient sex: 'male' or 'female'")
    hba1c: Optional[float] = Field(None, ge=0, le=20, description="HbA1c percentage")
    bmi: Optional[float] = Field(None, ge=0, le=60, description="BMI")
    bp_systolic: Optional[float] = Field(None, ge=5, le=25, description="Systolic BP (dataset format e.g. 12.0 = 120mmHg)")
    bp_diastolic: Optional[float] = Field(None, ge=3, le=15, description="Diastolic BP (dataset format e.g. 8.0 = 80mmHg)")
    rbs: Optional[float] = Field(None, ge=0, le=600, description="Random Blood Sugar")

    # @field_validator("sex") — runs this method when the sex field is being validated
    # @classmethod — required by Pydantic because validation runs before the object
    # is fully created, so no instance exists yet; cls = the class, v = the raw value
    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v):
        if v.lower() not in ["male", "female"]:
            raise ValueError("Sex must be 'male' or 'female'")
        # Returns cleaned lowercase value back to the object
        return v.lower()


# Pydantic model that defines the structure of the response sent back to the backend
# Used as response_model in: @app.post("/predict", response_model=RiskPrediction)
# FastAPI automatically serialises the returned object to match this structure
class RiskPrediction(BaseModel):
    risk_score: float
    risk_category: str
    confidence_low: float
    confidence_medium: float
    confidence_high: float


# Called inside predict_risk() to prepare data before passing to the model
def preprocess_patient_data(data: PatientData) -> pd.DataFrame:

    # Converts PatientData object to a dictionary then to a single-row DataFrame
    patient_dict = data.model_dump()
    df = pd.DataFrame([patient_dict])

    # Encodes sex as binary numeric to match training format (male=1, female=0)
    df["Sex_Encoded"] = df["sex"].apply(lambda x: 1 if x == "male" else 0)

    # Fills missing clinical values with clinically appropriate defaults
    df["hba1c"] = df["hba1c"].fillna(5.7)
    df["bmi"] = df["bmi"].fillna(25.0)
    df["bp_systolic"] = df["bp_systolic"].fillna(12.0)
    df["bp_diastolic"] = df["bp_diastolic"].fillna(8.0)
    df["rbs"] = df["rbs"].fillna(120.0)

    # Renames columns to exactly match feature names used during training
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

    # Selects only the 7 features the model was trained on, in the same order
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


# Called inside predict_risk() after model.predict_proba() returns probabilities
# Converts class probabilities into a continuous 0-100 priority score
# High risk maps to 70-100, medium to 40-70, low to 0-40
# prob_high/medium/low positions the score precisely within each band
def calculate_priority_score(probabilities: np.ndarray, predicted_class: int) -> float:
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


# Called inside predict_risk() after calculate_priority_score()
# Maps the numeric priority score back to a string category label
# Thresholds match the score bands defined in calculate_priority_score
def calculate_risk_category(priority_score: float) -> str:
    if priority_score >= 70:
        return "high"
    elif priority_score >= 40:
        return "medium"
    else:
        return "low"


# @app.get("/") registers this function as the GET / route
# Acts as a health check — called by the backend to verify the ML service is running
@app.get("/")
def read_root():
    return {
        "service": "Diabetic Patient Priority System - ML Model",
        "status": "running",
        "version": "1.0.0",
        "model_loaded": model is not None,
        "framework": "FastAPI",
        "ml_model": "Random Forest Classifier",
        "features_used": 7,
    }


# @app.post("/predict") registers this as the POST /predict route
# response_model=RiskPrediction tells FastAPI to validate and serialise the response
# Called from patientController.js in the backend whenever a patient is created
# patient: PatientData triggers automatic request body validation via Pydantic
@app.post("/predict", response_model=RiskPrediction)
def predict_risk(patient: PatientData):

    # Returns 503 if model failed to load at startup
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Please run train_model.py first",
        )

    try:
        processed_data = preprocess_patient_data(patient)

        # Gets the predicted class (0=low, 1=medium, 2=high)
        prediction = model.predict(processed_data)[0]

        # Gets the probability for each risk class as an array [prob_low, prob_medium, prob_high]
        probabilities = model.predict_proba(processed_data)[0]

        priority_score = calculate_priority_score(probabilities, prediction)
        risk_category = calculate_risk_category(priority_score)

        # Rounds scores to 2dp before returning in response
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

#References
#https://app-generator.dev/docs/technologies/fastapi/machine-learning.html
#https://dev.to/ekemini_thompson/building-a-real-time-credit-card-fraud-detection-system-with-fastapi-and-machine-learning-3g0m