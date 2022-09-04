type Instruction = {
  // A recipe could be split into multiple instructions
  // The name describes what the instructions are for, or "" if there's only one instruction
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
      // If the step requires cooking for some time
      length?: {
        number: number;
        unit: string;
      };
    }
  ];
};

export default Instruction;
