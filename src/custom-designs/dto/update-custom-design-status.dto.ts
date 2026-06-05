import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CustomDesignStatus } from '../../database/schemas/custom-design.schema';

export class UpdateCustomDesignStatusDto {
  @IsEnum(CustomDesignStatus)
  status: CustomDesignStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
