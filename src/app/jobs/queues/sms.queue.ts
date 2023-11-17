/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

import { LogContatoRequest } from './logContato.queue';

import SMS from '../../../utils/SMS';
import Queue from '../../../utils/Bull';

// interface RequestHandle {
//   to: string;
//   message: string;
//   parcela?: number;
//   operadora?: string;
// }

export default class SMSQueue {
  public static readonly key: string = 'SMSQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const { to, message, parcela, operadora } = data;
    try {
      const logSMS: LogContatoRequest = {
        is_error: false,
        operadora: operadora || 'idental',
        tipo: 'SMS',
        body_request: JSON.stringify(data),
        parcela_id: parcela,
        return_code: '200',
      };

      Queue.add({ name: 'LogContatoQueue', data: logSMS });

      await SMS.sendSMS({ to, message });
    } catch (error) {
      const logSMS: LogContatoRequest = {
        is_error: true,
        operadora: operadora || 'idental',
        tipo: 'SMS',
        body_request: JSON.stringify(data),
        parcela_id: parcela,
        return_code: '500',
        response_request: JSON.stringify(error),
      };

      Queue.add({ name: 'LogContatoQueue', data: logSMS });
      throw error;
    }
  }
}
