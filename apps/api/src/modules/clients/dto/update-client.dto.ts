import { PartialType } from "@nestjs/mapped-types";
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ClientStatus } from "@contahub/database";
import { CreateClientDto } from "./create-client.dto";
export class UpdateClientDto extends PartialType(CreateClientDto) {}
export class ListClientsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
}
