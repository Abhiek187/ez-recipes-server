import { NextFunction, Request, Response } from "express";
import { redactHeadersAndFields } from "../utils/axios";
import { filterObject } from "../utils/object";

const logger = (req: Request, _res: Response, next: NextFunction) => {
  // Log all incoming requests
  const { method, originalUrl, headers, body } = req;
  const { dataForLogging } = redactHeadersAndFields(headers, body);
  // Only log the most useful headers to differentiate users
  const filteredHeaders = filterObject(headers, [
    "user-agent",
    "accept-language",
    "origin",
  ]);

  let log =
    `[Incoming Request] ${new Date()} | Method: ${method} | URL: ${originalUrl} | ` +
    `Headers: ${JSON.stringify(filteredHeaders)}`;
  // Don't log empty request bodies
  if (dataForLogging !== undefined) {
    log += ` | Data: ${JSON.stringify(dataForLogging)}`;
  }

  console.log(log);
  next();
};

export default logger;
