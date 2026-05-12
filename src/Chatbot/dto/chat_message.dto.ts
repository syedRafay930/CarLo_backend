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
  @IsIn(['user', 'assistant', 'model'])
  role: 'user' | 'assistant' | 'model';

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

  /** Ignored for identity: email comes from JWT on /message. Kept for backward compatibility. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userEmail?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
