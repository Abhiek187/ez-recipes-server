import { NextFunction, Request, Response } from "express";
import { redactHeadersAndFields } from "../utils/axios";

const logger = (req: Request, _res: Response, next: NextFunction) => {
  // Log all incoming requests
  const { method, originalUrl, headers, body } = req;
  // Logging all headers isn't needed, but may change later
  const { dataForLogging } = redactHeadersAndFields(headers, body);

  let log = `[Incoming Request] ${new Date()} | Method: ${method} | URL: ${originalUrl}`;
  // Don't log empty request bodies
  if (dataForLogging !== undefined) {
    log += ` | Data: ${JSON.stringify(dataForLogging)}`;
  }

  console.log(log);
  next();
};

export default logger;
