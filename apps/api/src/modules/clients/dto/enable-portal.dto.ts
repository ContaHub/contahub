import { IsEmail, IsBoolean } from "class-validator";

export class EnablePortalDto {
  @IsBoolean()
  portalEnabled!: boolean;

  @IsEmail()
  portalEmail!: string;
}
