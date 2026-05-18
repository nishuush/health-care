const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const buildGeminiEndpoint = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const extractJsonFromText = (text) => {
  const trimmed = String(text || "").trim();

  if (!trimmed) {
    throw new Error("Gemini returned an empty response.");
  }

  const directStart = trimmed.indexOf("{");
  const directEnd = trimmed.lastIndexOf("}");

  if (directStart !== -1 && directEnd !== -1 && directEnd > directStart) {
    return JSON.parse(trimmed.slice(directStart, directEnd + 1));
  }

  throw new Error("Gemini response did not contain valid JSON.");
};

const callGeminiJson = async ({ systemInstruction, prompt }) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const response = await fetch(buildGeminiEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${responseText}`);
  }

  const parsed = JSON.parse(responseText);
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return extractJsonFromText(text);
};

const buildDietPrompt = ({ age, gender, weight, height, bmi, goal, activity }) => `
User Details:
- Age: ${age}
- Gender: ${gender}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi}
- Goal: ${goal}
- Activity Level: ${activity}

You are a professional Indian nutritionist and health assistant.

Generate a practical daily Indian diet plan.

Requirements:
- Calculate approximate daily calories
- Adjust calories for the goal
- Include only Indian food items
- Keep it realistic, affordable, easy to prepare
- Maintain balance of protein, carbs, fats
- If BMI is high, warn briefly about obesity risk
- If BMI is low, include calorie-dense foods

Return ONLY valid JSON with this exact structure:
{
  "totalCalories": number,
  "bmiCategory": "string",
  "mealPlan": {
    "breakfast": { "calories": number, "items": ["item1", "item2"] },
    "lunch": { "calories": number, "items": ["item1", "item2"] },
    "snack": { "calories": number, "items": ["item1", "item2"] },
    "dinner": { "calories": number, "items": ["item1", "item2"] }
  },
  "advice": ["short advice 1", "short advice 2", "short advice 3"]
}
`;

const buildProblemPrompt = ({
  age,
  gender,
  problem,
  symptoms,
  duration,
  severity,
  medicalHistory,
}) => `
User Details:
- Age: ${age}
- Gender: ${gender}
- Main health problem: ${problem}
- Symptoms: ${symptoms}
- Duration: ${duration}
- Severity: ${severity}
- Medical history or notes: ${medicalHistory || "None provided"}

You are a careful Indian health assistant.

Rules:
- Do not claim a confirmed diagnosis
- Suggest simple gharalu upaaye only for mild/common issues
- If the issue sounds serious, clearly recommend visiting a doctor
- Mention urgent care if red-flag symptoms are present
- Keep advice short, practical, and safe

Return ONLY valid JSON with this exact structure:
{
  "conditionSummary": "short summary",
  "severityLevel": "Mild or Moderate or Serious",
  "possibleCare": ["care step 1", "care step 2", "care step 3"],
  "homeRemedies": ["remedy 1", "remedy 2", "remedy 3"],
  "dietSupport": ["food tip 1", "food tip 2"],
  "doctorAdvice": "clear recommendation",
  "disclaimer": "short medical safety disclaimer"
}
`;

const normalizeDietRecommendation = (aiResult, inputs) => ({
  inputs,
  bmiCategory: aiResult.bmiCategory || "General guidance",
  totalCalories: Number(aiResult.totalCalories) || 0,
  mealPlan: {
    breakfast: {
      calories: Number(aiResult?.mealPlan?.breakfast?.calories) || 0,
      items: aiResult?.mealPlan?.breakfast?.items || [],
    },
    lunch: {
      calories: Number(aiResult?.mealPlan?.lunch?.calories) || 0,
      items: aiResult?.mealPlan?.lunch?.items || [],
    },
    snack: {
      calories: Number(aiResult?.mealPlan?.snack?.calories) || 0,
      items: aiResult?.mealPlan?.snack?.items || [],
    },
    dinner: {
      calories: Number(aiResult?.mealPlan?.dinner?.calories) || 0,
      items: aiResult?.mealPlan?.dinner?.items || [],
    },
  },
  advice: Array.isArray(aiResult.advice) ? aiResult.advice : [],
  generatedBy: "gemini",
});

const generateDietWithGemini = async (inputs) => {
  const result = await callGeminiJson({
    systemInstruction:
      "You are a professional Indian nutritionist. Respond only in valid JSON.",
    prompt: buildDietPrompt(inputs),
  });

  return normalizeDietRecommendation(result, inputs);
};

const generateHealthProblemAdvice = async (inputs) =>
  callGeminiJson({
    systemInstruction:
      "You are a careful health assistant. Never provide a definitive diagnosis. Respond only in valid JSON.",
    prompt: buildProblemPrompt(inputs),
  });

module.exports = {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  generateDietWithGemini,
  generateHealthProblemAdvice,
};
