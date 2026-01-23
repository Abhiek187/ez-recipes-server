import TempModel from "../../models/TempModel";
import Temp from "../../types/client/Temp";

/**
 * Temporarily save a passkey challenge for verification
 * @param uid the UID of the chef
 * @param challenge the randomly generated challenge for the client
 * @param webAuthnUserID the randomly generated user ID for the passkey,
 * only required for registration
 */
export const savePasskeyChallenge = async (
  uid: string,
  challenge: string,
  webAuthnUserID?: string
) => {
  const challengeData: Partial<Temp> = {
    _id: uid,
    challenge,
    webAuthnUserID,
  };

  try {
    const doc = await TempModel.create(challengeData);
    console.log(
      `Successfully saved passkey challenge for chef ${doc._id} to the DB`
    );
  } catch (error) {
    console.error(`Failed to save passkey challenge for chef ${uid}:`, error);
  }
};

/**
 * Get the passkey challenge for a chef
 *
 * **Note:** This may return `null` if the challenge expired after 1 minute
 * @param uid the UID of the chef
 * @returns all the challenge data associated with the chef, or `null` if it couldn't be found
 */
export const getPasskeyChallenge = async (
  uid: string
): Promise<Temp | null> => {
  try {
    return await TempModel.findById(uid).exec();
  } catch (error) {
    console.error(`Failed to get passkey challenge for chef ${uid}:`, error);
    return null;
  }
};
