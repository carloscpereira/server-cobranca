/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { SendMailOptions } from 'nodemailer';
import { Job } from 'bull';
import Queue from '../../../utils/Bull';
import Mail from '../../../utils/Mail';

import { LogContatoRequest } from './logContato.queue';

interface Attachment {
  filename: string;
  contentType: string;
}

interface ToRequest {
  name: string;
  email: string;
}

interface RequestHandle {
  to: ToRequest;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: object;
  attachments?: Array<Attachment>;
  parcela?: number;
  operadora?: string;
}

export default class MailQueue {
  public static readonly key: string = 'MailQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const {
      to,
      subject,
      template,
      context,
      attachments,
      text,
      parcela,
      operadora,
    }: RequestHandle = data;
    try {
      await Mail.sendMail({
        to: `${to.name} <${to.email}>`,
        subject,
        template,
        context,
        attachments,
        text,
      } as SendMailOptions);

      const logMail: LogContatoRequest = {
        is_error: false,
        operadora: operadora || 'idental',
        tipo: 'Email',
        body_request: JSON.stringify(data),
        parcela_id: parcela,
        return_code: '200',
      };

      Queue.add({ name: 'LogContatoQueue', data: logMail });
    } catch (err) {
      const logMail: LogContatoRequest = {
        is_error: true,
        operadora: operadora || 'idental',
        tipo: 'Email',
        body_request: JSON.stringify(data),
        parcela_id: parcela,
        return_code: '500',
        response_request: JSON.stringify(err),
      };

      Queue.add({ name: 'LogContatoQueue', data: logMail });
      console.log(err);
      throw err;
    }
  }
}
