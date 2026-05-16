import { IsString, IsEnum, IsInt, IsOptional, IsDateString, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ObligationType } from "@contahub/database";
export class CreateObligationDto {
  @IsString() clientId!: string;
  @IsEnum(ObligationType) type!: ObligationType;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) competenceMonth!: number;
  @Type(() => Number) @IsInt() @Min(2020) competenceYear!: number;
  @IsDateString() dueDate!: string;
  @Type(() => Number) @IsInt() @IsOptional() amount?: number;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() assignedTo?: string;
}
