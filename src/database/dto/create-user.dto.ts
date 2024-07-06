import { Expose } from 'class-transformer'

export class CreateUserDto {
  @Expose({ name: 'id' })
  telegramId: number

  @Expose({ name: 'first_name' })
  firstName: string

  @Expose({ name: 'last_name' })
  lastName: string

  @Expose()
  username: string
}
