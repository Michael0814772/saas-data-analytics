import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]

  /** Default datasource/source mapping for ingestion resolution. */
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sourceId: string
}
