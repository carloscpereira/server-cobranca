/* eslint-disable no-useless-escape */
export default (email: string): boolean =>
  new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'g').test(email);
