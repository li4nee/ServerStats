import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ResponseFormatter } from "../utils/responseFormatter.utils";

export const validateBody = (schema: ZodSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
   try {
      req.body = await schema.parseAsync(req.body);
      next();
   } catch (error: any) {
      return res.status(400).json(ResponseFormatter.error("Validation failed", 400, error.errors));
   }
};

export const validateQuery = (schema: ZodSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
   try {
      req.query = await schema.parseAsync(req.query);
      next();
   } catch (error: any) {
      res.status(400).json(ResponseFormatter.error("Query validation failed", 400, error.errors));
   }
};

export const validateParams = (schema: ZodSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
   try {
      req.params = await schema.parseAsync(req.params);
      next();
   } catch (error: any) {
      res.status(400).json(ResponseFormatter.error("Params validation failed", 400, error.errors));
   }
};
