import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareCardNumbers, generateExtrapolationPatterns } from '../utils/cardTools.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

function placeholderFor(id) {
  const input = html.match(new RegExp(`<input[^>]+id="${id}"[^>]+>`))?.[0] ?? '';
  return input.match(/placeholder="Ej: ([^"]+)"/)?.[1] ?? '';
}

test('los ejemplos visibles de comparación son válidos y compatibles', () => {
  const comparison = compareCardNumbers(placeholderFor('sim-cc1'), placeholderFor('sim-cc2'));
  assert.equal(comparison.isValid, true);
  assert.equal(comparison.pattern.length, 16);
});

test('el ejemplo visible de patrones produce cuatro resultados', () => {
  const result = generateExtrapolationPatterns(placeholderFor('pos-cc'));
  assert.equal(result.isValid, true);
  assert.equal(result.patterns.length, 4);
});

test('la navegación móvil incluye control, grupos y todas las herramientas', () => {
  assert.match(html, /id="mobile-menu-toggle"/);
  assert.match(html, /id="primary-navigation"/);
  for (const label of ['Crear', 'Analizar', 'Biblioteca']) assert.match(html, new RegExp(`>${label}<`));
  for (const id of ['mode-generator-btn', 'mode-validator-btn', 'mode-batch-btn', 'mode-extrapolator-btn', 'mode-method1-btn', 'mode-data-btn', 'mode-history-btn']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
