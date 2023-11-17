/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';
import { differenceInDays, format } from 'date-fns';

import apiGiga from '../../../utils/Giga';
import apiVendas from '../../../utils/Vendas';
import apiBB from '../../../utils/BancoBrasil';
import Logger from '../../../utils/Logger';

import { IParcela } from '../../service/destroyContract.service';

export default class DestroyContract {
  public static readonly key: string = 'DestroyContractQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const parcela: IParcela = data;

    const operadora = parcela.operadora
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, a => a.toUpperCase());

    const log = new Logger({
      route: `Queue/DestroyContract - ${operadora} - ${format(
        new Date(),
        'yyyyMMdd',
      )}`,
      console: true,
    });

    // Recusa procedumento se a parcela não tiver boleto cadastrado
    if (!parcela.boleto_nossonumero) return;

    // Recusa procedumento se o contrato não tiver o status 62 (aguardando pagamento);
    if (parcela.contrato_statusid !== '62') return;

    // Recusa procedimento se a parcela tiver status diferente de 1
    if (parcela.parcela_statusid !== '1') return;

    // Verifica de a data de vencimento foi preenchida corretamente
    const dataVencimento =
      parcela.parcela_vencimento && new Date(parcela.parcela_vencimento);
    if (!(dataVencimento instanceof Date)) return;

    // Verifica se a parcela possui mais de 10 de inadimplencia
    const diff = differenceInDays(new Date(), dataVencimento);
    if (diff < 10) return;

    // Cancelar Boleto com o BB
    console.time('Baixando Boleto no Banco');
    try {
      console.log('Iniciando baixa de boleto no bb');
      await apiBB.delete(
        `${parcela.operadora}/${parcela.boleto_nossonumero.padStart(20, '0')}`,
      );
    } catch (error) {
      log.error(JSON.stringify(error));
      throw error;
    } finally {
      console.timeEnd('Baixando Boleto no Banco');
    }

    // Exclui o contrato do banco de dados do Giga
    console.time('Exclusão de Boleto no GIGA');
    try {
      console.log('Iniciando exclusão de boletos no giga');
      await apiGiga.delete(
        `contratos/${parcela.operadora}/${parcela.contrato_id}`,
      );
    } catch (error) {
      log.error(JSON.stringify(error));
    } finally {
      console.timeEnd('Exclusão de Boleto no GIGA');
    }

    // Retorna a proposta para o portal do vendedor como recusada
    console.time('Extorno Proposta');
    try {
      console.log('iniciando extorno de proposta');
      const bodyProposta = {
        operadora: parcela.operadora,
        motivo: 'Falta de pagamento da primeira parcela',
      };
      console.log(bodyProposta);
      console.log(`propostas/vendas/recusar/contrato/${parcela.contrato_id}`);

      await apiVendas.put(
        `propostas/vendas/recusar/contrato/${parcela.contrato_id}`,
        bodyProposta,
      );
    } catch (error) {
      log.error(JSON.stringify(error));
      throw error;
    } finally {
      console.timeEnd('Extorno Proposta');
    }

    // Registra Log Informando o Processo
    log.info(
      `Contrato ${parcela.contrato_id}, pertencente a ${parcela.rf_nome}, excluido e proposta extornado por falta de pagamento`,
    );
  }
}
