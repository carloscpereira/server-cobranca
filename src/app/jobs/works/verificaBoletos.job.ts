import 'dotenv/config';

import { addDays, format, parse, subDays } from 'date-fns';
import apiBB from '../../../utils/BancoBrasil';
import apiGiga from '../../../utils/Giga';
import Bull from '../../../utils/Bull';

import { BaixaParcelaProp } from '../queues/baixaParcela.queue';
import { OcorrenciaRequest } from '../queues/ocorrencia.queue';

interface ResponseBoletos {
  numeroBoletoBB: string;
  dataRegistro: string;
  dataVencimento: string;
  valorOriginal: number;
  carteiraConvenio: number;
  variacaoCarteiraConvenio: number;
  estadoTituloCobranca: string;
  contrato: number;
  dataMovimento: string;
  valorAtual: number;
  valorPago: number;
}

export default class VerificaBoletosJob {
  public static readonly key: string = 'VerificaBoletosJob';

  // public static readonly cronTime: string = '0 1 * 1/1 * *';

  public static readonly cronTime: string =
    process.env.CRONTABLE_VERIFICABOLETO || '0 0 0/4 1/1 * *';

  public static async handle(): Promise<void> {
    /**
     * Requisição de boletos pagos
     */
    let returnAtemdeBB = { data: { data: { boletos: [] } } };
    let returnIdentalBB = { data: { data: { boletos: [] } } };

    try {
      returnAtemdeBB = await apiBB.get(`/atemde/`, {
        params: {
          indicadorSituacao: 'B',
          estadoBoleto: '06',
          dataInicioMovimento: format(subDays(new Date(), 10), 'dd.MM.yyyy'),
          dataFimMovimento: format(addDays(new Date(), 1), 'dd.MM.yyyy'),
        },
      });
    } catch (error) {
      console.error(error);
    }

    try {
      returnIdentalBB = await apiBB.get(`/idental/`, {
        params: {
          indicadorSituacao: 'B',
          estadoBoleto: '06',
          dataInicioMovimento: format(subDays(new Date(), 10), 'dd.MM.yyyy'),
          dataFimMovimento: format(addDays(new Date(), 1), 'dd.MM.yyyy'),
        },
      });
    } catch (error) {
      console.error(error);
    }

    const {
      data: {
        data: { boletos: responseAtemdeBB },
      },
    } = returnAtemdeBB;

    const {
      data: {
        data: { boletos: responseIdentalBB },
      },
    } = returnIdentalBB;

    /**
     * Organização do obj
     */
    const boletosIdental = responseIdentalBB.map(
      ({ numeroBoletoBB, dataMovimento, valorPago }: ResponseBoletos) => ({
        nossoNumero: numeroBoletoBB.substring(3),
        dataMovimento,
        valorPago,
      }),
    );

    const boletosAtemde = responseAtemdeBB.map(
      ({ numeroBoletoBB, dataMovimento, valorPago }: ResponseBoletos) => ({
        nossoNumero: numeroBoletoBB.substring(3),
        dataMovimento,
        valorPago,
      }),
    );

    const boletos = [...boletosIdental, ...boletosAtemde];

    /**
     * Requisição ao giga
     */
    const {
      data: { data: responseIdentalGiga },
    } = await apiGiga.get('/parcelas', {
      params: {
        limit: boletos.length,
        operadora: 'idental',
        parcela_statusid: '1',
        boleto_nossonumero: boletos
          .map(({ nossoNumero }: { nossoNumero: string }) =>
            nossoNumero.toString(),
          )
          .join(','),
      },
    });

    const {
      data: { data: responseAtemdeGiga },
    } = await apiGiga.get('/parcelas', {
      params: {
        limit: boletos.length,
        operadora: 'atemde',
        parcela_statusid: '1',
        boleto_nossonumero: boletos
          .map(({ nossoNumero }: { nossoNumero: string }) =>
            nossoNumero.toString(),
          )
          .join(','),
      },
    });

    /**
     * Organização das parcelas pagas
     */
    const parcelasIdental = responseIdentalGiga.map(
      (el: { boleto_nossonumero: string }) => ({
        parcela: el,
        bb: boletos.find(
          (b: { nossoNumero: string }) =>
            b.nossoNumero === el.boleto_nossonumero,
        ),
      }),
    );

    const parcelasAtemde = responseAtemdeGiga.map(
      (el: { boleto_nossonumero: string }) => ({
        parcela: el,
        bb: boletos.find(
          (b: { nossoNumero: string }) =>
            b.nossoNumero === el.boleto_nossonumero,
        ),
      }),
    );

    /**
     * Inserção na fila de baixa
     */
    // eslint-disable-next-line no-restricted-syntax
    for (const { parcela, bb } of parcelasIdental) {
      const baixaParcela: BaixaParcelaProp = {
        IdParcela: parcela.parcela_id,
        operadora: 'idental',
        DataPagamento: parse(bb.dataMovimento, 'dd.MM.yyyy', new Date()),
        TipoMovimento: 'C',
        TipoBaixa: 4,
        PessoaId: 1,
        FormaPagamento: [
          {
            Carteira: 82,
            Modalidade: 7,
            Valor: bb.valorPago,
            Boleto: {
              Numero: bb.nossoNumero,
            },
          },
        ],
      };

      const ocorrenciaParcela: OcorrenciaRequest = {
        descricao: 'Baixa Parcela (Boleto)',
        grupoocorrenciaid: 2,
        numerocontratoid: parcela.contrato_id,
        subgrupoocorrencia: 16,
        operadora: 'idental',
        obs: `Baixa da parcela ${parcela.parcela_id} do título ${
          parcela.contrato_id
        }, no valor de ${parcela.parcela_valor.toLocaleString('pr-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
        })}`,
        statusid: 10,
        parcela_id: parcela.parcela_id,
      };

      Bull.add({ name: 'BaixaParcelaQueue', data: baixaParcela });
      Bull.add({ name: 'OcorrenciaQueue', data: ocorrenciaParcela });
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const { parcela, bb } of parcelasAtemde) {
      const baixaParcela: BaixaParcelaProp = {
        IdParcela: parcela.parcela_id,
        operadora: 'atemde',
        DataPagamento: parse(bb.dataMovimento, 'dd.MM.yyyy', new Date()),
        TipoMovimento: 'C',
        TipoBaixa: 4,
        PessoaId: 1,
        FormaPagamento: [
          {
            Carteira: 82,
            Modalidade: 7,
            Valor: bb.valorPago,
            Boleto: {
              Numero: bb.nossoNumero,
            },
          },
        ],
      };

      const ocorrenciaParcela: OcorrenciaRequest = {
        descricao: 'Baixa Parcela (Boleto)',
        grupoocorrenciaid: 2,
        numerocontratoid: parcela.contrato_id,
        subgrupoocorrencia: 16,
        operadora: 'atemde',
        obs: `Baixa da parcela ${parcela.parcela_id} do título ${
          parcela.contrato_id
        }, no valor de ${parcela.parcela_valor.toLocaleString('pr-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
        })}`,
        statusid: 10,
        parcela_id: parcela.parcela_id,
      };

      Bull.add({ name: 'BaixaParcelaQueue', data: baixaParcela });
      Bull.add({ name: 'OcorrenciaQueue', data: ocorrenciaParcela });
    }
  }

  public static async onComplete(): Promise<void> {
    console.log('testando');
  }
}
