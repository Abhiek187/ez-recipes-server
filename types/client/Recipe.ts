// Properties for the client to consume (literally)
type Recipe = {
  id: number;
  name: string;
  url: string;
  image: string;
  credit: string;
  sourceUrl: string;
  healthScore: number;
  time: number;
  servings: number;
  summary: string;
  types: string[];
  spiceLevel: "none" | "mild" | "spicy" | "unknown";
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isHealthy: boolean;
  isCheap: boolean;
  isSustainable: boolean;
  culture: string[];
  //allergies: string[];
  nutrients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  ingredients: {
    id: number;
    name: string;
    amount: number;
    unit: string;
  }[];
  instructions: {
    name: string;
    steps: {
      number: number;
      step: string;
      ingredients: {
        id: number;
        name: string;
        image: string;
      }[];
      equipment: {
        id: number;
        name: string;
        image: string;
      }[];
    }[];
  }[];
};

export default Recipe;
