export default (text: string): string => {
  if (!text) return '';

  const textArr = text.split(' ');
  const articles = [
    'a',
    'e',
    'o',
    'da',
    'de',
    'do',
    'das',
    'dos',
    'para',
    'com',
  ];

  return textArr
    .map(el => {
      if (articles.includes(el.toLowerCase()) && textArr.indexOf(el) !== 0) {
        return el;
      }
      return el.charAt(0).toUpperCase() + el.slice(1);
    })
    .join(' ');
};
