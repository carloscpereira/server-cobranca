interface Request {
  size: number;
  numero: string;
}

export default ({ numero, size = 24 }: Request): string => {
  let fixNumber = numero.replace(/\D/gim, '');

  if (fixNumber.length < size) {
    const diff = size - fixNumber.length;
    for (let i = diff; i > 0; i -= 1) {
      fixNumber = `0${fixNumber}`;
    }
  }

  return fixNumber;
};
