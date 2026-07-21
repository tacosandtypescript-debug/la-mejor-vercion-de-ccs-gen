/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { addEntry, clearHistory as clearHistoryStore, getState, subscribe } from './history/store';
import { renderHistoryList } from './components/renderHistory';
import { HistoryEntry, GeneratePayload, SimilarityPayload, PossibilitiesPayload, HistoryType, HistoryPayload } from './history/types';
import * as binStore from './bins/store';
import { BinEntry } from './bins/types';
import { renderBinsList, setUseInGeneratorCallback, setEditBinCallback, renderTrashedBinsList } from './components/renderBins';
import {
    compareCardNumbers,
    generateCardNumberFromPattern,
    generateExtrapolationPatterns,
    generateSyntheticBatch,
    generateValidExpiry,
    serializeBatch,
    validateBatchOptions,
    validateCardNumber,
    validateExpiryInputs,
} from './utils/cardTools.js';

type Theme = 'day' | 'night' | 'sparkle';
type Country = 'Mexico' | 'United States';
type DocumentType = 'CURP' | 'RFC' | 'SSN' | 'DL' | 'Passport';

interface SyntheticRecord {
    id?: number;
    firstName: string;
    lastName:string;
    fullName: string;
    dob: string; // YYYY-MM-DD
    email: string;
    phone: string;
    documentType: string;
    documentNumber: string;
    address: {
        street: string;
        number: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
}


// --- State for Data View ---
let currentPurchaseRecord: SyntheticRecord | null = null;


// --- CORE APP SETUP ---
document.addEventListener('DOMContentLoaded', () => {
    // --- FEATURE SETUP ---
    setupMotionPreference();
    setupControls();
    setupViewSwitcher();
    setupMobileNavigation();
    setupCopyButtons();
    setupDelegatedListeners();
    setupValidator();
    setupBatchGenerator();
    setupKeyboardShortcuts();
    
    // --- GENERATOR LOGIC (MAIN) ---
    setupGenerator();
    
    // --- UNIFIED HISTORY ---
    setupUnifiedHistory();

    // --- EXTRAPOLator LOGIC ---
    setupExtrapolator();
    
    // --- NEW GENERATOR FOR EXTRAPOLATOR VIEW ---
    const extrapolatorPrefix = 'ext-';
    setupGenerator(extrapolatorPrefix);

    // --- NEW GENERATOR FOR METHOD 1 VIEW ---
    const method1Prefix = 'm1-';
    setupGenerator(method1Prefix);

    // --- DATA GENERATOR (LOCAL DB) ---
    setupDataView();

    // --- SAVED BINS HISTORY ---
    setupHistoryView();
    setupSaveModal();

    const getBinFromPayload = (type: HistoryType, payload: HistoryPayload): string => {
        switch (type) {
            case 'generate': return (payload as GeneratePayload).bin;
            case 'similarity': return (payload as SimilarityPayload).result;
            case 'possibilities': return (payload as PossibilitiesPayload).card.split('|')[0];
            default: return '';
        }
    };

    // --- GLOBAL HELPER FOR SAVING BINS ---
    (window as any).promptToSaveBin = (entry: HistoryEntry) => {
        const allBins = binStore.getBins();
        
        if (entry.type === 'generate') {
            const payload = entry.payload as GeneratePayload;
            const compositeBin = [
                payload.bin || '', payload.month || '', payload.year || '', payload.cvv || ''
            ].join('|');

            const existingBin = allBins.find(b => b.bin === compositeBin);
            if (existingBin) {
                openSaveModal(existingBin); // Already saved, open for editing
            } else {
                openSaveModal({ // Prepare data for new save
                    bin: payload.bin,
                    month: payload.month,
                    year: payload.year,
                    cvv: payload.cvv,
                });
            }
        } else {
            // For other types, just save the main number as before
            const bin = getBinFromPayload(entry.type, entry.payload);
            const existingBin = allBins.find(b => b.bin === bin);
            openSaveModal(existingBin || { bin });
        }
    };
});


// --- FEATURE MODULES ---

function setupMobileNavigation() {
    const toggle = document.getElementById('mobile-menu-toggle') as HTMLButtonElement | null;
    const navigation = document.getElementById('primary-navigation') as HTMLElement | null;
    const header = document.querySelector('.app-header') as HTMLElement | null;
    if (!toggle || !navigation || !header) return;

    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const setOpen = (open: boolean, restoreFocus = false) => {
        navigation.classList.toggle('is-open', open);
        toggle.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        toggle.querySelector('.menu-text')!.textContent = open ? 'Cerrar' : 'Menú';
        if (open) navigation.querySelector<HTMLButtonElement>('button')?.focus();
        else if (restoreFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => {
        setOpen(!navigation.classList.contains('is-open'));
    });

    navigation.querySelectorAll('.mode-btn, .theme-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (mobileQuery.matches) setOpen(false, true);
        });
    });

    document.addEventListener('click', event => {
        if (!mobileQuery.matches || !navigation.classList.contains('is-open')) return;
        const target = event.target as Node;
        if (!navigation.contains(target) && !header.contains(target)) setOpen(false);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
            setOpen(false, true);
        }
    });

    mobileQuery.addEventListener('change', event => {
        if (!event.matches) setOpen(false);
    });
}

function setupMotionPreference() {
    const toggle = document.getElementById('reduce-motion-toggle') as HTMLInputElement | null;
    if (!toggle) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const savedPreference = localStorage.getItem('reduceMotion');
    const shouldReduce = savedPreference === null ? mediaQuery.matches : savedPreference === 'true';

    const applyPreference = (enabled: boolean) => {
        document.documentElement.classList.toggle('reduce-motion', enabled);
        toggle.checked = enabled;
    };

    applyPreference(shouldReduce);
    toggle.addEventListener('change', () => {
        applyPreference(toggle.checked);
        localStorage.setItem('reduceMotion', String(toggle.checked));
    });
}

function setupControls() {
    const themeButtons = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;
    
    if (!themeButtons.length) return;

    if (!document.documentElement.classList.contains('reduce-motion')) {
        createStars();
        createRain();
    }

    function applyTheme(theme: Theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeButtons.forEach(btn => {
            const isPressed = btn.dataset.theme === theme;
            btn.setAttribute('aria-pressed', String(isPressed));
        });
    }

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newTheme = button.dataset.theme as Theme;
            if (newTheme) {
                applyTheme(newTheme);
            }
        });
    });

    const savedTheme = (localStorage.getItem('theme') as Theme) || 'night';
    applyTheme(savedTheme);
}

function createStars(count = 30) {
    const container = document.getElementById('stars-container');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDuration = `${Math.random() * 2 + 2}s`; // 2-4s
        star.style.animationDelay = `${Math.random() * 4}s`;
        fragment.appendChild(star);
    }
    container.appendChild(fragment);
}

function createRain(count = 40) {
    const container = document.getElementById('rainy-forest-bg');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${Math.random() * 0.5 + 0.5}s`; // 0.5 to 1.0s
        drop.style.animationDelay = `${Math.random() * 5}s`;
        drop.style.opacity = String(Math.random() * 0.5 + 0.2); // 0.2 to 0.7
        fragment.appendChild(drop);
    }
    container.appendChild(fragment);
}

function getActiveView(): HTMLElement | null {
    const generatorView = document.getElementById('generator-view') as HTMLElement;
    const validatorView = document.getElementById('validator-view') as HTMLElement;
    const batchView = document.getElementById('batch-view') as HTMLElement;
    const extrapolatorView = document.getElementById('extrapolator-view') as HTMLElement;
    const method1View = document.getElementById('method1-view') as HTMLElement;
    const dataView = document.getElementById('data-view') as HTMLElement;
    const historyView = document.getElementById('history-view') as HTMLElement;


    if (generatorView && !generatorView.classList.contains('hidden')) return generatorView;
    if (validatorView && !validatorView.classList.contains('hidden')) return validatorView;
    if (batchView && !batchView.classList.contains('hidden')) return batchView;
    if (extrapolatorView && !extrapolatorView.classList.contains('hidden')) return extrapolatorView;
    if (method1View && !method1View.classList.contains('hidden')) return method1View;
    if (dataView && !dataView.classList.contains('hidden')) return dataView;
    if (historyView && !historyView.classList.contains('hidden')) return historyView;

    return null;
}

function setupViewSwitcher() {
    const generatorView = document.getElementById('generator-view') as HTMLElement;
    const validatorView = document.getElementById('validator-view') as HTMLElement;
    const batchView = document.getElementById('batch-view') as HTMLElement;
    const extrapolatorView = document.getElementById('extrapolator-view') as HTMLElement;
    const method1View = document.getElementById('method1-view') as HTMLElement;
    const dataView = document.getElementById('data-view') as HTMLElement;
    const historyView = document.getElementById('history-view') as HTMLElement;
    
    const generatorBtn = document.getElementById('mode-generator-btn');
    const validatorBtn = document.getElementById('mode-validator-btn');
    const batchBtn = document.getElementById('mode-batch-btn');
    const extrapolatorBtn = document.getElementById('mode-extrapolator-btn');
    const method1Btn = document.getElementById('mode-method1-btn');
    const dataBtn = document.getElementById('mode-data-btn');
    const historyBtn = document.getElementById('mode-history-btn');


    const appTitle = document.getElementById('app-title');
    const transitionDuration = 300; 

    const views = [generatorView, validatorView, batchView, extrapolatorView, method1View, dataView, historyView];
    views.forEach(view => {
        if (view) {
            view.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
            view.style.opacity = view.classList.contains('hidden') ? '0' : '1';
        }
    });

    function switchView(viewToShow: HTMLElement, newTitle: string, newActiveBtn: HTMLElement) {
        const currentView = getActiveView();
        
        if (currentView === viewToShow) return;

        const reducedMotion = document.documentElement.classList.contains('reduce-motion');
        const effectiveDuration = reducedMotion ? 0 : transitionDuration;

        if (currentView) {
            currentView.style.opacity = '0';
        }

        setTimeout(() => {
            if (currentView) {
                currentView.classList.add('hidden');
            }
            viewToShow.classList.remove('hidden');
            
            requestAnimationFrame(() => {
                viewToShow.style.opacity = '1';
            });

            if(appTitle) appTitle.textContent = newTitle;
            document.querySelectorAll('.mode-switcher .mode-btn').forEach(btn => btn.classList.remove('active'));
            newActiveBtn.classList.add('active');
            newActiveBtn.setAttribute('aria-current', 'page');
            document.querySelectorAll('.mode-switcher .mode-btn').forEach(btn => {
                if (btn !== newActiveBtn) btn.removeAttribute('aria-current');
            });
        }, effectiveDuration);
    }

    generatorBtn?.addEventListener('click', () => switchView(generatorView, "Generador de Tarjetas", generatorBtn));
    validatorBtn?.addEventListener('click', () => switchView(validatorView, "Validador", validatorBtn));
    batchBtn?.addEventListener('click', () => switchView(batchView, "Generación por Lotes", batchBtn));
    extrapolatorBtn?.addEventListener('click', () => switchView(extrapolatorView, "Comparar patrones", extrapolatorBtn));
    method1Btn?.addEventListener('click', () => switchView(method1View, "Generar patrones", method1Btn));
    dataBtn?.addEventListener('click', () => switchView(dataView, "Generador de Datos", dataBtn));
    historyBtn?.addEventListener('click', () => switchView(historyView, "BINs Guardados", historyBtn));
}

function copyTextToClipboard(text: string, buttonEl: HTMLElement) {
    if (!text) return;

    const showSuccess = () => {
        const iconCopy = buttonEl.querySelector('.icon-copy') as HTMLElement;
        const iconCheck = buttonEl.querySelector('.icon-check') as HTMLElement;
        if (!iconCopy || !iconCheck) return;
        iconCopy.style.display = 'none';
        iconCheck.style.display = 'inline-block';
        setTimeout(() => {
            iconCopy.style.display = 'inline-block';
            iconCheck.style.display = 'none';
        }, 2000);
    };

    navigator.clipboard.writeText(text).then(showSuccess, () => {
        console.warn('Clipboard API failed, using fallback.');
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) showSuccess();
            else showError('No se pudo copiar el texto.');
        } catch (err) {
            console.error('Fallback copy failed', err);
            showError('No se pudo copiar el texto.');
        }
        document.body.removeChild(textArea);
    });
}

function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const buttonEl = e.currentTarget as HTMLElement;
            const targetId = buttonEl.dataset.target;
            if (!targetId) return;
            const targetElement = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement;
            if (!targetElement || !targetElement.value) return;
            copyTextToClipboard(targetElement.value, buttonEl);
        });
    });
}

function setupDelegatedListeners() {
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Delegate Clear History
        const clearHistoryBtn = target.closest('#clear-history-btn');
        if (clearHistoryBtn) {
            e.preventDefault();
            if (window.confirm('¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.')) {
                clearHistoryStore();
            }
            return;
        }
        
        // Delegate Paste BIN
        const pasteBtn = target.closest('[id$="paste-bin-btn"]');
        if (pasteBtn) {
            e.preventDefault();
            const prefix = pasteBtn.id.replace('paste-bin-btn', '');
            const binInput = document.getElementById(`${prefix}bin`) as HTMLInputElement;
            if (binInput) {
                // Focus the input to allow native mobile paste. Avoids clipboard permission errors.
                binInput.focus();
            }
            return;
        }

        // Delegate Clear BIN Input
        const clearBinBtn = target.closest('[id$="clear-bin-btn"]');
        if (clearBinBtn) {
            e.preventDefault();
            const prefix = clearBinBtn.id.replace('clear-bin-btn', '');
            const binInput = document.getElementById(`${prefix}bin`) as HTMLInputElement;
            if (binInput) {
                binInput.value = '';
                binInput.focus();
                binInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }
        
        // Delegate for inline text copy buttons
        const copyTextBtn = target.closest('.copy-text-btn');
        if (copyTextBtn) {
            e.preventDefault();
            const textToCopy = (copyTextBtn as HTMLElement).dataset.text ?? '';
            copyTextToClipboard(textToCopy, copyTextBtn as HTMLElement);
            return;
        }
    });
}

function showError(message: string, prefixOrContainer: string | HTMLElement = '') {
    let container: Element | null = null;
    if (typeof prefixOrContainer === 'string') {
        const activeView = getActiveView();
        if (!activeView) return;
        
        const card = activeView.querySelector(`#${prefixOrContainer}generator-card, .extrapolator-method, .card`);
        container = card?.querySelector('.error-toast-container') ?? activeView.querySelector('.error-toast-container');

    } else {
        container = prefixOrContainer;
    }

    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 4000);
}

function getFieldMessageElement(input: HTMLInputElement): HTMLElement | null {
    const existing = document.getElementById(`${input.id}-message`);
    if (existing) return existing;

    const field = input.closest('.field');
    if (!field) return null;
    const message = document.createElement('p');
    message.id = `${input.id}-message`;
    message.className = 'field-message';
    message.setAttribute('aria-live', 'polite');
    field.appendChild(message);

    const describedBy = new Set((input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    describedBy.add(message.id);
    input.setAttribute('aria-describedby', [...describedBy].join(' '));
    return message;
}

function setFieldMessage(input: HTMLInputElement, message: string, kind: 'error' | 'success' | '' = 'error') {
    const messageElement = getFieldMessageElement(input);
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.classList.toggle('is-error', kind === 'error');
    messageElement.classList.toggle('is-success', kind === 'success');
    if (kind === 'error') input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
}

function clearFieldMessage(input: HTMLInputElement) {
    setFieldMessage(input, '', '');
}

function setupValidator() {
    const input = document.getElementById('validator-number') as HTMLInputElement | null;
    const validateButton = document.getElementById('validate-number-btn') as HTMLButtonElement | null;
    const clearButton = document.getElementById('clear-validator-btn') as HTMLButtonElement | null;
    const resultPanel = document.getElementById('validator-result') as HTMLElement | null;
    const resultTitle = document.getElementById('validator-result-title') as HTMLElement | null;
    const checksList = document.getElementById('validator-checks') as HTMLUListElement | null;
    const explanation = document.getElementById('validator-explanation') as HTMLElement | null;
    if (!input || !validateButton || !clearButton || !resultPanel || !resultTitle || !checksList || !explanation) return;

    const validate = () => {
        const result = validateCardNumber(input.value);
        checksList.replaceChildren();

        const checks = [
            ['Formato', result.checks.format],
            [`Longitud (${result.digits.length} dígitos)`, result.checks.length],
            ['Algoritmo de Luhn', result.checks.luhn],
        ];
        checks.forEach(([label, passed]) => {
            const item = document.createElement('li');
            item.className = passed ? 'check-pass' : 'check-fail';
            item.textContent = `${passed ? '✓' : '×'} ${label}`;
            checksList.appendChild(item);
        });

        resultPanel.classList.remove('hidden', 'is-valid', 'is-invalid');
        resultPanel.classList.add(result.isValid ? 'is-valid' : 'is-invalid');
        resultTitle.textContent = result.isValid ? 'Número válido' : 'Número no válido';
        explanation.textContent = result.messages.join(' ');

        if (result.isValid) setFieldMessage(input, 'La comprobación se completó correctamente.', 'success');
        else setFieldMessage(input, result.messages[0], 'error');
    };

    validateButton.addEventListener('click', validate);
    input.addEventListener('input', () => {
        clearFieldMessage(input);
        resultPanel.classList.add('hidden');
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            validate();
        }
    });
    clearButton.addEventListener('click', () => {
        input.value = '';
        clearFieldMessage(input);
        resultPanel.classList.add('hidden');
        checksList.replaceChildren();
        input.focus();
    });
}

function setupBatchGenerator() {
    const patternInput = document.getElementById('batch-pattern') as HTMLInputElement | null;
    const quantityInput = document.getElementById('batch-quantity') as HTMLInputElement | null;
    const baseYearInput = document.getElementById('batch-base-year') as HTMLInputElement | null;
    const seedInput = document.getElementById('batch-seed') as HTMLInputElement | null;
    const formatSelect = document.getElementById('batch-format') as HTMLSelectElement | null;
    const delimiterSelect = document.getElementById('batch-delimiter') as HTMLSelectElement | null;
    const delimiterField = document.getElementById('batch-delimiter-field') as HTMLElement | null;
    const headerInput = document.getElementById('batch-header') as HTMLInputElement | null;
    const generateButton = document.getElementById('generate-batch-btn') as HTMLButtonElement | null;
    const copyButton = document.getElementById('copy-batch-btn') as HTMLButtonElement | null;
    const exportButton = document.getElementById('export-batch-btn') as HTMLButtonElement | null;
    const resultsArea = document.getElementById('batch-results') as HTMLTextAreaElement | null;
    const status = document.getElementById('batch-status') as HTMLElement | null;
    if (!patternInput || !quantityInput || !baseYearInput || !seedInput || !formatSelect || !delimiterSelect || !delimiterField || !headerInput || !generateButton || !copyButton || !exportButton || !resultsArea || !status) return;

    baseYearInput.value = String(new Date().getFullYear());

    let records: Array<Record<string, string | number | boolean>> = [];

    const getDelimiter = () => delimiterSelect.value === 'tab' ? '\t' : delimiterSelect.value;
    const updateFormatControls = () => {
        const isText = formatSelect.value === 'txt';
        const isJson = formatSelect.value === 'json';
        delimiterField.classList.toggle('is-disabled', !isText);
        delimiterSelect.disabled = !isText;
        headerInput.disabled = isJson;
    };
    const renderOutput = () => {
        if (!records.length) return;
        resultsArea.value = serializeBatch(records, formatSelect.value, headerInput.checked, getDelimiter());
    };
    const clearErrors = () => [patternInput, quantityInput, baseYearInput, seedInput].forEach(clearFieldMessage);

    const generate = () => {
        clearErrors();
        status.textContent = '';
        const validation = validateBatchOptions({
            pattern: patternInput.value,
            quantity: Number(quantityInput.value),
            seed: seedInput.value,
            baseYear: Number(baseYearInput.value),
        });

        if (!validation.isValid) {
            const fieldMap: Record<string, HTMLInputElement> = {
                pattern: patternInput,
                quantity: quantityInput,
                seed: seedInput,
                baseYear: baseYearInput,
            };
            Object.entries(validation.errors).forEach(([field, message]) => {
                setFieldMessage(fieldMap[field], String(message), 'error');
            });
            const firstInvalid = Object.keys(validation.errors)[0];
            fieldMap[firstInvalid]?.focus();
            return;
        }

        records = generateSyntheticBatch(validation.values);
        renderOutput();
        copyButton.disabled = false;
        exportButton.disabled = false;
        status.textContent = `${records.length} registros sintéticos generados con la semilla “${validation.values.seed}”.`;
        setFieldMessage(seedInput, 'Guarda esta semilla para repetir exactamente el lote.', 'success');
    };

    patternInput.addEventListener('input', () => {
        patternInput.value = patternInput.value.replace(/[^0-9xX]/g, '').toLowerCase();
        clearFieldMessage(patternInput);
    });
    quantityInput.addEventListener('input', () => clearFieldMessage(quantityInput));
    baseYearInput.addEventListener('input', () => clearFieldMessage(baseYearInput));
    seedInput.addEventListener('input', () => clearFieldMessage(seedInput));
    formatSelect.addEventListener('change', () => {
        updateFormatControls();
        renderOutput();
    });
    delimiterSelect.addEventListener('change', renderOutput);
    headerInput.addEventListener('change', renderOutput);
    generateButton.addEventListener('click', generate);

    copyButton.addEventListener('click', () => {
        copyTextToClipboard(resultsArea.value, copyButton);
        status.textContent = 'Lote copiado al portapapeles.';
    });
    exportButton.addEventListener('click', () => {
        if (!resultsArea.value) return;
        const extension = formatSelect.value === 'json' ? 'json' : formatSelect.value === 'csv' ? 'csv' : 'txt';
        const mimeType = extension === 'json' ? 'application/json' : extension === 'csv' ? 'text/csv' : 'text/plain';
        const blob = new Blob([resultsArea.value], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeSeed = seedInput.value.trim().replace(/[^a-z0-9_-]+/gi, '-').slice(0, 32) || 'lote';
        link.href = url;
        link.download = `datos-sinteticos-${safeSeed}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
        status.textContent = `Archivo ${extension.toUpperCase()} exportado.`;
    });

    updateFormatControls();
}

function setupKeyboardShortcuts() {
    const shortcutTargets: Record<string, string> = {
        g: 'mode-generator-btn',
        v: 'mode-validator-btn',
        l: 'mode-batch-btn',
    };

    document.addEventListener('keydown', event => {
        if (event.altKey && shortcutTargets[event.key.toLowerCase()]) {
            event.preventDefault();
            document.getElementById(shortcutTargets[event.key.toLowerCase()])?.click();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const activeView = getActiveView();
            const primaryAction = activeView?.querySelector<HTMLButtonElement>(
                '#generateBtnAdv, #validate-number-btn, #generate-batch-btn, #ext-generateBtnAdv, #m1-generateBtnAdv, #data-generate-btn'
            );
            if (primaryAction && !primaryAction.disabled) {
                event.preventDefault();
                primaryAction.click();
            }
        }
    });
}

function setupGenerator(prefix: string = '') {
    const binInput = document.getElementById(`${prefix}bin`) as HTMLInputElement;
    const monthInput = document.getElementById(`${prefix}manual-month`) as HTMLInputElement;
    const yearInput = document.getElementById(`${prefix}manual-year`) as HTMLInputElement;
    const cvvInput = document.getElementById(`${prefix}advanced-cvv`) as HTMLInputElement;
    const quantityInput = document.getElementById(`${prefix}adv-quantity`) as HTMLInputElement;
    const generateBtn = document.getElementById(`${prefix}generateBtnAdv`);
    const resultsArea = document.getElementById(`${prefix}results-area-gen`) as HTMLTextAreaElement;

    if (!generateBtn) return;

    const generate = () => {
        [binInput, monthInput, yearInput, cvvInput, quantityInput].filter(Boolean).forEach(clearFieldMessage);
        const binValue = binInput.value.trim().toLowerCase();
        const monthValue = monthInput.value.trim();
        const yearValue = yearInput.value.trim();
        const fail = (input: HTMLInputElement, message: string) => {
            setFieldMessage(input, message, 'error');
            input.focus();
        };

        // 1. Validaciones estrictas
        // Validación de BIN
        if (!binValue) {
            fail(binInput, "El campo BIN es obligatorio.");
            return;
        }
        const binFormatRegex = /^[0-9x]+$/;
        if (!binFormatRegex.test(binValue)) {
            fail(binInput, "Formato de BIN inválido. Usa solo números y/o la letra 'x'.");
            return;
        }
        if (binValue.length < 6 || binValue.length > 16) {
            fail(binInput, "La longitud debe estar entre 6 y 16 caracteres.");
            return;
        }

        // Validación específica para American Express
        const isAmex = binValue.startsWith('34') || binValue.startsWith('37');
        if (isAmex && binValue.length > 15) {
            fail(binInput, "Los patrones American Express no deben exceder 15 caracteres.");
            return;
        }

        const expiryValidation = validateExpiryInputs(monthValue, yearValue);
        if (!expiryValidation.isValid) {
            fail(expiryValidation.field === 'month' ? monthInput : yearInput, expiryValidation.message);
            return;
        }

        const quantity = Number(quantityInput.value);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            fail(quantityInput, 'La cantidad debe estar entre 1 y 100.');
            return;
        }

        const expectedCvvLength = isAmex ? 4 : 3;
        if (cvvInput.value && !new RegExp(`^\\d{${expectedCvvLength}}$`).test(cvvInput.value)) {
            fail(cvvInput, `El código de seguridad debe tener ${expectedCvvLength} dígitos.`);
            return;
        }

        const pattern = binValue;
        const targetLength = isAmex ? 15 : 16;
        
        const config = {
            month: expiryValidation.month,
            year: expiryValidation.year,
            cvv: cvvInput.value,
            quantity
        };

        let results: string[];
        try {
            results = Array.from({ length: config.quantity }, () => {
                const number = generateCardNumberFromPattern(pattern, targetLength);
                const expiry = generateValidExpiry({ month: config.month, year: config.year });
                const cvvLength = isAmex ? 4 : 3;
                const finalCvv = config.cvv || String(Math.floor(Math.random() * (10 ** cvvLength))).padStart(cvvLength, '0');
                return `${number}|${expiry.month}|${expiry.year}|${finalCvv}`;
            });
        } catch (error) {
            fail(binInput, error instanceof Error ? error.message : 'No se pudo generar el resultado.');
            return;
        }

        resultsArea.value = results.join('\n');
        setFieldMessage(binInput, `${results.length} resultados generados correctamente.`, 'success');
        
        addEntry('generate', { 
            bin: pattern, 
            month: monthInput.value,
            year: yearInput.value,
            cvv: config.cvv,
            quantity: config.quantity.toString()
        });
    };

    generateBtn.addEventListener('click', generate);

    binInput?.addEventListener('input', () => {
        binInput.value = binInput.value.replace(/[^0-9xX]/g, '').toLowerCase();
        clearFieldMessage(binInput);
        
        if (cvvInput) {
            const isAmex = binInput.value.startsWith('34') || binInput.value.startsWith('37');
            const cvvMaxLength = isAmex ? 4 : 3;
            
            if (cvvInput.maxLength !== cvvMaxLength) {
                 cvvInput.maxLength = cvvMaxLength;
                 cvvInput.placeholder = isAmex ? '1234' : '123';
            }
           
            if (cvvInput.value.length > cvvMaxLength) {
                cvvInput.value = cvvInput.value.slice(0, cvvMaxLength);
            }
        }
    });
    [monthInput, yearInput, cvvInput, quantityInput].filter(Boolean).forEach(input => {
        input.addEventListener('input', () => clearFieldMessage(input));
    });
}


function setupUnifiedHistory() {
    const historyList = document.getElementById('history-list') as HTMLUListElement;

    if (!historyList) return;

    const applyGenerateCallback = (entry: HistoryEntry) => {
        if (entry.type === 'generate' && entry.payload) {
            const payload = entry.payload as GeneratePayload;
            const binInput = document.getElementById('bin') as HTMLInputElement;
            if (binInput) {
                document.getElementById('mode-generator-btn')?.click();
                setTimeout(() => {
                    binInput.value = payload.bin || '';
                    (document.getElementById('manual-month') as HTMLInputElement).value = payload.month || '';
                    (document.getElementById('manual-year') as HTMLInputElement).value = payload.year || '';
                    (document.getElementById('advanced-cvv') as HTMLInputElement).value = payload.cvv || '';
                    (document.getElementById('adv-quantity') as HTMLInputElement).value = payload.quantity || '10';
                    binInput.dispatchEvent(new Event('input', { bubbles: true }));
                }, 350);
            }
        }
    };

    const render = () => {
        const historyState = getState();
        const binsState = binStore.getBins();
        renderHistoryList(historyList, historyState.filter(e => e.type === 'generate'), applyGenerateCallback, binsState);
    };
    
    subscribe(render); // Subscribe to history changes
    binStore.subscribe(render); // Also subscribe to saved bins changes
    render(); // Initial render
}

function setupExtrapolator() {
    const simCc1 = document.getElementById('sim-cc1') as HTMLInputElement;
    const simCc2 = document.getElementById('sim-cc2') as HTMLInputElement;
    const simBtn = document.getElementById('btn-sim');
    const simResult = document.getElementById('sim-result') as HTMLInputElement;
    const useSimResultBtn = document.getElementById('use-sim-result-btn') as HTMLButtonElement;

    simBtn?.addEventListener('click', () => {
        clearFieldMessage(simCc1);
        clearFieldMessage(simCc2);
        const comparison = compareCardNumbers(simCc1.value, simCc2.value);
        if (!comparison.isValid) {
            const invalidInput = comparison.field === 'first' ? simCc1 : simCc2;
            setFieldMessage(invalidInput, comparison.message, 'error');
            invalidInput.focus();
            simResult.value = '';
            useSimResultBtn.classList.add('hidden');
            return;
        }

        simResult.value = comparison.pattern;
        setFieldMessage(simCc2, 'Comparación completada: ambos números son válidos y comparten BIN.', 'success');
        useSimResultBtn.classList.remove('hidden');
    });

    [simCc1, simCc2].forEach(input => input.addEventListener('input', () => {
        clearFieldMessage(input);
        simResult.value = '';
        useSimResultBtn.classList.add('hidden');
    }));

    useSimResultBtn?.addEventListener('click', () => {
        const mainBinInput = document.getElementById('bin') as HTMLInputElement;
        if (mainBinInput) {
            mainBinInput.value = simResult.value;
            mainBinInput.dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('mode-generator-btn')?.click();
        }
    });

    const posCc = document.getElementById('pos-cc') as HTMLInputElement;
    const posBtn = document.getElementById('btn-pos');
    const posResult = document.getElementById('pos-result') as HTMLTextAreaElement;

    posBtn?.addEventListener('click', () => {
        clearFieldMessage(posCc);
        const extrapolation = generateExtrapolationPatterns(posCc.value);
        if (!extrapolation.isValid) {
            setFieldMessage(posCc, extrapolation.message, 'error');
            posCc.focus();
            posResult.value = '';
            return;
        }

        posResult.value = extrapolation.patterns.join('\n');
        setFieldMessage(posCc, `${extrapolation.patterns.length} patrones válidos generados.`, 'success');
    });

    posCc?.addEventListener('input', () => {
        clearFieldMessage(posCc);
        posResult.value = '';
    });
}

// --- Data for Data Generator ---
const data_mx = {
    names: ["Santiago", "Mateo", "Sebastián", "Leonardo", "Matías", "Emiliano", "Diego", "Miguel Ángel", "Iker", "Alexander", "Sofía", "Valentina", "Regina", "María José", "Ximena", "Camila", "Valeria", "Renata", "Isabella", "Victoria"],
    lastNames: ["Hernández", "García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz", "Flores", "Gómez"],
    streets: ["Av. de los Insurgentes", "Paseo de la Reforma", "Av. Juárez", "Calle Madero", "Av. Revolución", "Calle 5 de Mayo"],
    states: {
        "CDMX": ["Ciudad de México", "06000"],
        "Jalisco": ["Guadalajara", "44100"],
        "Nuevo León": ["Monterrey", "64000"],
        "Puebla": ["Puebla", "72000"]
    }
};

const data_us = {
    names: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"],
    lastNames: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson"],
    streets: ["Main St", "Oak St", "Maple Ave", "Washington St", "Elm St", "Highland Ave"],
    states: {
        "CA": ["Los Angeles", "90001"],
        "NY": ["New York", "10001"],
        "IL": ["Chicago", "60601"],
        "TX": ["Houston", "77001"]
    }
};

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateRandomDOB(): string {
    const startDate = new Date(1950, 0, 1);
    const endDate = new Date(2005, 0, 1);
    const date = getRandomDate(startDate, endDate);
    return date.toISOString().split('T')[0];
}

function generatePhone(country: Country): string {
    if (country === 'Mexico') {
        return `55${Math.floor(10000000 + Math.random() * 90000000)}`;
    } else { // United States
        const areaCode = Math.floor(201 + Math.random() * 798); // Avoid 800 numbers
        const nextThree = Math.floor(100 + Math.random() * 899);
        const lastFour = Math.floor(1000 + Math.random() * 8999);
        return `${areaCode}${nextThree}${lastFour}`;
    }
}

function generateCURP(firstName: string, lastName1: string, lastName2: string, dob: string): string {
    const [year, month, day] = dob.split('-');
    const nameInitial = firstName.charAt(0);
    const last1Initial = lastName1.charAt(0);
    const last1Vowel = (lastName1.substring(1).match(/[AEIOU]/) || ['X'])[0];
    const last2Initial = lastName2.charAt(0);
    const randomChars = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
    let homoclave = '';
    for (let i = 0; i < 3; i++) {
        homoclave += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return `${last1Initial}${last1Vowel}${last2Initial}${nameInitial}${year.substring(2)}${month}${day}HDF${homoclave}`;
}

function generateRFC(firstName: string, lastName1: string, lastName2: string, dob: string): string {
    const curpBase = generateCURP(firstName, lastName1, lastName2, dob).substring(0, 10);
    const randomChars = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
    let homoclave = '';
    for (let i = 0; i < 3; i++) {
        homoclave += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return `${curpBase}${homoclave}`;
}

function generateSSN(): string {
    const part1 = String(Math.floor(100 + Math.random() * 899));
    const part2 = String(Math.floor(10 + Math.random() * 89));
    const part3 = String(Math.floor(1000 + Math.random() * 8999));
    return `${part1}-${part2}-${part3}`;
}

function setupDataView() {
    const generateBtn = document.getElementById('data-generate-btn');
    const copyAllBtn = document.getElementById('data-copy-all-btn');
    const countrySelector = document.getElementById('data-country-selector') as HTMLSelectElement;
    const docTypeMxContainer = document.getElementById('data-doc-type-mx-container');
    const docTypeUsContainer = document.getElementById('data-doc-type-us-container');
    const docTypeMxSelect = document.getElementById('data-doc-type-mx') as HTMLSelectElement;
    const docTypeUsSelect = document.getElementById('data-doc-type-us') as HTMLSelectElement;

    const fields = {
        nombres: document.getElementById('data-field-nombres') as HTMLInputElement,
        apellidos: document.getElementById('data-field-apellidos') as HTMLInputElement,
        email: document.getElementById('data-field-email') as HTMLInputElement,
        telefono: document.getElementById('data-field-telefono') as HTMLInputElement,
        dob: document.getElementById('data-field-dob') as HTMLInputElement,
        fullName: document.getElementById('data-field-nombre-completo') as HTMLInputElement,
        direccion: document.getElementById('data-field-direccion') as HTMLInputElement,
        numero: document.getElementById('data-field-numero') as HTMLInputElement,
        ciudad: document.getElementById('data-field-ciudad') as HTMLInputElement,
        estado: document.getElementById('data-field-estado') as HTMLInputElement,
        cp: document.getElementById('data-field-cp') as HTMLInputElement,
        pais: document.getElementById('data-field-pais') as HTMLInputElement,
        tipoDoc: document.getElementById('data-field-tipo-doc') as HTMLInputElement,
        numDoc: document.getElementById('data-field-num-doc') as HTMLInputElement,
    };
    
    const generateNewData = () => {
        const country = countrySelector.value as Country;
        if (country === 'Mexico') {
            const firstName = getRandomElement(data_mx.names);
            const lastName1 = getRandomElement(data_mx.lastNames);
            const lastName2 = getRandomElement(data_mx.lastNames.filter(ln => ln !== lastName1));
            const dob = generateRandomDOB();
            const stateKey = getRandomElement(Object.keys(data_mx.states));
            const [city, postalCode] = data_mx.states[stateKey as keyof typeof data_mx.states];
            const docType = docTypeMxSelect.value;
            
            fields.nombres.value = firstName;
            fields.apellidos.value = `${lastName1} ${lastName2}`;
            fields.fullName.value = `${firstName} ${lastName1} ${lastName2}`;
            fields.email.value = `${firstName.toLowerCase()}.${lastName1.toLowerCase()}${Math.floor(Math.random()*100)}@example.com`;
            fields.telefono.value = generatePhone('Mexico');
            fields.dob.value = dob;
            fields.direccion.value = getRandomElement(data_mx.streets);
            fields.numero.value = String(Math.floor(1 + Math.random() * 2000));
            fields.ciudad.value = city;
            fields.estado.value = stateKey;
            fields.cp.value = postalCode;
            fields.pais.value = "México";
            fields.tipoDoc.value = docType;
            fields.numDoc.value = docType === 'CURP' ? generateCURP(firstName, lastName1, lastName2, dob) : generateRFC(firstName, lastName1, lastName2, dob);

        } else { // United States
            const firstName = getRandomElement(data_us.names);
            const lastName = getRandomElement(data_us.lastNames);
            const dob = generateRandomDOB();
            const stateKey = getRandomElement(Object.keys(data_us.states));
            const [city, postalCode] = data_us.states[stateKey as keyof typeof data_us.states];
            const docType = docTypeUsSelect.value;

            fields.nombres.value = firstName;
            fields.apellidos.value = lastName;
            fields.fullName.value = `${firstName} ${lastName}`;
            fields.email.value = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random()*100)}@example.com`;
            fields.telefono.value = generatePhone('United States');
            fields.dob.value = dob;
            fields.direccion.value = getRandomElement(data_us.streets);
            fields.numero.value = String(Math.floor(1 + Math.random() * 9999));
            fields.ciudad.value = city;
            fields.estado.value = stateKey;
            fields.cp.value = postalCode;
            fields.pais.value = "United States";
            fields.tipoDoc.value = docType;
            fields.numDoc.value = docType === 'SSN' ? generateSSN() : `${stateKey}${Math.floor(1000000 + Math.random() * 9000000)}`;
        }
    };

    generateBtn?.addEventListener('click', generateNewData);

    countrySelector?.addEventListener('change', () => {
        const isMexico = countrySelector.value === 'Mexico';
        docTypeMxContainer?.classList.toggle('hidden', !isMexico);
        docTypeUsContainer?.classList.toggle('hidden', isMexico);
        generateNewData();
    });

    [docTypeMxSelect, docTypeUsSelect].forEach(select => {
        select?.addEventListener('change', generateNewData);
    });

    copyAllBtn?.addEventListener('click', () => {
        const allData = Object.entries(fields).map(([key, el]) => `${key}: ${el.value}`).join('\n');
        copyTextToClipboard(allData, copyAllBtn as HTMLElement);
    });

    // Initial data generation on load
    generateNewData();
}


function setupHistoryView() {
    const searchInput = document.getElementById('search-bins-input') as HTMLInputElement;
    const sortSelect = document.getElementById('sort-bins-select') as HTMLSelectElement;
    const listEl = document.getElementById('saved-bins-list') as HTMLUListElement;
    const trashedListEl = document.getElementById('trashed-bins-list') as HTMLUListElement;

    const toggleBtn = document.getElementById('toggle-trash-view-btn') as HTMLButtonElement;
    const activeView = document.getElementById('active-bins-view') as HTMLElement;
    const trashedView = document.getElementById('trashed-bins-view') as HTMLElement;
    const titleEl = document.getElementById('saved-bins-title') as HTMLElement;

    let isTrashVisible = false;

    toggleBtn.addEventListener('click', () => {
        isTrashVisible = !isTrashVisible;
        activeView.classList.toggle('hidden', isTrashVisible);
        trashedView.classList.toggle('hidden', !isTrashVisible);
        
        if (isTrashVisible) {
            titleEl.textContent = "Papelera";
            toggleBtn.textContent = toggleBtn.dataset.trashedText || "Ver Bins Guardados";
        } else {
            titleEl.textContent = "BINs Guardados";
            toggleBtn.textContent = toggleBtn.dataset.activeText || "Ver Papelera";
        }
    });

    setUseInGeneratorCallback((bin: string) => {
        const parts = bin.split('|');
        if (parts.length === 4) { // It's a composite bin
            const [binNum, month, year, cvv] = parts;
            (document.getElementById('bin') as HTMLInputElement).value = binNum || '';
            (document.getElementById('manual-month') as HTMLInputElement).value = month || '';
            (document.getElementById('manual-year') as HTMLInputElement).value = year || '';
            (document.getElementById('advanced-cvv') as HTMLInputElement).value = cvv || '';
        } else { // It's a simple bin
            (document.getElementById('bin') as HTMLInputElement).value = bin;
            (document.getElementById('manual-month') as HTMLInputElement).value = '';
            (document.getElementById('manual-year') as HTMLInputElement).value = '';
            (document.getElementById('advanced-cvv') as HTMLInputElement).value = '';
        }
        (document.getElementById('mode-generator-btn') as HTMLButtonElement).click();
    });

    setEditBinCallback((entry: BinEntry) => {
        openSaveModal(entry);
    });

    const render = () => {
        // Render active bins
        let bins = binStore.getBins();
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            bins = bins.filter(b => b.name.toLowerCase().includes(searchTerm) || b.bin.includes(searchTerm));
        }

        const [sortKey, sortDir] = sortSelect.value.split('_');
        bins.sort((a, b) => {
            let valA, valB;
            if (sortKey === 'favorite') {
                return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            }
            if (sortKey === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else { // date
                valA = new Date(a.updatedAt).getTime();
                valB = new Date(b.updatedAt).getTime();
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        renderBinsList(listEl, bins);

        // Render trashed bins
        const trashedBins = binStore.getTrashedBins();
        renderTrashedBinsList(trashedListEl, trashedBins);
    };

    binStore.subscribe(render);
    searchInput.addEventListener('input', render);
    sortSelect.addEventListener('change', render);
    render();
}

function setupSaveModal() {
    const modal = document.getElementById('save-bin-modal') as HTMLElement;
    const title = document.getElementById('modal-title') as HTMLElement;
    const description = document.getElementById('modal-description') as HTMLElement;
    const editIdInput = document.getElementById('modal-edit-id') as HTMLInputElement;
    const nameInput = document.getElementById('modal-bin-name') as HTMLInputElement;
    const numberInput = document.getElementById('modal-bin-number') as HTMLInputElement;
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const saveBtn = document.getElementById('modal-save-btn');
    const errorContainer = document.getElementById('modal-error-container') as HTMLElement;
    
    document.body.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const saveBtn = target.closest('[id$="-save-bin-btn"]');
        if (saveBtn) {
            const prefix = saveBtn.id.replace('-save-bin-btn', '');
            const binInput = document.getElementById(`${prefix}bin`) as HTMLInputElement;
            if (binInput && binInput.value) {
                const monthInput = document.getElementById(`${prefix}manual-month`) as HTMLInputElement;
                const yearInput = document.getElementById(`${prefix}manual-year`) as HTMLInputElement;
                const cvvInput = document.getElementById(`${prefix}advanced-cvv`) as HTMLInputElement;
                
                openSaveModal({ 
                    bin: binInput.value,
                    month: monthInput?.value,
                    year: yearInput?.value,
                    cvv: cvvInput?.value,
                });
            } else {
                showError("El campo BIN está vacío.", prefix);
            }
        }
    });

    const close = () => modal.classList.add('hidden');

    cancelBtn?.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    saveBtn?.addEventListener('click', () => {
        const id = editIdInput.value;
        const name = nameInput.value;
        const bin = numberInput.value;
        
        const result = id
            ? binStore.updateBin(id, name, bin)
            : binStore.addBin(name, bin);

        if (result.success) {
            close();
        } else {
            showError(result.message || 'Error desconocido', errorContainer);
        }
    });
}

function openSaveModal(entry: Partial<BinEntry & GeneratePayload>) {
    const modal = document.getElementById('save-bin-modal') as HTMLElement;
    const title = document.getElementById('modal-title') as HTMLElement;
    const description = document.getElementById('modal-description') as HTMLElement;
    const editIdInput = document.getElementById('modal-edit-id') as HTMLInputElement;
    const nameInput = document.getElementById('modal-bin-name') as HTMLInputElement;
    const numberInput = document.getElementById('modal-bin-number') as HTMLInputElement;

    editIdInput.value = entry.id || '';
    
    if (entry.id) { // Editing an existing saved bin
        title.textContent = 'Editar BIN';
        description.textContent = 'Actualiza el nombre de tu BIN guardado.';
        nameInput.value = entry.name || '';
        numberInput.value = entry.bin || '';
        numberInput.readOnly = true;
    } else { // Saving a new bin
        title.textContent = 'Guardar BIN';
        description.textContent = 'Dale un nombre a este BIN para encontrarlo fácilmente.';
        
        // Construct the composite string if month/year/cvv are present
        const isGeneratePayload = 'month' in entry || 'year' in entry || 'cvv' in entry;
        const binValue = isGeneratePayload
            ? [
                entry.bin || '',
                (entry as GeneratePayload).month || '',
                (entry as GeneratePayload).year || '',
                (entry as GeneratePayload).cvv || ''
              ].join('|')
            : entry.bin || '';

        numberInput.value = binValue;
        nameInput.value = entry.name || entry.bin || ''; // Suggest original BIN as default name
        numberInput.readOnly = true;
    }
    
    modal.classList.remove('hidden');
    nameInput.focus();
    nameInput.select();
}
