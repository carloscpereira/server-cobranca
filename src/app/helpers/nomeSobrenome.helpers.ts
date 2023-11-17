export default (nome: string): string => {
  const nomeArr = nome.split(' ');

  return `${nomeArr[0]} ${nomeArr[nomeArr.length - 1]}`;
};
