/* eslint-disable no-useless-escape */
export default (cellPhone: string): boolean =>
  new RegExp(/^([1-9]{2})?(9?)([6-9]{1})(\d{7})$/, 'g').test(cellPhone);
