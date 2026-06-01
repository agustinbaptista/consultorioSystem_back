import {
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @Headers('x-user-id') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findForUser(userId, unreadOnly === 'true', page, limit);
  }

  @Patch('read-all')
  markAll(@Headers('x-user-id') userId: string) {
    return this.service.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.service.markRead(id, userId);
  }
}
