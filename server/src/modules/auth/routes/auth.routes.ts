import { Express } from "express";
import { AuthDependenciesContainer } from "../dependencies/auth.dependecies";
import { authorize } from "../../../shared/middleware/authorize.middleware";
import { authenticate } from "../../../shared/middleware/authenticate.middleware";
import { validateBody,validateParams,validateQuery } from "../../../shared/middleware/zodValidators.middleware";
import { SuperAdminOnboardingDtoType } from "../dtos/onboarding.dto";
