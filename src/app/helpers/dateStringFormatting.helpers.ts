import { parse, format } from 'date-fns';

import dateStringValidation from './dateStringValidation.helpers';

interface IBodyToFrom {
  to?: string;
  from: string;
}

interface IRequestDateStringFormatting {
  dates: string | string[];
  formatting: IBodyToFrom;
  separator: IBodyToFrom;
}

export default ({
  dates,
  formatting: { to: formatTo = 'dd.MM.yyyy', from: formatFrom = 'dd/MM/yyyy' },
  separator: { to: separatorTo = ',', from: separatorFrom = ',' },
}: IRequestDateStringFormatting): string => {
  const separateDates = Array.isArray(dates)
    ? dates
    : dates.split(separatorFrom);

  const validateDates = dateStringValidation({
    dates: separateDates,
    format: formatFrom,
    separator: separatorFrom,
  });

  if (!validateDates) {
    throw new Error('Dates entered for validation are invalid');
  }

  const formatSeparateDates = separateDates.map(date => {
    const dateParse = parse(date, formatFrom, new Date());

    return format(dateParse, formatTo);
  });

  return formatSeparateDates.join(separatorTo);
};
