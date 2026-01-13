type CapitalParts = {
  amount: string;
  currency: string;
};

export const REGISTERED_CAPITAL_CURRENCIES = [
  { value: 'HKD', label: 'HKD' },
  { value: 'CNY', label: 'CNY' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'JPY', label: 'JPY' },
  { value: 'SGD', label: 'SGD' },
  { value: 'TWD', label: 'TWD' },
  { value: 'AED', label: 'AED' },
  { value: 'AUD', label: 'AUD' },
];

const DEFAULT_CURRENCY = 'HKD';

export const parseRegisteredCapital = (value: string): CapitalParts => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return { amount: '', currency: DEFAULT_CURRENCY };
  }

  const currencyFirst = trimmed.match(/^([A-Za-z]{3})\s*([0-9,.\s]+)$/);
  if (currencyFirst) {
    return {
      amount: currencyFirst[2].trim(),
      currency: currencyFirst[1].toUpperCase(),
    };
  }

  const amountFirst = trimmed.match(/^([0-9,.\s]+)\s*([A-Za-z]{3})$/);
  if (amountFirst) {
    return {
      amount: amountFirst[1].trim(),
      currency: amountFirst[2].toUpperCase(),
    };
  }

  return { amount: trimmed, currency: DEFAULT_CURRENCY };
};

export const formatRegisteredCapital = (amount: string, currency: string) => {
  const cleanedAmount = typeof amount === 'string' ? amount.trim() : '';
  const cleanedCurrency = typeof currency === 'string' ? currency.trim() : '';
  if (!cleanedAmount) return '';
  if (!cleanedCurrency) return cleanedAmount;
  return `${cleanedAmount} ${cleanedCurrency.toUpperCase()}`;
};
