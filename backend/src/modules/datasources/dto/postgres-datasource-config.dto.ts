import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class PostgresDatasourceConfigDto {
  @IsString()
  host: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number

  @IsString()
  user: string

  // Stored as part of datasource config.
  // IMPORTANT: do not log this value.
  @IsString()
  password: string

  @IsString()
  database: string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ssl?: boolean
}

