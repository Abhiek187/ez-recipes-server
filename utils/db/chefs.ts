import ChefModel from "../../models/ChefModel";
import Chef from "../../types/client/Chef";

/**
 * Create a new chef in the DB
 * @param uid the UID of the chef
 * @param email the email of the chef
 */
export const createChef = async (uid: string, email: string) => {
  const chef: Chef = {
    _id: uid,
    email,
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
