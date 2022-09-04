// Properties for the client to consume (literally)
// TODO: export to Swagger/OpenAPI to generate API docs for clients
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
