// eslint-disable-next-line no-shadow
export enum CodeQueue {
  EMAIL_SUCCESS = 100,
  EMAIL_NOT_DEFINED = 101,
  EMAIL_INVALID = 102,
  WHATSAPP_SUCCESS = 200,
  WHATSAPP_NOT_DEFINED = 201,
  WHATSAPP_INVALID = 202,
  WHATSAPP_SERVER_OFFLINE = 203,
  WHATSAPP_SERVER_REQUEST_ERROR = 204,
  SMS_SUCCESS = 300,
  SMS_NOT_DEFINED = 301,
  SMS_INVALID = 302,
  SMS_SERVER_OFFLINE = 303,
  SMS_SERVER_REQUEST_ERROR = 304,
  GIGA_SERVER_OFFLINE = 401,
  GIGA_SERVER_REQUEST_ERROR = 402,
  BB_SERVER_OFFLINE = 501,
  BB_SERVER_REQUEST_ERROR = 502,
  AXIOS_REQUEST_ERROR = 601,
}

export type IQueueError = {
  statusCode: CodeQueue;
  message?: string;
};

const erroCodeHandle = {
  100: 'Email enviado com sucesso',
  101: 'Email não definido',
  102: 'Email inválido',
  200: 'Whatsapp Enviado com sucesso',
  201: 'Whatsapp não definido',
  202: 'Whatsapp inválido',
  203: 'Servidor de envio de Whatsapp fora do ar',
  204: 'Erro na requisição ao servidor de Whatsapp',
  300: 'SMS enviado com sucesso',
  301: 'Número de Telefone não definido',
  302: 'Número de Telefone inválido',
  303: 'Servidor de envio de SMS fora do ar',
  304: 'Erro na requisição ao servidor de SMS',
  401: 'Não foi possível completar a requisição ao Giga',
  402: 'Erro na requisição ao servidor Giga',
  501: 'Não foi possível completar a requisição ao servidor do BB',
  502: 'Erro na requisição ao servidor BB',
  601: 'Axios error',
};

export default class QueueError {
  public readonly statusCode: CodeQueue;

  public readonly message: string;

  constructor({ statusCode, message }: IQueueError) {
    this.statusCode = statusCode;
    this.message = message || erroCodeHandle[statusCode];
  }
}
