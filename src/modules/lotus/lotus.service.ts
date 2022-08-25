import { Injectable } from '@nestjs/common';
import {
  HttpJsonRpcConnector,
  LotusClient,
  LotusWalletProvider,
  WsJsonRpcConnector,
} from 'filecoin.js';
import { AppConfig } from '../configuration/configuration.service';

@Injectable()
export class LotusService {
  public client: LotusClient;
  public walletProvider: LotusWalletProvider;

  constructor(protected readonly config: AppConfig) {
    const httpConnector = new HttpJsonRpcConnector({
      url: this.config.values.lotus.url,
      // token: this.config.values.lotus.token
    });

    const wsConnector = new WsJsonRpcConnector({
      url: this.config.values.lotus.wsUrl,
      token: this.config.values.lotus.token,
    });

    this.client = new LotusClient(httpConnector);
    this.walletProvider = new LotusWalletProvider(this.client);
  }
}
