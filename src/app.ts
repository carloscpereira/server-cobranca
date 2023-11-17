/* eslint-disable @typescript-eslint/no-unused-vars */
import 'reflect-metadata';
import 'dotenv/config';
// import './utils/Mongo';
import { resolve } from 'path';

import express, { Express, Request, Response, NextFunction } from 'express';
import exphbs from 'express-handlebars';
import 'express-async-errors';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import { UI } from 'bull-board';
import Queue from './utils/Bull';
import Cron from './utils/Cron';

import AppError from './errors/AppError';

import routes from './routes';

import sentryConfig from './config/sentry';

class App {
  public readonly server: Express;

  constructor() {
    this.server = express();

    Cron.init();

    Sentry.init({
      ...sentryConfig,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app: this.server }),
      ],
      tracesSampleRate: 1.0,
    });

    Queue.process();

    this.middleware();
    this.routes();
    this.exceptionHandler();
  }

  private middleware(): void {
    this.server.use(cors());
    this.server.use(express.json());
    this.server.use('/admin/queues', UI);
    this.server.engine(
      'hbs',
      exphbs({
        extname: '.hbs',
        layoutsDir: resolve(__dirname, 'app', 'views', 'emails', 'layouts'),
        partialsDir: resolve(__dirname, 'app', 'views', 'emails', 'partials'),
        defaultLayout: 'default',
      }),
    );
    this.server.set('view engine', 'hbs');
    this.server.set('views', resolve(__dirname, 'app', 'views', 'emails'));
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(Sentry.Handlers.tracingHandler());
  }

  private routes(): void {
    this.server.use(
      '/public',
      express.static(resolve(__dirname, '..', 'public')),
    );
    this.server.use('/temp', express.static(resolve(__dirname, '..', 'temp')));
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  private exceptionHandler(): void {
    this.server.use(
      async (
        error: Error,
        request: Request,
        response: Response,
        _: NextFunction,
      ): Promise<Response> => {
        console.log(error);
        if (error instanceof AppError) {
          return response
            .status(error.statusCode)
            .json({ status: 'error', message: error.message });
        }

        return response
          .status(500)
          .json({ status: 'error', message: 'Internal Server Error' });
      },
    );
  }
}

export default new App().server;
