import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import wppConfig from '../config/wpp';

interface SendText {
  to: string;
  message: string;
}

interface SendFile {
  to: string;
  caption: string;
  url: string;
}

interface IPhoneInfoStatusReturn {
  Mcc: string;
  Mnc: string;
  OsVersion: string;
  DeviceManufacturer: string;
  DeviceModel: string;
  OsBuildNumber: string;
  WaVersion: string;
}

interface IInfoStatusReturn {
  Battery: number;
  Platform: string;
  Connected: boolean;
  Pushname: string;
  Wid: string;
  Lc: string;
  Phone: IPhoneInfoStatusReturn;
  Plugged: boolean;
  Tos: number;
  Lg: string;
  Is24h: boolean;
}

interface IStatusReturn {
  connected: boolean;
  power_save: boolean;
  info: IInfoStatusReturn;
}

class WPP {
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create(wppConfig as AxiosRequestConfig);
  }

  public async isOn(): Promise<boolean> {
    const {
      data: { connected },
    } = await this.api.get<IStatusReturn>('/status');

    return connected;
  }

  public async sendWppText({ to, message }: SendText): Promise<void> {
    if (to.length !== 11) {
      throw new Error('Número de contato inválido');
    }

    return this.api.post('/send_message', {
      number: to,
      message,
    });
  }

  public async sendWppFile({ to, caption, url }: SendFile): Promise<void> {
    if (to.length !== 11) {
      throw new Error('Número de contato inválido');
    }

    return this.api.post('/send_message_file_from_url', {
      number: to,
      caption,
      url,
    });

    // return this.api.post("/send-media", {
    //   sender: "primary",
    //   number: to,
    //   caption,
    //   file: url,
    // });
  }
}

export default new WPP();
