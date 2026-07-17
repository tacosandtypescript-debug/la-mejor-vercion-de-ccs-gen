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
    setupControls();
    setupViewSwitcher();
    setupCopyButtons();
    setupDelegatedListeners();
    
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

function setupControls() {
    const themeButtons = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;
    
    if (!themeButtons.length) return;

    createStars();
    createRain();

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
    const extrapolatorView = document.getElementById('extrapolator-view') as HTMLElement;
    const method1View = document.getElementById('method1-view') as HTMLElement;
    const dataView = document.getElementById('data-view') as HTMLElement;
    const historyView = document.getElementById('history-view') as HTMLElement;


    if (generatorView && !generatorView.classList.contains('hidden')) return generatorView;
    if (extrapolatorView && !extrapolatorView.classList.contains('hidden')) return extrapolatorView;
    if (method1View && !method1View.classList.contains('hidden')) return method1View;
    if (dataView && !dataView.classList.contains('hidden')) return dataView;
    if (historyView && !historyView.classList.contains('hidden')) return historyView;

    return null;
}

function setupViewSwitcher() {
    const generatorView = document.getElementById('generator-view') as HTMLElement;
    const extrapolatorView = document.getElementById('extrapolator-view') as HTMLElement;
    const method1View = document.getElementById('method1-view') as HTMLElement;
    const dataView = document.getElementById('data-view') as HTMLElement;
    const historyView = document.getElementById('history-view') as HTMLElement;
    
    const generatorBtn = document.getElementById('mode-generator-btn');
    const extrapolatorBtn = document.getElementById('mode-extrapolator-btn');
    const method1Btn = document.getElementById('mode-method1-btn');
    const dataBtn = document.getElementById('mode-data-btn');
    const historyBtn = document.getElementById('mode-history-btn');


    const appTitle = document.getElementById('app-title');
    const transitionDuration = 300; 

    const views = [generatorView, extrapolatorView, method1View, dataView, historyView];
    views.forEach(view => {
        if (view) {
            view.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
            view.style.opacity = view.classList.contains('hidden') ? '0' : '1';
        }
    });

    function switchView(viewToShow: HTMLElement, newTitle: string, newActiveBtn: HTMLElement) {
        const currentView = getActiveView();
        
        if (currentView === viewToShow) return;

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
        }, transitionDuration);
    }

    generatorBtn?.addEventListener('click', () => switchView(generatorView, "Generador de Tarjetas", generatorBtn));
    extrapolatorBtn?.addEventListener('click', () => switchView(extrapolatorView, "Extrapolador", extrapolatorBtn));
    method1Btn?.addEventListener('click', () => switchView(method1View, "Método: Extrapolaciones", method1Btn));
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

function calculateLuhn(number: string): number {
    let sum = 0;
    let shouldDouble = true;
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    const mod = sum % 10;
    return mod === 0 ? 0 : 10 - mod;
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
        const binValue = binInput.value.trim().toLowerCase();
        const monthValue = monthInput.value.trim();
        const yearValue = yearInput.value.trim();

        // 1. Validaciones estrictas
        // Validación de BIN
        if (!binValue) {
            showError("El campo BIN es obligatorio.", prefix);
            return;
        }
        const binFormatRegex = /^[0-9x]+$/;
        if (!binFormatRegex.test(binValue)) {
            showError("Formato de BIN inválido. Use solo números y/o la letra 'x'.", prefix);
            return;
        }
        if (binValue.length < 6 || binValue.length > 16) {
            showError("Longitud de BIN inválida. Debe tener entre 6 y 16 caracteres.", prefix);
            return;
        }

        // Validación específica para American Express
        const isAmex = binValue.startsWith('34') || binValue.startsWith('37');
        if (isAmex && binValue.length > 15) {
            showError("Los BIN de American Express no deben exceder los 15 caracteres.", prefix);
            return;
        }

        // Validación de Mes
        if (monthValue) {
            const monthNum = parseInt(monthValue, 10);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                showError("Mes inválido. Use un valor entre 1 y 12.", prefix);
                return;
            }
        }
        
        // Validación de Año
        let processedYear = yearValue;
        if (yearValue) {
            let yearNum = parseInt(yearValue, 10);
            if (isNaN(yearNum)) {
                showError("Año inválido. Use un formato numérico (ej: 25 o 2025).", prefix);
                return;
            }
            // Manejar formato corto yy -> 20yy
            if (yearValue.length <= 2) {
                if (yearNum >= 25 && yearNum <= 50) {
                    yearNum += 2000;
                } else {
                    showError("Año inválido. Use 4 dígitos o un formato de 2 dígitos entre 25 y 50.", prefix);
                    return;
                }
            }

            if (yearNum < 2025 || yearNum > 2050) {
                showError("Año fuera de rango. El año debe estar entre 2025 y 2050.", prefix);
                return;
            }
            processedYear = String(yearNum);
        }

        const pattern = binValue;
        const targetLength = isAmex ? 15 : 16;
        
        const config = {
            month: monthInput.value,
            year: processedYear,
            cvv: cvvInput.value,
            quantity: parseInt(quantityInput.value, 10) || 10
        };

        const results = Array.from({ length: config.quantity }, () => {
            const prefixLength = targetLength - 1;
            
            let tempPattern = pattern;
            if (tempPattern.length > prefixLength) {
                tempPattern = tempPattern.substring(0, prefixLength);
            } else {
                tempPattern = tempPattern.padEnd(prefixLength, 'x');
            }

            let generatedPrefix = '';
            for (const char of tempPattern) {
                generatedPrefix += (char.toLowerCase() === 'x') ? Math.floor(Math.random() * 10) : char;
            }
            const luhnDigit = calculateLuhn(generatedPrefix);
            const number = generatedPrefix + luhnDigit;

            const finalMonth = config.month 
                ? String(parseInt(config.month, 10)).padStart(2, '0') 
                : String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');

            const finalYearForGen = config.year || String(new Date().getFullYear() + Math.floor(Math.random() * 5));
            
            const cvvLength = isAmex ? 4 : 3;
            const finalCvv = config.cvv || String(Math.floor(Math.random() * (10 ** cvvLength))).padStart(cvvLength, '0');
            return `${number}|${finalMonth}|${finalYearForGen}|${finalCvv}`;
        });

        resultsArea.value = results.join('\n');
        
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
        const cc1 = simCc1.value;
        const cc2 = simCc2.value;
        if (cc1.length < 15 || cc2.length < 15 || cc1.length !== cc2.length) {
            showError("Las tarjetas deben tener la misma longitud (15 o 16 dígitos).", 'ext-');
            return;
        }
        let result = '';
        for (let i = 0; i < cc1.length; i++) {
            result += (cc1[i] === cc2[i]) ? cc1[i] : 'x';
        }
        simResult.value = result;
        useSimResultBtn.classList.remove('hidden');
    });

    useSimResultBtn?.addEventListener('click', () => {
        const mainBinInput = document.getElementById('bin') as HTMLInputElement;
        if (mainBinInput) {
            mainBinInput.value = simResult.value;
            document.getElementById('mode-generator-btn')?.click();
        }
    });

    const posCc = document.getElementById('pos-cc') as HTMLInputElement;
    const posBtn = document.getElementById('btn-pos');
    const posResult = document.getElementById('pos-result') as HTMLTextAreaElement;

    posBtn?.addEventListener('click', () => {
        const fullCard = posCc.value.split('|')[0].replace(/\D/g, '');
        if (fullCard.length < 15) {
            showError("La tarjeta debe tener al menos 15 dígitos.", 'm1-');
            return;
        }
        const patterns = [
            fullCard.substring(0, 12) + 'xxxx',
            fullCard.substring(0, 10) + 'xxxxxx',
            fullCard.substring(0, 8) + 'xxxxxxxx',
            fullCard.substring(0, 6) + 'xxxxxxxxxx',
        ].filter(p => p.length === fullCard.length);
        posResult.value = patterns.join('\n');
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