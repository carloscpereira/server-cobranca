/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

import { LogContatoRequest } from './logContato.queue';

import WPP from '../../../utils/WPP';
import Queue from '../../../utils/Bull';

export interface RequestHandle {
  to: string;
  message?: string;
  file?: string;
  parcela?: number;
  parcela_id?: number;
  operadora?: string;
  caption?: string;
}

export default class WPPQueue {
  public static readonly key: string = 'WPPQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const { to, message, parcela, parcela_id, operadora, file, caption } = data;

    console.log('parcela: ', parcela);

    try {
      const logWPP: LogContatoRequest = {
        is_error: false,
        operadora: operadora || 'idental',
        tipo: 'WPP',
        body_request: JSON.stringify(data),
        parcela_id: parcela || parcela_id,
        return_code: '200',
      };

      if (!file && !message) {
        throw new Error('Não há nenhum conteúdo para envio');
      }

      if (message) {
        await WPP.sendWppText({ message, to });
      }

      if (file) {
        await WPP.sendWppFile({ to, caption, url: file });
      }

      Queue.add({ name: 'LogContatoQueue', data: logWPP });
    } catch (error) {
      const logWPP: LogContatoRequest = {
        is_error: true,
        operadora: operadora || 'idental',
        tipo: 'WPP',
        body_request: JSON.stringify(data),
        parcela_id: parcela || parcela_id,
        return_code: '500',
        response_request: JSON.stringify(error),
      };

      Queue.add({ name: 'LogContatoQueue', data: logWPP });
      throw error;
    }
  }
}
