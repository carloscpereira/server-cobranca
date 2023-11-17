import { format, addDays } from 'date-fns';

import apiGiga from '../../utils/Giga';
import Bull from '../../utils/Bull';

import { dateStringFormatting } from '../helpers';

import { ParcelaBody } from '../jobs/queues/boleto.queue';

interface IRequestBoletoService {
  dates?: string | string[];
  sendMail?: boolean;
  sendWhatsapp?: boolean;
  sendSMS?: boolean;
}

interface IBodyFilterParcels {
  operadora: string;
  carteira_id: string;
}

interface BodyResponseParcela {
  parcela_id: string;
  boleto_nossonumero: string;
  parcela_vencimento: string;
  rf_nome: string;
  rf_email: string;
  rf_numero: string;
  rf_whatsapp: string;
  parcela_valor: number;
  rf_endereco_logradouro: string;
  rf_endereco_bairro: string;
  rf_endereco_cidade: string;
  rf_endereco_estado: string;
  rf_endereco_cep: string;
  rf_endereco_complemento: string;
  rf_documento: string;
  boleto_linhadigitavel: string;
  operadora: string;
  contrato_statusid: string;
}

export default async ({
  sendWhatsapp = false,
  sendSMS = false,
  dates,
}: IRequestBoletoService): Promise<void> => {
  const dateNow = new Date();
  const formingDateNow = format(dateNow, 'dd/MM/yyyy');
  const dateAddingFive = addDays(new Date(), 5);
  const formingAddingFive = format(dateAddingFive, 'dd/MM/yyyy');
  const dateAddingTen = addDays(new Date(), 10);
  const formingDateAddingTen = format(dateAddingTen, 'dd/MM/yyyy');

  const dateSearchDefault = `${formingDateNow},${formingAddingFive},${formingDateAddingTen}`;
  const dateSeatchCustom = dates
    ? dateStringFormatting({
        dates,
        separator: { from: ',', to: ',' },
        formatting: { from: 'dd/MM/yyyy', to: 'dd/MM/yyyy' },
      })
    : undefined;

  const {
    data: { data: apiParcelsReturn },
  } = await apiGiga.get('/parcelas/newFilter', {
    params: {
      limit: 2000,
      carteira_id: '97,82',
      contrato_statusid: '8,62,60',
      parcela_statusid: 1,
      contrato_tipoid: '5,9',
      parcela_vencimento: dateSeatchCustom || dateSearchDefault,
    },
  });

  const filterApiParcelsReturns = apiParcelsReturn.filter(
    ({ operadora, carteira_id }: IBodyFilterParcels) =>
      (operadora === 'idental' && carteira_id === '82') ||
      (operadora === 'atemde' && carteira_id === '97'),
  );

  const formatApiParcelsReturns = filterApiParcelsReturns.map(
    ({
      parcela_id: id,
      boleto_nossonumero: nossonumero,
      rf_nome: nome,
      rf_email: email,
      rf_numero: telefone,
      rf_whatsapp: whatsapp,
      parcela_vencimento: vencimento,
      parcela_valor: valor,
      rf_endereco_logradouro: logradouro,
      rf_endereco_bairro: bairro,
      rf_endereco_cidade: cidade,
      rf_endereco_estado: estado,
      rf_endereco_cep: cep,
      rf_endereco_complemento: complemento,
      rf_documento: documento,
      boleto_linhadigitavel: linhaDigitavel,
      contrato_statusid: statuscontrato,
      operadora,
    }: BodyResponseParcela): ParcelaBody => ({
      id,
      nossonumero,
      nome,
      email,
      telefone,
      whatsapp,
      vencimento,
      valor,
      linhaDigitavel,
      statuscontrato,
      documento,
      estabelecimento: operadora,

      operadora,
      forceSMS: !!sendSMS,
      forceWhatsapp: !!sendWhatsapp,
      endereco: {
        bairro,
        cep,
        cidade,
        complemento,
        estado,
        logradouro,
      },
    }),
  );

  formatApiParcelsReturns.forEach((parcel: ParcelaBody) => {
    Bull.add({ name: 'BoletoQueue', data: parcel });
  });
};
