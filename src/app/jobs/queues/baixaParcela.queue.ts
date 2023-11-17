/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

import Logger from '../../../utils/Logger';

import apiGiga from '../../../utils/Giga';

type FormaPagamentoProp = {
  Modalidade: number;
  Carteira: number;
  Valor: number;
  NumeroTransacao?: string;
  PaymentId?: string;
  Tid?: string;
  Especie?: boolean;
  Deposito?: boolean;
  CartaoCredito?: {
    Numero: string;
    Validade?: string;
    CodigoSeguranca?: string;
    TipoCartaoId?: number;
  };
  Cheque?: {
    Emitente: string;
    Conta: string;
    Numero: string;
    ChequeId: number;
  };
  Boleto?: {
    Numero: string;
  };
  Consignado?: {
    Documento: string;
    Matricula: string;
  };
  Transferencia?: {
    ContaId: number;
    AgenciaId: number;
  };
};

export type BaixaParcelaProp = {
  IdParcela: number;
  operadora: 'atemde' | 'idental';
  LoteId?: number;
  TipoBaixa?: number;
  PessoaId?: number;
  DataPagamento?: Date;
  TipoMovimento?: 'C' | 'D';
  FormaPagamento: FormaPagamentoProp[];
};

export default class BaixaParcelaQueue {
  public static readonly key: string = 'BaixaParcelaQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const {
      IdParcela: id,
      operadora = 'idental',
      ...requestParcela
    } = data as BaixaParcelaProp;

    const log = new Logger({
      route: `Queue/BaixaParcela${operadora
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, a => a.toUpperCase())}`,
    });

    log.info(`Iniciando processo de baixa da parcela ${id}`);
    await apiGiga.post(`/parcelas/${operadora}/${id}/baixa`, requestParcela);

    log.info(` Finalizando processo de baixa da parcela ${id}`);
  }
}
