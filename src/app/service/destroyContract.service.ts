import { differenceInDays } from 'date-fns';
import Bull from '../../utils/Bull';
import apiGiga from '../../utils/Giga';

export type IParcela = {
  diavencimento: number | null;
  parcela_id: string | null;
  parcela_statusid: string | null;
  parcela_status: string | null;
  parcela_valor: number | null;
  parcela_valor_bruto: number | null;
  parcela_numero: number | null;
  parcela_vencimento: string | null;
  parcela_pagamento: string | null;
  parcela_cadastro: string | null;
  parcela_in_cobranca: boolean;
  parcela_pausedat: string | null;
  parcela_paused: boolean;
  lote_id: string | null;
  lote_cadastro: string | null;
  lote_baixa: string | null;
  titulo_id: string | null;
  titulo_valor: number | null;
  titulo_parcelas: number | null;
  titulo_statusid: number | null;
  carteira_id: string | null;
  carteira_tipo: string | null;
  carteira_modalidadeid: number | null;
  carteira_modalidade: string | null;
  boleto_linhadigitavel: string | null;
  boleto_codigobarras: string | null;
  boleto_nossonumero: string | null;
  boleto_taxaboleto: string | null;
  boleto_taxamora: string | null;
  rf_id: string | null;
  rf_nome: string | null;
  rf_documento: string | null;
  rf_nascimento: string | null;
  rf_email: string | null;
  rf_numero: string | null;
  rf_whatsapp: string | null;
  rf_endereco_logradouro: string | null;
  rf_endereco_numero: number | null;
  rf_endereco_bairro: string | null;
  rf_endereco_cidade: string | null;
  rf_endereco_estado: string | null;
  rf_endereco_cep: string | null;
  rf_endereco_complemento: string | null;
  cartao_id: string | null;
  cartao_numero: string | null;
  cartao_codigoseguranca: string | null;
  cartao_validade: string | null;
  cartao_diavencimento: string | null;
  cartao_titular: string | null;
  cartao_tipoid: string | null;
  cartao_tipo: string | null;
  contrato_id: string | null;
  contrato_numero: string | null;
  contrato_statusid: string | null;
  contrato_adesao: string | null;
  contrato_cancelamento: string | null;
  contrato_status: string | null;
  contrato_tipoid: number | null;
  formapamento_valor: string | null;
  formapamento_cheque: string | null;
  formapagamento_cheque_conta: string | null;
  formapagamento_cheque_emitente: string | null;
  formapagamento_catao_numero: string | null;
  formapagamento_cartao_validade: string | null;
  formapagamento_cartao_codigoseguranca: string | null;
  formapagamento_cartao_tid: string | null;
  formapagamento_cartao_paymentid: string | null;
  formapagamento_documento: string | null;
  formapagamento_matricula: string | null;
  formapagamento_transacao: string | null;
  formapagamento_boleto_nossonumero: string | null;
  formapagamento_carteiraid: string | null;
  formapagamento_carteira: string | null;
  formapagamento_modalidadepagamento: string | null;
  formapagamento_modalidadepagamentoid: string | null;
  formapagamento_agenciaid: string | null;
  formapagamento_agencia: string | null;
  formapagamento_agencia_codigo: string | null;
  formapagamento_banco: string | null;
  formapagamento_banco_codigo: string | null;
  formapagamento_conta: string | null;
  ocorrencias: string | null;
  logs_cartaocredito: string | null;
  logs_email: string | null;
  logs_sms: string | null;
  logs_whatsapp: string | null;
  operadora: 'idental' | 'atemde';
};

export type RequestAxiosParcela = {
  error: string | null | null;
  data: IParcela[];
};

export default async (): Promise<void> => {
  // Pega todos os contratos com a parcela statusid 1 (não pagas), contrato status 62 (aguardando pagamento) com a carteira id 82 (Boleto Bancário)
  let {
    data: { data: contratos },
  } = await apiGiga.get<RequestAxiosParcela>(
    `parcelas?contrato_statusid=62&parcela_statusid=1&carteira_id=82&limit=10000`,
  );

  // Filtra apenas contratos que estão a 10 ou mais dias sem pagamentos
  contratos = contratos.filter(
    ({ parcela_vencimento }) =>
      parcela_vencimento &&
      differenceInDays(new Date(), new Date(parcela_vencimento)) >= 10,
  );

  // Adiciona todos os contratos na fila de processamento
  contratos.forEach(contrato => {
    Bull.add({ name: 'DestroyContractQueue', data: contrato });
  });
};
