export type Instruction = {
  name: string;
  steps: [
    {
      number: number;
      step: string;
      ingredients: [
        {
          id: number;
          name: string;
          localizedName: string;
          image: string;
        }
      ];
      equipment: [
        {
          id: number;
          name: string;
          localizedName: string;
          image: string;
        }
      ];
      length?: {
        number: number;
        unit: string;
      };
    }
  ];
};
