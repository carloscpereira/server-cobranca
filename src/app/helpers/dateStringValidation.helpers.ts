import { parse, isValid } from 'date-fns';

interface IRequestDateStringValidation {
  dates: string | string[];
  format?: string;
  separator?: string;
}

export default ({
  dates,
  format = 'dd/MM/yyyy',
  separator = ',',
}: IRequestDateStringValidation): boolean => {
  const separateDates = Array.isArray(dates) ? dates : dates.split(separator);

  const dateValidation = separateDates.reduce((previous, current) => {
    const parseDate = parse(current, format, new Date());
    return previous && isValid(parseDate);
  }, true);

  return dateValidation;
};
