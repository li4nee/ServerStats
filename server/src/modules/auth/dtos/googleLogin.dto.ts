import { z } from "zod";

export const GoogleLoginDTO = z.object({
   idToken: z.string().min(1, "Google ID token is required"),
});
export type GoogleLoginDTOType = z.infer<typeof GoogleLoginDTO>;
