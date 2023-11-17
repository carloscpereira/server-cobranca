/* eslint-disable @typescript-eslint/ban-types */
import winston, { Logger as ILogger } from 'winston';
import moment from 'moment';

import { resolve } from 'path';

moment.locale('pt-br');

interface LoggerBody {
  route: string;
  console?: boolean;
}

const dateFormat = () => moment().format('LLLL');

export default class Logger {
  private logData: object | null;

  private route: string;

  private readonly logger: ILogger;

  constructor({ route, console = true }: LoggerBody) {
    this.logData = null;
    this.route = route;

    const logger = winston.createLogger({
      transports: [
        ...(console ? [new winston.transports.Console()] : []),
        new winston.transports.File({
          filename: `./logs/${route}.log`,
        }),
      ],
      format: winston.format.printf(info => {
        let message = `${dateFormat()} | ${info.level.toLocaleUpperCase()} | ${route}.log | ${
          info.message
        } |`;

        message = info.obj
          ? `${message} data: ${JSON.stringify(info.obj)} | `
          : message;
        message = this.logData
          ? `${message} logData: ${JSON.stringify(this.logData)} | `
          : message;

        return message;
      }),
    });

    this.logger = logger;
  }

  public setLogData(logData: object): void {
    this.logData = logData;
  }

  // public info(message: string): void {
  //   this.logger.log('info', message);
  // }

  public info(message: string, obj?: object): void {
    this.logger.log('info', message, obj);
  }

  // public debug(message: string): void {
  //   this.logger.log('debug', message);
  // }

  public debug(message: string, obj?: object): void {
    this.logger.log('debug', message, obj);
  }

  // public error(message: string): void {
  //   this.logger.log('error', message);
  // }

  public error(message: string, obj?: object): void {
    this.logger.log('error', message, obj);
  }

  // public warn(message: string): void {
  //   this.logger.log('warn', message);
  // }

  public warn(message: string, obj?: object): void {
    this.logger.log('warn', message, obj);
  }
}
