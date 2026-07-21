import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareCardNumbers,
  createSeededRandom,
  generateCardNumberFromPattern,
  generateExtrapolationPatterns,
  generateSyntheticBatch,
  generateValidExpiry,
  isLuhnValid,
  serializeBatch,
  validateBatchOptions,
  validateCardNumber,
  validateExpiryInputs,
} from '../utils/cardTools.js';

test('valida formato, longitud y Luhn por separado', () => {
  assert.equal(validateCardNumber('4242 4242 4242 4242').isValid, true);
  assert.equal(validateCardNumber('4242x').checks.format, false);
  assert.equal(validateCardNumber('123').checks.length, false);
  assert.equal(validateCardNumber('4242 4242 4242 4241').checks.luhn, false);
});

test('la misma semilla produce exactamente el mismo lote', () => {
  const options = { pattern: '424242xxxxxx', quantity: 5, seed: 'captura-01', baseYear: 2026 };
  assert.deepEqual(generateSyntheticBatch(options), generateSyntheticBatch(options));
});

test('todos los números generados cumplen Luhn y están marcados como sintéticos', () => {
  const records = generateSyntheticBatch({ pattern: '424242xxxxxx', quantity: 10, seed: 'qa', baseYear: 2026 });
  assert.equal(records.every(record => isLuhnValid(record.number)), true);
  assert.equal(records.every(record => record.synthetic === true), true);
});

test('limita la cantidad máxima del lote', () => {
  assert.equal(validateBatchOptions({ pattern: '424242', quantity: 51, seed: 'qa' }).isValid, false);
});

test('exporta CSV con encabezados configurables', () => {
  const records = generateSyntheticBatch({ pattern: '424242', quantity: 1, seed: 'csv', baseYear: 2026 });
  assert.match(serializeBatch(records, 'csv', true), /^id,number,month,year,security_code,synthetic\n/);
  assert.doesNotMatch(serializeBatch(records, 'csv', false), /^id,/);
});

test('el generador respeta un dígito final fijo y siempre conserva Luhn', () => {
  assert.equal(generateCardNumberFromPattern('4242424242424242', 16), '4242424242424242');
  assert.throws(() => generateCardNumberFromPattern('4242424242424241', 16));
  const generated = generateCardNumberFromPattern('424242xxxxxxxxxx', 16, createSeededRandom('patron'));
  assert.equal(isLuhnValid(generated), true);
});

test('valida mes y año completos y nunca genera una expiración vencida', () => {
  const now = new Date(2026, 6, 21);
  assert.equal(validateExpiryInputs('1a', '2027', now).isValid, false);
  assert.equal(validateExpiryInputs('07', '2026abc', now).isValid, false);
  assert.equal(validateExpiryInputs('06', '2026', now).isValid, false);
  const expiry = generateValidExpiry({ random: () => 0, now });
  assert.deepEqual(expiry, { month: '08', year: '2026' });
});

test('la similitud exige 15 o 16 dígitos, Luhn y el mismo BIN', () => {
  const first = generateCardNumberFromPattern('424242xxxxxxxxxx', 16, createSeededRandom('primera'));
  const second = generateCardNumberFromPattern('424242xxxxxxxxxx', 16, createSeededRandom('segunda'));
  const comparison = compareCardNumbers(first, second);
  assert.equal(comparison.isValid, true);
  assert.equal(comparison.pattern.length, 16);
  assert.equal(compareCardNumbers('12345678901234567', '12345678901234568').isValid, false);
  assert.equal(compareCardNumbers(first, '5555555555554444').isValid, false);
});

test('Método 1 crea cuatro patrones correctos para 15 y 16 dígitos', () => {
  const amex = generateExtrapolationPatterns('378282246310005|12|2030|1234');
  const visa = generateExtrapolationPatterns('4242424242424242');
  assert.equal(amex.isValid, true);
  assert.deepEqual(amex.patterns.map(pattern => pattern.length), [15, 15, 15, 15]);
  assert.equal(visa.isValid, true);
  assert.deepEqual(visa.patterns.map(pattern => pattern.length), [16, 16, 16, 16]);
  assert.equal(generateExtrapolationPatterns('4242-4242-4242-4242').isValid, false);
});
