import {
  BadRequestException,
  Body,
  Controller,
  // Get,
  Post,
  Query,
} from '@nestjs/common';
import { BotService } from '@/bot/bot.service';
import { TrackTransactionDto } from './dto/track-transaction.dto';
import { eventWatchList } from './utils/events';
import { MonitorService } from './monitor.service';

@Controller('monitors')
export class MonitorController {
  constructor(
    private readonly botService: BotService,
    private monitorService: MonitorService,
  ) {}

  // @Get('clean')
  // async clean() {
  //   await this.monitorService.clean();
  //   return 'OK';
  // }

  @Post('transactions')
  async trackTransactions(
    @Body() body: TrackTransactionDto,
    @Query('address') address: string,
    @Query('chatId') chatId: string,
    @Query('walletName') walletName: string,
  ) {
    if (!body.type || !body.actions || !eventWatchList.includes(body.type)) {
      throw new BadRequestException('Invalid data type');
    }

    const action = body.actions.find((action) => action.type === body.type);

    if (body.status !== 'Success') return;

    if (!action) throw new BadRequestException('Invalid callback data');

    const tokensSwapped = action?.info?.tokens_swapped;

    if (tokensSwapped)
      this.botService.notifyTransaction({
        address,
        chatId,
        txnSignature: body.signatures[0],
        swappedTokens: tokensSwapped,
        walletName,
      });

    return body;
  }
}
