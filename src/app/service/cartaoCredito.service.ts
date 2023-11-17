/* eslint-disable no-restricted-syntax */
import Bull from '../../utils/Bull';
import apiGiga from '../../utils/Giga';

export type ParcelaProp = {
  id: string;
  statusgrupoid: string;
  datavencimento: Date;
  valor: number;
};

export type TitulosProp = {
  id: string;
  carteira: {
    id: string;
    descricao: string;
  };
  parcelas: ParcelaProp[];
};

export type CartaoCreditoProp = {
  id: string;
  statusid: string;
  tipocontratoid: number;
  contrato_parent?: number;
  cartao: {
    numerocartao: string;
    codigosegurancacartao: string;
    tipocartaoid: number;
    validadecartao: string;
    nome_titular: string;
    car_in_principal: boolean;
  };
  titulos: TitulosProp[];
  operadora?: 'atemde' | 'idental';
};

export default async (): Promise<void> => {
  const { data: parcelasIdental } = await apiGiga.get<CartaoCreditoProp[]>(
    `parcelas/idental/query/srv`,
  );

  const { data: parcelasAtemde } = await apiGiga.get<CartaoCreditoProp[]>(
    `parcelas/atemde/query/srv`,
  );

  const parcelas = parcelasIdental
    .map(p => ({ ...p, operadora: 'idental' }))
    .concat(parcelasAtemde.map(p => ({ ...p, operadora: 'atemde' })));

  for (const parcela of parcelas) {
    Bull.add({ name: 'CartaoCreditoQueue', data: parcela });
  }
};
