import { Type } from 'class-transformer'
import { IsIn, IsString, ValidateNested } from 'class-validator'
import { DATASOURCE_TYPE_POSTGRES } from '../enums/datasource-type.enum'
import { PostgresDatasourceConfigDto } from './postgres-datasource-config.dto'

export class CreateDatasourceDto {
  @IsString()
  @IsIn([DATASOURCE_TYPE_POSTGRES])
  type: typeof DATASOURCE_TYPE_POSTGRES

  @ValidateNested()
  @Type(() => PostgresDatasourceConfigDto)
  config: PostgresDatasourceConfigDto
}

