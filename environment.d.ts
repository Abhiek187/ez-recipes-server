declare global {
  namespace NodeJS {
    // Define the types of all environment variables
    // Note: types must be strings, but can be specified
    // https://stackoverflow.com/a/53981706
    interface ProcessEnv {
      PORT?: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
