import { UserDocument } from "../../../shared/models/user.model";

export class UserResponseDto {
   id: string;
   email: string;
   username?: string;
   role: string;

   constructor(user: UserDocument) {
      this.id = user._id.toString();
      this.email = user.email;
      this.username = user.username;
      this.role = user.role;
   }
}