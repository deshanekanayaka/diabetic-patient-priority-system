import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, accuracy_score, classification_report
from sklearn.model_selection import GridSearchCV
import pickle
import os

def load_and_preprocess_data(csv_path):
    """
    Loads and prepares the diabetes dataset.
    """
    # Load data
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} patient records")

    # Basic cleaning
    df = df.drop(columns=["Unnamed: 0", "FBS"])
    df.columns = df.columns.str.strip()

    # Process Age
    df["Age"] = df["Age"].str.replace("Years", "").str.replace("Year", "").str.strip()
    df["Age"] = pd.to_numeric(df["Age"], errors="coerce")

    # Process Blood Pressure
    bp_split = df["BP"].str.split("/", expand=True)
    df["BP_Systolic"] = pd.to_numeric(bp_split[0], errors="coerce")
    df["BP_Diastolic"] = pd.to_numeric(bp_split[1], errors="coerce")

    # Convert BMI
    df["BMI"] = pd.to_numeric(df["BMI"], errors="coerce")

    # Fill missing values with median
    for col in ["Age", "BP_Systolic", "BP_Diastolic", "BMI", "RBS"]:
        df[col] = df[col].fillna(df[col].median())

    # Encode categorical variables
    df["Sex_Encoded"] = df["Sex"].map({"MALE": 1, "FEMALE": 0})

    # Create risk categories using helper functions
    df["Risk_Category"] = df.apply(calculate_risk_level, axis=1)

    print()
    print("Data preprocessing complete")
    print(f"  Risk Distribution:")
    print(f"    Low Risk:    {(df['Risk_Category'] == 0).sum()} patients")
    print(f"    Medium Risk: {(df['Risk_Category'] == 1).sum()} patients")
    print(f"    High Risk:   {(df['Risk_Category'] == 2).sum()} patients")

    return df

def get_hba1c_points(hba1c):
    if hba1c >= 6.5:
        return 40
    elif hba1c >= 5.7:
        return 20
    return 0

def get_rbs_points(rbs):
    if rbs >= 200:
        return 20
    elif rbs >= 140:
        return 10
    return 0

def get_bmi_points(bmi):
    if bmi >= 30:
        return 15
    elif bmi >= 25:
        return 8
    return 0

def get_bp_points(systolic, diastolic):
    if systolic >= 14.0 or diastolic >= 9.0:
        return 15
    elif systolic >= 13.0 or diastolic >= 8.5:
        return 8
    return 0

def get_age_points(age):
    if age >= 65:
        return 10
    elif age >= 45:
        return 5
    return 0

def calculate_risk_level(row):
    points = (
        get_hba1c_points(row["HbA1c"])
        + get_rbs_points(row["RBS"])
        + get_bmi_points(row["BMI"])
        + get_bp_points(row["BP_Systolic"], row["BP_Diastolic"])
        + get_age_points(row["Age"])
    )

    if points < 34:
        return 0
    elif points < 67:
        return 1
    else:
        return 2

def prepare_features(df):
    print()
    print("Preparing features")

    feature_columns = [
        "HbA1c",
        "Age",
        "Sex_Encoded",
        "BP_Systolic",
        "BP_Diastolic",
        "BMI",
        "RBS",
    ]
    x = df[feature_columns]
    y = df["Risk_Category"]

    print(f"Features: {feature_columns}")
    print(f"Feature matrix shape: {x.shape}")

    return x, y, feature_columns

def split_data(x, y):
    print()
    print("Splitting Data")

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training set: {x_train.shape}")
    print(f"Testing set:  {x_test.shape}")

    return x_train, x_test, y_train, y_test

def fit_and_evaluate_model(
    x_train,
    x_test,
    y_train,
    y_test,
    max_depth=5,
    min_samples_split=0.01,
    max_features=0.8,
    max_samples=0.8,
):
    random_forest = RandomForestClassifier(
        random_state=0,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        max_features=max_features,
        max_samples=max_samples,
    )

    model = random_forest.fit(x_train, y_train)
    random_forest_predict = random_forest.predict(x_test)
    random_forest_conf_matrix = confusion_matrix(y_test, random_forest_predict)
    random_forest_acc_score = accuracy_score(y_test, random_forest_predict)

    print("Confusion matrix")
    print(random_forest_conf_matrix)
    print("\n")
    print("Accuracy of Random Forest:", random_forest_acc_score * 100, "\n")
    print(classification_report(y_test, random_forest_predict))

    return model

def hyperparameter_tuning(x_train, y_train):
    print()
    print("HYPERPARAMETER TUNING WITH GRIDSEARCH CV")

    param_grid = [
        {
            "max_depth": [3, 5, 7, 10],
            "min_samples_split": [0.01, 0.03, 0.07, 0.1],
            "max_features": [0.7, 0.8, 0.9, 1.0],
            "max_samples": [0.7, 0.8, 0.9, 1.0],
        }
    ]

    print("Parameter Grid:")
    print(f"  max_depth: {param_grid[0]['max_depth']}")
    print(f"  min_samples_split: {param_grid[0]['min_samples_split']}")
    print(f"  max_features: {param_grid[0]['max_features']}")
    print(f"  max_samples: {param_grid[0]['max_samples']}")
    print()

    model = RandomForestClassifier()
    search = GridSearchCV(estimator=model, param_grid=param_grid, cv=3, verbose=1)
    search.fit(x_train, y_train)

    print()
    print("GRIDSEARCH COMPLETE")
    print("Best Parameters:")
    for param, value in search.best_params_.items():
        print(f"  {param}: {value}")
    print(f"\nBest CV Score: {search.best_score_*100:.2f}%")

    return search

def analyze_results(search):
    print()
    print("Displaying results")

    results = pd.DataFrame(search.cv_results_)
    results.sort_values("mean_test_score", inplace=True, ascending=False)

    print()
    print("Top 10 Parameter Combinations:")
    top10 = results[
        [
            "mean_test_score",
            "std_test_score",
            "rank_test_score",
            "param_max_depth",
            "param_max_features",
            "param_max_samples",
            "param_min_samples_split",
        ]
    ].head(10)
    print(top10.to_string(index=False))

    return results

def k_fold_validation(model, x, y):
    print()
    print("K-FOLD CROSS-VALIDATION")

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, x, y, cv=skf, scoring="accuracy")

    print()
    print("Cross-Validation Results:")
    print(f"  Fold Scores: {[f'{score:.4f}' for score in cv_scores]}")
    print(f"  Mean Accuracy: {cv_scores.mean():.4f} ({cv_scores.mean()*100:.2f}%)")
    print(f"  Standard Deviation: {cv_scores.std():.4f} (±{cv_scores.std()*100:.2f}%)")
    print(f"  Min Accuracy: {cv_scores.min():.4f} ({cv_scores.min()*100:.2f}%)")
    print(f"  Max Accuracy: {cv_scores.max():.4f} ({cv_scores.max()*100:.2f}%)")

    return cv_scores

def feature_importance_analysis(model, feature_columns):
    print()
    print("FEATURE IMPORTANCE ANALYSIS")

    feature_importance = pd.DataFrame(
        {"feature": feature_columns, "importance": model.feature_importances_}
    ).sort_values("importance", ascending=False)

    print()
    print("Features Ranked by Importance:")
    for rank, (idx, row) in enumerate(feature_importance.iterrows(), 1):
        print(f"{rank}. {row['feature']}")

    return feature_importance

def save_model(model, output_path="models/random_forest_model.pkl"):
    print()
    print("SAVING MODEL")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "wb") as f:
        pickle.dump(model, f)

    file_size = os.path.getsize(output_path) / 1024
    print(f"Model saved to: {output_path}")

def main():
    print()
    print("Diabetic Patient Priority System")

    CSV_PATH = "Dabetics-dataset.csv"

    if not os.path.exists(CSV_PATH):
        print()
        print(f"Error: Dataset not found at {CSV_PATH}")
        return

    #Load and preprocess
    df = load_and_preprocess_data(CSV_PATH)

    #Prepare features
    x, y, feature_columns = prepare_features(df)

    #Split data
    x_train, x_test, y_train, y_test = split_data(x, y)

    #Train baseline model
    print()
    print("TRAINING BASELINE MODEL")
    model = fit_and_evaluate_model(x_train, x_test, y_train, y_test)

    #Hyperparameter tuning
    search = hyperparameter_tuning(x_train, y_train)

    #Analyze results
    results = analyze_results(search)

    #Evaluate best model on test set
    print()
    print("EVALUATING BEST MODEL ON TEST SET")
    best_model = search.best_estimator_

    y_pred_best = best_model.predict(x_test)
    best_conf_matrix = confusion_matrix(y_test, y_pred_best)
    best_accuracy = accuracy_score(y_test, y_pred_best)

    print()
    print("Confusion Matrix (Best Model):")
    print(best_conf_matrix)
    print()
    print("Accuracy of Best Model:", best_accuracy * 100)
    print()
    print(classification_report(y_test, y_pred_best))

    #K-Fold Cross-Validation
    cv_scores = k_fold_validation(best_model, x, y)

    #Feature importance
    feature_importance = feature_importance_analysis(best_model, feature_columns)

    #Save model
    save_model(best_model)

    # Final summary
    print()
    print(f"  Test Set Accuracy: {best_accuracy*100:.2f}%")
    print(
        f"  Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (±{cv_scores.std()*100:.2f}%)"
    )
    print("Run: uvicorn app:app --reload --port 8001")
    print()

if __name__ == "__main__":
    main()