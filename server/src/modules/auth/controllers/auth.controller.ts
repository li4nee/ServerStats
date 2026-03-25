import { User } from "../../../shared/models/user.model";
import { ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { CookieUtils } from "../../../shared/utils/cookie.utils";
import { ResponseFormatter } from "../../../shared/utils/responseFormatter.utils";
import { SuperAdminOnboardingDto } from "../dtos/onboarding.dto";
import { AuthService } from "../services/auth.service";
import type { NextFunction, Request, Response } from "express";

export class AuthController {
   protected authService: AuthService;
   constructor(authService: AuthService) {
      if (!authService) {
         throw new ResourceNotInitializedError("AuthService must be provided to AuthController");
      }
      this.authService = authService;
   }

   async onboardSuperAdmin(req: Request, res: Response, next: NextFunction) {
      try {
         const validatedUser = req.body
         const result = await this.authService.onboardSuperAdmin(validatedUser);
         const token = result.token;
         CookieUtils.setCookie(res, "authToken", token);
         res.status(201).json(ResponseFormatter.success("Super admin onboarded successfully", 201, { user: result.user }));
      } catch (error) {
         next(error);
      }
   }
}
