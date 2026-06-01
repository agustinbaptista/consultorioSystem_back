import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('auth/users')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post('internal/users')
  @UseGuards(InternalApiGuard)
  createInternal(@Body() dto: CreateUserDto) {
    return this.usersService.createInternal(dto);
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
