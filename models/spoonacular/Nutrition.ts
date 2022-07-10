export type Nutrition = {
  nutrients: [
    {
      name: string;
      amount: number;
      unit: string;
      percentOfDailyNeeds: number;
    }
  ];
  properties: [
    {
      name: string;
      amount: number;
      unit: string;
    }
  ];
  flavonoids: [
    {
      name: string;
      amount: number;
      unit: string;
    }
  ];
  ingredients: [
    {
      id: number;
      name: string;
      amount: number;
      unit: string;
      nutrients: [
        {
          name: string;
          amount: number;
          unit: string;
          percentOfDailyNeeds: number;
        }
      ];
    }
  ];
  caloricBreakdown: {
    percentProtein: number;
    percentFat: number;
    percentCarbs: number;
  };
  weightPerServing: {
    amount: number;
    unit: string;
  };
};
