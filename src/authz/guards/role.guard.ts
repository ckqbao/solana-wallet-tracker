import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { plainToInstance } from 'class-transformer'
import { TelegrafException, TelegrafExecutionContext } from 'nestjs-telegraf'

import { RoleEnum } from '../enums/role.enum'
import { Context } from '@/bot/interfaces/context.interface'
import { CreateUserDto } from '@/database/dto/create-user.dto'
import { UserRepository } from '@/database/repository/user.repository'

const META_KEY = 'roles'

export const RoleGuardOptions = (roles: RoleEnum[]) => SetMetadata(META_KEY, roles)

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<RoleEnum[]>(META_KEY, [context.getHandler(), context.getClass()])

    const ctx = TelegrafExecutionContext.create(context)
    const { from } = ctx.getContext<Context>()

    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, from))

    if (!roles.includes(user.role)) {
      throw new TelegrafException('You are not allowed')
    }

    return true
  }
}
