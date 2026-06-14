import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, MinLength } from "class-validator";
import { TaxRegime } from "@contahub/database";

export class CreateClientFreeDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @IsOptional() tradeName?: string;
  /** Identificação livre — CNPJ, CPF, passaporte, código interno, qualquer formato */
  @IsString() @IsOptional() cnpj?: string;
  @IsEnum(TaxRegime) @IsOptional() taxRegime?: TaxRegime;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() notes?: string;
  @IsBoolean() @IsOptional() portalEnabled?: boolean;
  @IsEmail() @IsOptional() portalEmail?: string;
}