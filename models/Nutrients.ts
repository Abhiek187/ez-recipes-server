import { Nutrient } from "./Nutrient";

export type Nutrients = {
  ENERC_KCAL: Nutrient; // calories
  FAT: Nutrient; // total fat
  FASAT: Nutrient; // saturated fats
  FATRN: Nutrient; // trans fats
  FAMS: Nutrient; // monosaturated fats
  FAPU: Nutrient; // polysaturated fats
  CHOCDF: Nutrient; // carbs
  "CHOCDF.net": Nutrient; // net carbs
  FIBTG: Nutrient; // fiber
  SUGAR: Nutrient; // sugar or no sugar?
  "SUGAR.added": Nutrient; // added sugars
  PROCNT: Nutrient; // protein
  CHOLE: Nutrient; // cholesterol
  NA: Nutrient; // sodium
  CA: Nutrient; // calcium
  MG: Nutrient; // magnesium
  K: Nutrient; // potassium
  FE: Nutrient; // iron
  ZN: Nutrient; // zinc
  P: Nutrient; // phosphorous
  VITA_RAE: Nutrient; // vitamin A
  VITC: Nutrient; // vitamin C
  THIA: Nutrient; // thiamin (vitamin B1)
  RIBF: Nutrient; // riboflavin (vitamin B2)
  NIA: Nutrient; // niacin (vitamin B3)
  VITB6A: Nutrient; // vitamin B6
  FOLDFE: Nutrient; // total folate (vitamin B9)
  FOLFD: Nutrient; // folate (food)
  FOLAC: Nutrient; // folic acid
  VITB12: Nutrient; // vitamin B12
  VITD: Nutrient; // vitamin D
  TOCPHA: Nutrient; // vitamin E
  VITK1: Nutrient; // vitamin K
  "Sugar.alcohol": Nutrient; // sugar alcohol
  WATER: Nutrient; // water
};
