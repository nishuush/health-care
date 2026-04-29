const activityFactors = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const mealSplits = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.15,
  dinner: 0.25,
};

const roundCalories = (value) => Math.round(value / 10) * 10;

const classifyBmi = (bmi) => {
  if (bmi < 18.5) {
    return "Underweight";
  }

  if (bmi < 25) {
    return "Normal weight";
  }

  if (bmi < 30) {
    return "Overweight";
  }

  return "Obesity";
};

const calculateBmr = ({ age, gender, weight, height }) => {
  const normalizedGender = String(gender || "").toLowerCase();

  if (normalizedGender === "female") {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }

  if (normalizedGender === "other") {
    return 10 * weight + 6.25 * height - 5 * age - 78;
  }

  return 10 * weight + 6.25 * height - 5 * age + 5;
};

const adjustCaloriesForGoal = (calories, goal) => {
  const normalizedGoal = String(goal || "").toLowerCase();

  if (normalizedGoal === "weight loss") {
    return calories - 350;
  }

  if (normalizedGoal === "weight gain") {
    return calories + 300;
  }

  return calories;
};

const buildMealPlan = ({ goal, bmiCategory, calorieTarget }) => {
  const normalizedGoal = String(goal || "").toLowerCase();
  const higherEnergy = normalizedGoal === "weight gain" || bmiCategory === "Underweight";
  const lighterMeals = normalizedGoal === "weight loss" || bmiCategory === "Overweight" || bmiCategory === "Obesity";

  return {
    breakfast: {
      calories: roundCalories(calorieTarget * mealSplits.breakfast),
      items: higherEnergy
        ? [
            "2 paneer parathas with curd",
            "1 glass milk or soy milk",
            "1 banana with a handful of roasted peanuts",
          ]
        : lighterMeals
          ? [
              "2 moong dal chillas with mint chutney",
              "1 bowl plain curd",
              "1 seasonal fruit",
            ]
          : [
              "2 vegetable stuffed rotis or parathas with curd",
              "1 boiled egg or paneer bhurji",
              "1 fruit such as apple or banana",
            ],
    },
    lunch: {
      calories: roundCalories(calorieTarget * mealSplits.lunch),
      items: higherEnergy
        ? [
            "2 to 3 rotis with dal tadka",
            "1 serving jeera rice",
            "paneer curry or egg curry",
            "salad with cucumber and carrot",
          ]
        : lighterMeals
          ? [
              "2 rotis with mixed dal",
              "1 bowl seasonal sabzi",
              "grilled paneer or boiled eggs",
              "large salad without heavy dressing",
            ]
          : [
              "2 rotis with dal",
              "1 bowl rice",
              "1 serving sabzi",
              "paneer, egg, or chicken curry in moderate quantity",
            ],
    },
    snack: {
      calories: roundCalories(calorieTarget * mealSplits.snack),
      items: higherEnergy
        ? [
            "peanut chikki or dry fruits",
            "1 banana shake or lassi",
          ]
        : lighterMeals
          ? [
              "roasted chana",
              "green tea or buttermilk",
              "1 fruit",
            ]
          : [
              "sprouts chaat or roasted chana",
              "buttermilk or coconut water",
            ],
    },
    dinner: {
      calories: roundCalories(calorieTarget * mealSplits.dinner),
      items: higherEnergy
        ? [
            "2 rotis with dal makhani or rajma",
            "1 serving paneer bhurji or omelette",
            "light salad",
          ]
        : lighterMeals
          ? [
              "2 rotis with dal or grilled paneer",
              "1 bowl sauteed vegetables",
              "clear soup or curd",
            ]
          : [
              "2 rotis with dal",
              "1 bowl sabzi",
              "curd or soup",
            ],
    },
  };
};

const buildHealthAdvice = ({ bmi, bmiCategory, goal, activity }) => {
  const advice = [];

  if (bmi >= 25) {
    advice.push(
      "Your BMI is on the higher side, so staying active and controlling oily or sugary foods can reduce future obesity risk."
    );
  } else if (bmi < 18.5) {
    advice.push(
      "Your BMI is low, so include calorie-dense foods like paneer, milk, banana, peanuts, and khichdi with ghee."
    );
  } else {
    advice.push(
      "Your BMI is in a healthy range. Focus on steady meal timing, hydration, and balanced home-style Indian meals."
    );
  }

  if (String(goal || "").toLowerCase() === "weight loss") {
    advice.push(
      "Keep portions steady, prioritize protein at each meal, and aim for daily walking or moderate exercise."
    );
  } else if (String(goal || "").toLowerCase() === "weight gain") {
    advice.push(
      "Add one extra nourishing snack daily and do light strength activity to support healthy weight gain."
    );
  } else {
    advice.push(
      `A ${String(activity || "").toLowerCase()} activity routine works best when paired with enough protein, fiber, and sleep.`
    );
  }

  advice.push("Choose simple homemade meals, drink enough water, and avoid skipping breakfast for better energy through the day.");

  return advice;
};

const buildDietRecommendation = ({ age, gender, weight, height, bmi, goal, activity }) => {
  const normalizedActivity = String(activity || "").toLowerCase();
  const bmiValue =
    Number.isFinite(bmi) && bmi > 0
      ? bmi
      : Number((weight / ((height / 100) * (height / 100))).toFixed(1));
  const bmiCategory = classifyBmi(bmiValue);
  const baseCalories = calculateBmr({ age, gender, weight, height }) * (activityFactors[normalizedActivity] || 1.55);
  const calorieTarget = Math.max(1200, roundCalories(adjustCaloriesForGoal(baseCalories, goal)));
  const mealPlan = buildMealPlan({ goal, bmiCategory, calorieTarget });
  const advice = buildHealthAdvice({ bmi: bmiValue, bmiCategory, goal, activity });

  return {
    inputs: {
      age,
      gender,
      weight,
      height,
      bmi: bmiValue,
      goal,
      activity,
    },
    bmiCategory,
    totalCalories: calorieTarget,
    mealPlan,
    advice,
  };
};

module.exports = {
  buildDietRecommendation,
};
