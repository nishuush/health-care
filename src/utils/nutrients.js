const nutrientBands = [
  {
    min: 0,
    max: 12,
    stage: "Children",
    nutrients: [
      "Calcium for bones and teeth",
      "Vitamin D for growth",
      "Protein for healthy muscles",
      "Iron for brain development",
    ],
  },
  {
    min: 13,
    max: 19,
    stage: "Teenagers",
    nutrients: [
      "Protein for growth spurts",
      "Iron for energy and blood health",
      "Calcium for bone strength",
      "Vitamin B complex for metabolism",
    ],
  },
  {
    min: 20,
    max: 39,
    stage: "Young adults",
    nutrients: [
      "Protein for muscle maintenance",
      "Omega-3 for heart and brain support",
      "Fiber for digestion",
      "Magnesium for recovery and stress balance",
    ],
  },
  {
    min: 40,
    max: 59,
    stage: "Middle age adults",
    nutrients: [
      "Calcium and vitamin D for bone density",
      "Fiber for heart health",
      "Potassium for blood pressure support",
      "Vitamin B12 for nerve health",
    ],
  },
  {
    min: 60,
    max: Number.POSITIVE_INFINITY,
    stage: "Senior adults",
    nutrients: [
      "Vitamin D for bone and immune health",
      "Vitamin B12 for cognition and nerves",
      "Calcium for bone strength",
      "Omega-3 for heart support",
    ],
  },
];

const buildNutrientGuidance = (age) => {
  const band = nutrientBands.find((item) => age >= item.min && age <= item.max);

  return {
    age,
    stage: band.stage,
    nutrients: band.nutrients,
    note: "Use this as a general guide and confirm specific nutritional needs with a doctor or dietitian.",
  };
};

module.exports = {
  buildNutrientGuidance,
};
