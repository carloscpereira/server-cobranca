import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import smsConfig from '../config/sms';

interface SendSMSRequest {
  from?: string;
  to: string;
  message: string;
}

class SMS {
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create(smsConfig as AxiosRequestConfig);
  }

  public async sendSMS({
    from = 'Grupo Atemde',
    to,
    message,
  }: SendSMSRequest): Promise<void> {
    return this.api.post('/restapi/sms/1/text/single', {
      from,
      to,
      text: message,
    });
  }

  // public async reportSMS({}): Promise<void> {}
}

export default new SMS();
