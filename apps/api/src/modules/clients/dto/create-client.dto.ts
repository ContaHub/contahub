import { IsString, IsEmail, IsOptional, IsEnum, IsArray, IsBoolean, MinLength, IsIn } from "class-validator";
import { TaxRegime } from "@contahub/database";
import { PORTAL_PERMISSIONS } from "@contahub/shared";

export class CreateClientDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @IsOptional() tradeName?: string;
  //@IsString() @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido" }) cnpj!: string;
  @IsString() @IsOptional() cnpj?: string;
  @IsOptional() @IsString() cpf?: string;
  //@IsEnum(TaxRegime) taxRegime!: TaxRegime;
  @IsEnum(TaxRegime) @IsOptional() taxRegime?: TaxRegime;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() notes?: string;
  @IsArray() @IsOptional() tags?: string[];
  @IsBoolean() @IsOptional() portalEnabled?: boolean;
  @IsEmail() @IsOptional() portalEmail?: string;
    // Cada item precisa estar no catálogo do shared: valor inventado dá 400.
  // O spread cria um array comum, que o IsIn aceita em qualquer versão do class-validator.
  @IsArray() @IsOptional() @IsIn([...PORTAL_PERMISSIONS], { each: true })
  portalPermissions?: string[];
  
}