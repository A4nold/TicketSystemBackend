import { Injectable } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { AcceptTransferDto } from "./dto/accept-transfer.dto";
import { CancelTransferDto } from "./dto/cancel-transfer.dto";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { AcceptTransferService } from "./accept-transfer.service";
import { CancelTransferService } from "./cancel-transfer.service";
import { CreateTransferService } from "./create-transfer.service";
import { ExpireTransferService } from "./expire-transfer.service";
import { RemindTransferService } from "./remind-transfer.service";

@Injectable()
export class TransfersService {
  constructor(
    private readonly createTransferService: CreateTransferService,
    private readonly acceptTransferService: AcceptTransferService,
    private readonly cancelTransferService: CancelTransferService,
    private readonly expireTransferService: ExpireTransferService,
    private readonly remindTransferService: RemindTransferService,
  ) {}

  async createTransfer(
    serialNumber: string,
    payload: CreateTransferDto,
    user: AuthenticatedUser,
  ) {
    return this.createTransferService.createTransfer(serialNumber, payload, user);
  }

  async acceptTransfer(
    serialNumber: string,
    payload: AcceptTransferDto,
    user: AuthenticatedUser,
  ) {
    return this.acceptTransferService.acceptTransfer(serialNumber, payload, user);
  }

  async cancelTransfer(
    serialNumber: string,
    payload: CancelTransferDto,
    user: AuthenticatedUser,
  ) {
    return this.cancelTransferService.cancelTransfer(serialNumber, payload, user);
  }

  async remindTransfer(serialNumber: string, user: AuthenticatedUser) {
    return this.remindTransferService.remindTransfer(serialNumber, user);
  }

  async expireOverdueTransfersForUser(user: AuthenticatedUser) {
    return this.expireTransferService.expireOverdueTransfersForUser(user);
  }

  async expireOverdueTransferForSerialNumber(serialNumber: string) {
    return this.expireTransferService.expireOverdueTransferForSerialNumber(
      serialNumber,
    );
  }
}
