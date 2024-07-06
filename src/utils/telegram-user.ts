import { User as TelegramUser } from 'telegraf/typings/core/types/typegram';
import { CreateUserDto } from '@/database/dto/create-user.dto';

export function prepareCreateUserDtoFromTelegramUser(
  user: TelegramUser,
): CreateUserDto {
  return {
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
  };
}
