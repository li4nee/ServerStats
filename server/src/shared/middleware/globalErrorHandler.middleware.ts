import { Request, Response, NextFunction } from "express";
import { CustomError } from "../typings/error.typings";
import { ResponseFormatter } from "../utils/responseFormatter.utils";
import logger from "../config/logger.config";

/**
 * GlobalErrorHandler is a middleware for handling errors across the application.
 * Keep this in the end of the middleware stack to catch any unhandled errors.
 */
export class GlobalErrorHandler {
   static handleError(err: Error, req: Request, res: Response, next: NextFunction) {
      if (err instanceof CustomError) {
         if (err.isOperational) logger.error(`Operational error: ${err.message}`, { stack: err.stack, errorCode: err.errorCode });
         return res.status(err.statusCode).json(ResponseFormatter.error(err.message, err.statusCode, err, err.errorCode));
      }

      // unknown or programming errors
      logger.error(`Unexpected error: ${err.message}`, { stack: err.stack });
      return res.status(500).json(ResponseFormatter.error("Internal Server Error", 500, err));
   }
}
