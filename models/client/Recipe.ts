// Properties for the client to consume (literally)
export type Recipe = {
  id: number;
  name: string;
  url: string;
  nutrients: [
    {
      servings: {
        amount: number;
        unit: string;
      };
      calories: {
        amount: number;
        unit: string;
      };
      fats: {
        amount: number;
        unit: string;
      };
      saturatedFats: {
        amount: number;
        unit: string;
      };
      carbs: {
        amount: number;
        unit: string;
      };
      fiber: {
        amount: number;
        unit: string;
      };
      sugars: {
        amount: number;
        unit: string;
      };
      protein: {
        amount: number;
        unit: string;
      };
      cholesterol: {
        amount: number;
        unit: string;
      };
      sodium: {
        amount: number;
        unit: string;
      };
    }
  ];
  image: string;
  rating: number;
  time: number;
  ingredients: [
    {
      name: string;
      amount: number;
      unit: string;
    }
  ];
  steps: [string];
};
