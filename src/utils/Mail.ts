/* eslint-disable @typescript-eslint/ban-types */
import nodemailer, {
  Transporter,
  TransportOptions,
  SendMailOptions,
} from 'nodemailer';
import exphbs from 'express-handlebars';
import { resolve } from 'path';

import mailConfig from '../config/mail';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailerhbs = require('nodemailer-express-handlebars');

interface RequestSendMail extends SendMailOptions {
  template?: string;
  context?: object;
}

class Mail {
  public readonly transporter: Transporter;

  constructor() {
    const { host, port, secure, auth } = mailConfig;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: auth.user ? auth : undefined,
      debug: true,
    } as TransportOptions);
    this.configureTemplates();
  }

  public async sendMail(message: RequestSendMail): Promise<any> {
    return this.transporter.sendMail({
      ...mailConfig.default,
      ...message,
    });
  }

  public configureTemplates(): void {
    const viewPath = resolve(__dirname, '..', 'app', 'views', 'emails');

    this.transporter.use(
      'compile',
      nodemailerhbs({
        viewEngine: exphbs.create({
          layoutsDir: resolve(viewPath, 'layouts'),
          partialsDir: resolve(viewPath, 'partials'),
          defaultLayout: 'default',
          extname: '.hbs',
        }),
        viewPath,
        extName: '.hbs',
      }),
    );
  }
}

export default new Mail();
