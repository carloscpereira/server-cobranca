/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';
import { format, parse } from 'date-fns';
import Bull from '../../../utils/Bull';

import apiCielo from '../../../utils/Cielo';
import apiGiga from '../../../utils/Giga';
import Logger from '../../../utils/Logger';
import { CartaoCreditoProp } from '../../service/cartaoCredito.service';
import { BaixaParcelaProp } from './baixaParcela.queue';
import { OcorrenciaRequest } from './ocorrencia.queue';

const estabelecimento = {
  atemde: 2771093302,
  idental: 2768247507,
};

const codigoEstabelecimento = {
  atemde: 98,
  idental: 90,
};

export default class CartaoCreditoQueue {
  public static readonly key: string = 'CartaoCreditoQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    try {
      const { cartao, titulos, id, operadora } = data as CartaoCreditoProp;

      if (!operadora) {
        return;
      }
      const log = new Logger({
        route: `Queue/CartaoCredito${operadora
          .toLowerCase()
          .replace(/(?:^|\s)\S/g, a => a.toUpperCase())}`,
      });

      const titulo = titulos[0];
      const parcela = titulos[0].parcelas[0];
      const valorParcelaFormatado = parcela.valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      });

      const bodyCielo = {
        Custumer: {
          Name: cartao.nome_titular,
        },
        Amount: parcela.valor,
        CardNumber: cartao.numerocartao,
        ...(cartao.nome_titular.length >= 255
          ? {}
          : { Holder: cartao.nome_titular }),
        ExpirationDate: format(
          parse(cartao.validadecartao, 'yyyy-MM-dd', new Date()),
          'MM/yyyy',
        ),
        SecurityCode: cartao.codigosegurancacartao.replace(/(\D)/g, ''),
      };
      console.log(cartao);
      console.log(bodyCielo);

      const {
        data: {
          data: { response },
        },
      } = await apiCielo.post(
        `/credit-card/${operadora}/${estabelecimento[operadora]}`,
        bodyCielo,
      );

      await log.info('Response Cartão de Crédito Cielo: ', {
        parcela: { titulos, cartao },
        response,
      });

      console.log(response);

      if (Number.parseInt(response.Payment.Status, 10) !== 2) {
        const ocorrenciaParcela: OcorrenciaRequest = {
          statusid: 10,
          obs: `Cartão não Autorizado. O pagamento da parcela ${
            parcela.id
          } do título ${titulo.id}, pertencente a ${
            cartao.nome_titular
          }, no valor de ${valorParcelaFormatado}, não pôde ser paga. motivo ${
            response.Payment.ReturnCodeMessage
              ? response.Payment.ReturnCodeMessage.desc
              : 'Cartão não autorizado'
          }`,
          pessoaagendante: 1,
          descricao: 'CT N AUTORIZADO',
          numerocontratoid: Number.parseInt(id, 10),
          grupoocorrenciaid: 7,
          subgrupoocorrencia: 39,
          ocorrenciasistema: 'S',
          parcela_id: Number.parseInt(parcela.id, 10),
          operadora,
        };

        Bull.add({ name: 'OcorrenciaQueue', data: ocorrenciaParcela });
      } else {
        const baixaParcela: BaixaParcelaProp = {
          IdParcela: Number.parseInt(parcela.id, 10),
          operadora,
          DataPagamento: new Date(),
          TipoMovimento: 'C',
          TipoBaixa: 4,
          PessoaId: 1,
          FormaPagamento: [
            {
              Carteira: codigoEstabelecimento[operadora],
              PaymentId: response.Payment.PaymentId,
              Valor: parcela.valor,
              Modalidade: 2,
              NumeroTransacao: response.Payment.AuthorizationCode,
              CartaoCredito: {
                Numero: cartao.numerocartao,
                Validade: cartao.validadecartao,
                CodigoSeguranca: cartao.codigosegurancacartao,
              },
            },
          ],
        };

        const ocorrenciaParcela: OcorrenciaRequest = {
          operadora,
          grupoocorrenciaid: 2,
          numerocontratoid: Number.parseInt(id, 10),
          statusid: 10,
          subgrupoocorrencia: 16,
          parcela_id: Number.parseInt(parcela.id, 10),
          descricao: 'Baixa Parcela (Crédito)',
          obs: `Baixa da parcela ${parcela.id} do título ${titulo.id} pertencente a ${cartao.nome_titular}, no valor de ${valorParcelaFormatado} pela operadora de cartão de créditos vínculada ao estabelecimento ${estabelecimento[operadora]}`,
        };

        Bull.add({ name: 'BaixaParcelaQueue', data: baixaParcela });
        Bull.add({ name: 'OcorrenciaQueue', data: ocorrenciaParcela });

        try {
          await apiGiga.post(`/parcelas/log/cartao-credito/${operadora}`, {
            tid: response.Payment.Tid,
            authorization_code: response.Payment.AuthorizationCode || 0,
            payment_id: response.Payment.PaymentId,
            return_message: response.Payment.ReturnMessage,
            return_code: response.Payment.ReturnCode,
            establishment: codigoEstabelecimento[operadora],
            parcelaid: parcela.id,
            response: JSON.stringify(response),
            processamento: new Date(),
          });
        } catch (error) {
          log.error(
            `Erro ao tentar registrar log na operadora ${operadora} da parcela ${parcela.id}`,
          );
        }

        try {
          await apiGiga.post(`contratos/${operadora}/${id}/enable`);
        } catch (error) {
          if (error instanceof Error) {
            log.error(
              `Ocorreu um erro durante a tentativa de ativação do contrato ${id}. erro: `,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
