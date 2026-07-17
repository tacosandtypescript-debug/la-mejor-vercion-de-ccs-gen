/**
 * Pure helpers shared by the validator and reproducible batch generator.
 * Generated records are explicitly marked as synthetic test data.
 */

export const MIN_CARD_LENGTH = 13;
export const MAX_CARD_LENGTH = 19;
export const MAX_BATCH_SIZE = 50;

export function normalizeCardNumber(value) {
  return String(value ?? '').replace(/[\s-]/g, '');
}

export function isLuhnValid(number) {
  if (!/^\d+$/.test(number)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function calculateLuhn(numberWithoutCheckDigit) {
  let sum = 0;
  let shouldDouble = true;
  for (let index = numberWithoutCheckDigit.length - 1; index >= 0; index -= 1) {
    let digit = Number(numberWithoutCheckDigit[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (10 - (sum % 10)) % 10;
}

export function validateCardNumber(rawValue) {
  const raw = String(rawValue ?? '').trim();
  const digits = normalizeCardNumber(raw);
  const checks = {
    present: raw.length > 0,
    format: raw.length > 0 && /^[\d\s-]+$/.test(raw),
    length: digits.length >= MIN_CARD_LENGTH && digits.length <= MAX_CARD_LENGTH,
    luhn: false,
  };

  checks.luhn = checks.format && checks.length && isLuhnValid(digits);

  const messages = [];
  if (!checks.present) messages.push('Introduce un número para validarlo.');
  if (checks.present && !checks.format) messages.push('Usa únicamente números, espacios o guiones.');
  if (checks.format && !checks.length) messages.push(`La longitud debe estar entre ${MIN_CARD_LENGTH} y ${MAX_CARD_LENGTH} dígitos.`);
  if (checks.format && checks.length && !checks.luhn) messages.push('El dígito de control no cumple el algoritmo de Luhn.');
  if (checks.luhn) messages.push('El formato, la longitud y el algoritmo de Luhn son correctos.');

  return {
    isValid: checks.present && checks.format && checks.length && checks.luhn,
    digits,
    checks,
    messages,
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(seed || 'synthetic-test-data');
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInteger(random, minimum, maximum) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

export function validateBatchOptions({ pattern, quantity, seed, baseYear = new Date().getFullYear() }) {
  const normalizedPattern = String(pattern ?? '').trim().toLowerCase();
  const parsedQuantity = Number(quantity);
  const parsedBaseYear = Number(baseYear);
  const errors = {};

  if (!normalizedPattern) errors.pattern = 'Introduce un patrón de al menos 6 caracteres.';
  else if (!/^[\dx]+$/.test(normalizedPattern)) errors.pattern = "Usa solo números y la letra 'x'.";
  else if (normalizedPattern.length < 6 || normalizedPattern.length > 16) errors.pattern = 'El patrón debe tener entre 6 y 16 caracteres.';

  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > MAX_BATCH_SIZE) {
    errors.quantity = `La cantidad debe estar entre 1 y ${MAX_BATCH_SIZE}.`;
  }
  if (!String(seed ?? '').trim()) errors.seed = 'Introduce una semilla para poder repetir el lote.';
  if (!Number.isInteger(parsedBaseYear) || parsedBaseYear < 2000 || parsedBaseYear > 2100) {
    errors.baseYear = 'El año base debe estar entre 2000 y 2100.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: { pattern: normalizedPattern, quantity: parsedQuantity, seed: String(seed ?? '').trim(), baseYear: parsedBaseYear },
  };
}

export function generateSyntheticBatch(options) {
  const validation = validateBatchOptions(options);
  if (!validation.isValid) throw new Error('Las opciones del lote no son válidas.');

  const { pattern, quantity, seed, baseYear } = validation.values;
  const random = createSeededRandom(seed);
  const isAmexLength = pattern.startsWith('34') || pattern.startsWith('37');
  const targetLength = isAmexLength ? 15 : 16;
  const prefixLength = targetLength - 1;
  const paddedPattern = pattern.slice(0, prefixLength).padEnd(prefixLength, 'x');

  return Array.from({ length: quantity }, (_, index) => {
    let generatedPrefix = '';
    for (const character of paddedPattern) {
      generatedPrefix += character === 'x' ? String(randomInteger(random, 0, 9)) : character;
    }
    const number = generatedPrefix + calculateLuhn(generatedPrefix);
    const securityCodeLength = isAmexLength ? 4 : 3;

    return {
      id: index + 1,
      number,
      month: String(randomInteger(random, 1, 12)).padStart(2, '0'),
      year: String(randomInteger(random, baseYear + 1, baseYear + 5)),
      security_code: String(randomInteger(random, 0, (10 ** securityCodeLength) - 1)).padStart(securityCodeLength, '0'),
      synthetic: true,
    };
  });
}

function escapeCsv(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeBatch(records, format, includeHeader = true, delimiter = '|') {
  const columns = ['id', 'number', 'month', 'year', 'security_code', 'synthetic'];
  if (format === 'json') return JSON.stringify(records, null, 2);

  const separator = format === 'csv' ? ',' : delimiter;
  const rows = records.map(record => columns.map(column => {
    const value = record[column];
    return format === 'csv' ? escapeCsv(value) : String(value);
  }).join(separator));

  if (includeHeader) rows.unshift(columns.join(separator));
  return rows.join('\n');
}
