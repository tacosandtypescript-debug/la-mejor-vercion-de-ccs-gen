import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSyntheticBatch,
  isLuhnValid,
  serializeBatch,
  validateBatchOptions,
  validateCardNumber,
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
