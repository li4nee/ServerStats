import { globalConfig } from "../../../shared/config/global.config";
import { User, UserDocument } from "../../../shared/models/user.model";
import { PermissionNotGranted, ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { JwtUtils } from "../../../shared/utils/jwt.utils";
import { UserBaseRepo } from "../repos/base.repo";
import logger from "../../../shared/config/logger.config";

export class AuthService {
   protected userRepo: UserBaseRepo<User>;
   public jwtUtils = JwtUtils;
   constructor(userRepo: UserBaseRepo<User>) {
      if (!userRepo) {
         throw new ResourceNotInitializedError("User repository must be provided to AuthService");
      }
      this.userRepo = userRepo;
   }

   private generateToken(user: UserDocument): string {
      const payload = {
         id: user._id.toString(),
         role: user.role,
         permissions: user.permissions ?? {
            canCreateApiKeys: false,
            canManageUsers: false,
            canViewRawLogs: false,
            canViewAnalytics: false,
            canManageSettings: false,
            canExportData: false,
         },
      };
      return this.jwtUtils.generateToken(payload, globalConfig.jwt.secret, globalConfig.jwt.expiresIn);
   }

   private formatUserResponseWithoutPassword(user: UserDocument): Omit<User, "password"> {
      const userObj = user.toObject ? user.toObject() : { ...user };
      const { password, ...userWithoutPasswordObj } = userObj;
      return userWithoutPasswordObj;
   }

   async onboardSuperAdmin(superAdminData: Partial<User>): Promise<{ user: Omit<User, "password">; token: string }> {
      try {
         const existingAdmin = await this.userRepo.findIfAnyExists();
         if (existingAdmin) throw new PermissionNotGranted("Onboarding disabled for now.");
         const user = (await this.userRepo.create(superAdminData)) as UserDocument;
         const token = this.generateToken(user);
         logger.info(`Super admin onboarded with email: ${user.email}`);
         return {
            user: this.formatUserResponseWithoutPassword(user),
            token,
         };
      } catch (error) {
         logger.error("Error during super admin onboarding", { error });
         throw error;
      }
   }
}
