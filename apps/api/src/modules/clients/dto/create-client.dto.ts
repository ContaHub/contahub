import { IsString, IsEmail, IsOptional, IsEnum, IsArray, MinLength, Matches } from "class-validator";
import { TaxRegime } from "@contahub/database";
export class CreateClientDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @IsOptional() tradeName?: string;
  @IsString() @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido" }) cnpj!: string;
  @IsEnum(TaxRegime) taxRegime!: TaxRegime;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() notes?: string;
  @IsArray() @IsOptional() tags?: string[];
}
