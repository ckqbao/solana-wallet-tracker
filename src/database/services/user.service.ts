import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '../schema/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getById(userId: string) {
    return await this.userModel.findById(userId).exec();
  }

  async getOrCreate(createUserDto: CreateUserDto) {
    let user = await this.userModel.findOne({
      telegramId: createUserDto.telegramId,
    });
    if (!user) {
      user = await this.userModel.create(createUserDto);
    }
    return user;
  }
}
