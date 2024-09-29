import { isObject } from "../../utils/object";

type FirebaseRestError = {
  error: {
    code: number;
    message: string;
    status?: string; // status included in secure API, but not errors
    errors?: {
      message: string;
      domain: string;
      reason: string;
    }[];
  };
};
export const isFirebaseRestError = (
  error: unknown
): error is FirebaseRestError => {
  return isObject(error) && Object.hasOwn(error as object, "error");
};

export default FirebaseRestError;
