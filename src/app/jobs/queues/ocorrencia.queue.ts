/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

import apiGiga from '../../../utils/Giga';
import Logger from '../../../utils/Logger';

export interface OcorrenciaRequest {
  statusid: number;
  obs: string;
  descricao: string;
  numerocontratoid: number;
  subgrupoocorrencia: number;
  dataocorrencia?: string;
  pessoaagendante?: number;
  codigo?: number;
  grupoocorrenciaid: number;
  departamentoid?: number;
  setorid?: number;
  parcela_id?: number;
  calendario_id?: number;
  tipoocorrencia_calendario?: number;
  ocorrenciasistema?: string;
  horaocorrencia?: number;
  operadora: string;
}

export default class OcorrenciaQueue {
  public static readonly key: string = 'OcorrenciaQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const {
      operadora = 'idental',
      ...bodyOcorrencia
    }: OcorrenciaRequest = data;

    const log = new Logger({ route: `Queue/Ocorrencia$`, console: true });

    await apiGiga.post(
      `/ocorrencias/${operadora.toLowerCase()}`,
      bodyOcorrencia,
    );

    log.info('Ocorrencia Gerada com sucesso ', data);
  }
}
