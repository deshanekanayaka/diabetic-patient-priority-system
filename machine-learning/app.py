from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
import pickle
import os

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

# The pkl file stores both the trained model and the feature names used during training.
# Loading them together ensures the labels always match what the model actually learned on.
try:
    with open(MODEL_PATH, "rb") as f:
        model_package = pickle.load(f)
        model = model_package["model"]
        FEATURE_LABELS = model_package["feature_names"]
    print("Random Forest model loaded successfully")
except FileNotFoundError:
    print("Model file not found. Please run train_model.py first")
    model = None
    FEATURE_LABELS = []


class PatientData(BaseModel):
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    sex: str = Field(..., description="Patient sex: 'male' or 'female'")
    hba1c: float = Field(..., ge=0, le=20, description="HbA1c percentage")
    bmi: float = Field(..., ge=0, le=60, description="BMI")
    bp_systolic: float = Field(..., ge=5, le=25, description="Systolic BP (dataset format e.g. 12.0 = 120mmHg)")
    bp_diastolic: float = Field(..., ge=3, le=15, description="Diastolic BP (dataset format e.g. 8.0 = 80mmHg)")
    rbs: float = Field(..., ge=0, le=600, description="Random Blood Sugar")

    # Accepts any capitalisation ("MALE", "Male") only, but stores as lowercase
    # so the encoding step (1 if x == "male" else 0) always matches correctly.
    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v):
        if v.lower() not in ["male", "female"]:
            raise ValueError("Sex must be 'male' or 'female'")
        return v.lower()


# top_factors holds the 3 feature names that contributed most to the risk score,
# pulled from the model itself rather than typed manually.
class RiskPrediction(BaseModel):
    risk_score: float
    risk_category: str
    confidence_low: float
    confidence_medium: float
    confidence_high: float
    top_factors: list[str]


def preprocess_patient_data(data: PatientData) -> pd.DataFrame:
    patient_dict = data.model_dump()
    df = pd.DataFrame([patient_dict])

    # Encodes sex as binary numeric to match training format (male=1, female=0)
    df["Sex_Encoded"] = df["sex"].apply(lambda x: 1 if x == "male" else 0)

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

    # Selects only the 7 features the model was trained on, in the same order.
    # Order matters — model.predict() maps columns positionally.
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
    prob_low = probabilities[0]
    prob_medium = probabilities[1]
    prob_high = probabilities[2]

    # Maps each predicted class to a fixed band, then uses confidence probability
    # to position the patient within that band for within-tier ranking.
    # High:   70-100 | Medium: 40-70 | Low: 0-40
    if predicted_class == 2:
        priority_score = 70 + (prob_high * 30)
    elif predicted_class == 1:
        priority_score = 40 + (prob_medium * 30)
    else:
        priority_score = prob_low * 40

    return priority_score


def calculate_risk_category(priority_score: float) -> str:
    if priority_score >= 70:
        return "high"
    elif priority_score >= 40:
        return "medium"
    else:
        return "low"


# feature_importances_ returns an array of weights with no names attached.
# We sort by weight descending, take the top n indices, and look up the clinical
# label for each index from FEATURE_LABELS — which came from the model package itself.
def get_top_factors(model, n: int = 3) -> list[str]:

    # Build a small dataframe pairing feature names with their importance weights
    importance_df = pd.DataFrame({
        'feature': FEATURE_LABELS,
        'importance': model.feature_importances_
    })

    # Sort by importance descending and take the top n rows
    top_df = importance_df.sort_values('importance', ascending=False).head(n)

    # Return just the feature names as a plain list
    top_names = top_df['feature'].tolist()

    return top_names


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


@app.post("/predict", response_model=RiskPrediction)
def predict_risk(patient: PatientData):

    # 503 = Service Unavailable — server is up but model is not ready
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

        # Pulls the 3 highest-weighted features from the model so the clinician
        # knows which indicators drove this patient's score.
        top_factors = get_top_factors(model, n=3)

        response = RiskPrediction(
            risk_score=round(priority_score, 2),
            risk_category=risk_category,
            confidence_low=round(probabilities[0] * 100, 2),
            confidence_medium=round(probabilities[1] * 100, 2),
            confidence_high=round(probabilities[2] * 100, 2),
            top_factors=top_factors,
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    print("Starting Diabetic Patient Priority System ML Model")
    uvicorn.run(app, host="0.0.0.0", port=8001)

# References
# https://app-generator.dev/docs/technologies/fastapi/machine-learning.html
# https://dev.to/ekemini_thompson/building-a-real-time-credit-card-fraud-detection-system-with-fastapi-and-machine-learning-3g0m