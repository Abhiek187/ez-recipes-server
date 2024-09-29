import { FilterQuery, UpdateQuery } from "mongoose";

import ChefModel from "../../models/ChefModel";
import Chef from "../../types/client/Chef";
import Encryptor from "../crypto";

/**
 * Create a new chef in the DB
 * @param uid the UID of the chef
 * @param email the email of the chef
 */
export const createChef = async (uid: string, email: string) => {
  const chef: Chef = {
    _id: uid,
    email,
    refreshToken: null,
    ratings: {},
    recentRecipes: [],
    favoriteRecipes: [],
  };

  try {
    const doc = await ChefModel.create(chef); // create == insertOne
    console.log(`Successfully added chef ${doc._id} to the DB`);
  } catch (error) {
    console.error(`Failed to create chef ${uid}:`, error);
  }
};

/**
 * Store the chef's refresh token encrypted in the DB
 * @param uid the UID of the chef
 * @param refreshToken the chef's refresh token
 */
export const saveRefreshToken = async (uid: string, refreshToken: string) => {
  const filter: FilterQuery<Chef> = {
    _id: uid,
  };
  const encryptor = new Encryptor();
  const encryptedRefreshToken = encryptor.encrypt(refreshToken);
  const update: UpdateQuery<Chef> = {
    refreshToken: encryptedRefreshToken,
  };

  try {
    const result = await ChefModel.updateOne(filter, update).exec();
    console.log(`Successfully added refresh token for chef ${uid}:`, result);
  } catch (error) {
    console.error(`Failed to save the refresh token for chef ${uid}:`, error);
  }
};

/**
 * Get the decrypted refresh token for the chef
 * @param uid the UID of the chef
 * @returns the refresh token, or `null` if the token couldn't be found
 */
export const getRefreshToken = async (uid: string): Promise<string | null> => {
  try {
    const doc = await ChefModel.findOne({ _id: uid }).exec();
    const encryptedRefreshToken = doc?.refreshToken;
    if (encryptedRefreshToken === undefined || encryptedRefreshToken === null)
      return null;

    const encryptor = new Encryptor();
    return encryptor.decrypt(encryptedRefreshToken);
  } catch (error) {
    console.error(`Failed to get the refresh token for chef ${uid}:`, error);
    return null;
  }
};

/**
 * Delete a chef from the DB
 * @param uid the UID of the chef
 */
export const deleteChef = async (uid: string) => {
  const query = { _id: uid };

  try {
    const result = await ChefModel.deleteOne(query).exec();
    console.log(`Deleted ${result.deletedCount} chef document`); // should be just 1
  } catch (error) {
    // Prevent format string injections from tainting the logs
    console.error("Failed to delete chef", `${uid}:`, error);
  }
};
