/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

import apiGiga from '../../../utils/Giga';
import Logger from '../../../utils/Logger';

export interface LogContatoRequest {
  tipo: 'Email' | 'SMS' | 'WPP';
  body_request?: string;
  response_request?: string;
  return_code?: string;
  parcela_id?: number;
  is_error: boolean;
  operadora: string;
}

const tipos = {
  Email: 1,
  SMS: 2,
  WPP: 3,
};

export default class LogContatoQueue {
  public static readonly key: string = 'LogContatoQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const { operadora, tipo, body_request, ...body }: LogContatoRequest = data;

    const log = new Logger({
      route: `Queue/LogContato${operadora
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, a => a.toUpperCase())}`,
      console: true,
    });

    const tipo_id = tipos[tipo] || 1;
    console.log({
      body_request: JSON.stringify(body_request),
      ...body,
      tipo_id,
    });
    try {
      await apiGiga.post(`/system/log/contato/${operadora}`, {
        ...body,
        body_request:
          typeof body_request === 'string'
            ? body_request
            : JSON.stringify(body_request),
        tipo_id,
      });

      log.info('Ocorrencia Gerada com sucesso ', { ...body, tipo_id });
    } catch (error) {
      throw new Error(
        JSON.stringify({
          body: {
            ...body,
            body_request:
              typeof body_request === 'string'
                ? body_request
                : JSON.stringify(body_request),
            tipo_id,
          },
        }),
      );
    }
  }
}
