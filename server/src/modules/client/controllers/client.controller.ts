import { AuthorizedRequest } from "../../../shared/typings/base.typings";
import type { Response, NextFunction } from "express";
import { InvalidInputError, ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { AuthService } from "../../auth/services/auth.service";
import { ClientService } from "../services/client.service";
import { ResponseFormatter } from "../../../shared/utils/responseFormatter.utils";
import { fa } from "zod/v4/locales";

export class ClientController {
   protected authService: AuthService;
   protected clientService: ClientService;
   constructor(authService: AuthService, clientService: ClientService) {
      if (!authService) {
         throw new ResourceNotInitializedError("AuthService must be provided to AuthController");
      }
      if (!clientService) {
         throw new ResourceNotInitializedError("ClientService must be provided to ClientController");
      }
      this.authService = authService;
      this.clientService = clientService;
   }

   private checkIfClientIdIsThereAndValid(clientId: string | string[]): void {
      if (!clientId) {
         throw new InvalidInputError("Client ID is required.");
      }
      if (typeof clientId !== "string") {
         throw new InvalidInputError("Client ID must be a string.");
      }
   }
   /**
    * Onboard a new client
    */
   async createClient(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         // This extra checking dispite middleware to ensure that no way other user can use this endpoint.
         const isSuperAdmin = await this.authService.isSuperAdmin(req.user!.id);
         if (!isSuperAdmin) {
            return res.status(403).json(ResponseFormatter.error("Access denied.", 403));
         }
         const client = await this.clientService.createClient(req.body, req.user!.id);
         return res.status(201).json(ResponseFormatter.success("Client created successfully.", 201, { client }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * Create a new user for a specific client
    */
   async createClientUser(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId } = req.params;
         this.checkIfClientIdIsThereAndValid(clientId);
         const result = await this.clientService.createClientUser(clientId as string, req.body, req.user!);
         return res.status(201).json(ResponseFormatter.success("Client user created successfully.", 201, { user: result }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * Create new API keys for a specific client
    */
   async createApiKeysForClient(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId } = req.params;
         this.checkIfClientIdIsThereAndValid(clientId);
         const apiKey = await this.clientService.createApiKeysForClient(clientId as string, req.body, req.user!);
         return res.status(201).json(ResponseFormatter.success("API keys created successfully.", 201, { apiKey }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * Get all API keys for a specific client. The actual key values are never returned, only their metadata.
    */
   async getApiKeysForClient(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId } = req.params;
         this.checkIfClientIdIsThereAndValid(clientId);
         const apiKeys = await this.clientService.getApiKeysForClient(clientId as string, req.user!);
         return res.status(200).json(ResponseFormatter.success("API keys retrieved successfully.", 200, { apiKeys }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * Get a specific API key by ID for a specific client. The actual key value is never returned, only its metadata.
    */
   async getApiKeyFromId(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params;
         this.checkIfClientIdIsThereAndValid(clientId);
         if (!id) {
            return res.status(400).json(ResponseFormatter.error("API Key ID is required.", 400));
         }
         if (typeof id !== "string") {
            return res.status(400).json(ResponseFormatter.error("API Key ID must be a string.", 400));
         }
         const apiKey = await this.clientService.getApiKeyFromId(clientId as string, id, req.user!);
         if (!apiKey) {
            return res.status(404).json(ResponseFormatter.error("API key not found.", 404));
         }
         return res.status(200).json(ResponseFormatter.success("API key retrieved successfully.", 200, { apiKey }));
      } catch (error) {
         next(error);
      }
   }
}
