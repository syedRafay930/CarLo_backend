import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatHistoryItemDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
