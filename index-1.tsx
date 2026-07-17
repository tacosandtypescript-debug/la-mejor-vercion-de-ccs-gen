/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
type Theme = 'day' | 'night' | 'sparkle';

interface HistoryEntry {
    bin: string;
    month: string;
    year: string;
    cvv: string;
    quantity: string;
}

// FIX: Renamed `history` to `generationHistory` to avoid conflict with `window.history`.
let generationHistory: HistoryEntry[] = [];
const MAX_HISTORY_ITEMS = 15;


// --- CORE APP SETUP ---
document.addEventListener('DOMContentLoaded', () => {
    // --- FEATURE SETUP ---
    setupControls();
    setupViewSwitcher();
    setupCopyButtons();
    
    // --- GENERATOR LOGIC ---
    setupGenerator();
    setupInputActions();
    setupHistory();
    setupStats();

    // --- EXTRAPOLator LOGIC ---
    setupExtrapolator();
    setupMethod1Generator();
    setupRangeGenerator();
    
    // --- HISTORY FOR ALL VIEWS ---
    setupHistoryExtrapolator();
    setupHistoryMethod1();
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

function createStars(count = 50) {
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

function createRain(count = 70) {
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

    if (generatorView && !generatorView.classList.contains('hidden')) return generatorView;
    if (extrapolatorView && !extrapolatorView.classList.contains('hidden')) return extrapolatorView;
    if (method1View && !method1View.classList.contains('hidden')) return method1View;
    return null;
}

function setupViewSwitcher() {
    const generatorView = document.getElementById('generator-view') as HTMLElement;
    const extrapolatorView = document.getElementById('extrapolator-view') as HTMLElement;
    const method1View = document.getElementById('method1-view') as HTMLElement;
    
    const generatorBtn = document.getElementById('mode-generator-btn');
    const extrapolatorBtn = document.getElementById('mode-extrapolator-btn');
    const method1Btn = document.getElementById('mode-method1-btn');

    const appTitle = document.getElementById('app-title');
    const transitionDuration = 300; 

    const views = [generatorView, extrapolatorView, method1View];
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

            appTitle.textContent = newTitle;
            document.querySelectorAll('.mode-switcher .mode-btn').forEach(btn => btn.classList.remove('active'));
            newActiveBtn.classList.add('active');
        }, transitionDuration);
    }

    generatorBtn.addEventListener('click', () => switchView(generatorView, "Generador de Tarjetas", generatorBtn));
    extrapolatorBtn.addEventListener('click', () => switchView(extrapolatorView, "Extrapolador", extrapolatorBtn));
    method1Btn.addEventListener('click', () => switchView(method1View, "Método: Extrapolaciones", method1Btn));
}

function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => copyToClipboard(e.currentTarget as HTMLElement));
    });

    function copyToClipboard(buttonEl: HTMLElement) {
        const targetId = buttonEl.dataset.target;
        if (!targetId) return;
        const targetElement = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement;
        if (!targetElement.value) return;

        navigator.clipboard.writeText(targetElement.value).then(() => {
            const iconCopy = buttonEl.querySelector('.icon-copy') as HTMLElement;
            const iconCheck = buttonEl.querySelector('.icon-check') as HTMLElement;
            
            if (!iconCopy || !iconCheck) return;

            iconCopy.style.display = 'none';
            iconCheck.style.display = 'inline-block';
            
            setTimeout(() => {
                iconCopy.style.display = 'inline-block';
                iconCheck.style.display = 'none';
            }, 2000);
        });
    }
}

function setupGenerator() {
    setupManualDateInputs();
    document.getElementById('generateBtnAdv').onclick = generate;
    filterNumericInputs(['advanced-cvv', 'manual-month', 'manual-year']);

    const binInput = document.getElementById('bin') as HTMLInputElement;
    if (binInput) {
        binInput.addEventListener('input', () => {
            binInput.value = binInput.value.replace(/[^0-9xX]/g, '').toLowerCase();
        });
    }
}

function setupInputActions() {
    const binInput = document.getElementById('bin') as HTMLInputElement;
    const pasteBtn = document.getElementById('paste-bin-btn');
    const clearBtn = document.getElementById('clear-bin-btn');

    if (binInput && pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                binInput.value = text;
                binInput.focus();
                // Manually trigger the input event to start analysis and filtering
                binInput.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (err) {
                console.error('Failed to read clipboard contents: ', err);
                showError('No se pudo pegar. Intenta con Ctrl+V o mantén presionado para pegar.');
            }
        });
    }

    if (binInput && clearBtn) {
        clearBtn.addEventListener('click', () => {
            binInput.value = '';
            binInput.focus();
            // Manually trigger the input event to clear analysis
            binInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
}


function setupExtrapolator() {
    document.getElementById('btn-sim').addEventListener('click', calculateSimilarity);
    document.getElementById('btn-pos').addEventListener('click', calculatePossibilities);
    filterNumericInputs(['sim-cc1', 'sim-cc2']);
}


// --- UTILITY & LOGIC FUNCTIONS ---

function showError(message: string) {
    const activeView = getActiveView();
    if (!activeView) return;
    const container = activeView.querySelector('.error-toast-container');
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

function filterNumericInputs(elementIds: string[]) {
    elementIds.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) {
            input.addEventListener('input', () => {
                input.value = input.value.replace(/\D/g, '');
            });
        }
    });
}

function setupManualDateInputs() {
    const monthInput = document.getElementById('manual-month') as HTMLInputElement;
    const yearInput = document.getElementById('manual-year') as HTMLInputElement;

    if (monthInput) {
        monthInput.addEventListener('blur', () => {
            if (!monthInput.value) return; // Allow empty
            let value = parseInt(monthInput.value, 10);
            if (isNaN(value) || value < 1 || value > 12) {
                monthInput.value = ''; // Clear invalid input
                showError('El mes debe ser un número entre 01 y 12.');
            } else {
                monthInput.value = String(value).padStart(2, '0');
            }
        });
    }

    if (yearInput) {
        yearInput.addEventListener('blur', () => {
            if (!yearInput.value) return; // Allow empty
            let value = parseInt(yearInput.value, 10);
            const currentYear = new Date().getFullYear();
            
            if (isNaN(value)) {
                yearInput.value = '';
                return;
            }

            // Handle abbreviated year
            if (value >= 0 && value < 100) {
                value += 2000;
            }

            if (value < currentYear || value > currentYear + 30) {
                yearInput.value = ''; // Clear if out of valid range
                showError(`El año debe estar entre ${currentYear} y ${currentYear + 30}.`);
            } else {
                yearInput.value = String(value);
            }
        });
    }
}

function generate() {
    const binInput = document.getElementById('bin') as HTMLInputElement;
    let pattern = binInput.value;

    if (pattern.length > 0 && pattern.length < 16 && !pattern.toLowerCase().includes('x')) {
        const isAmex = pattern.startsWith('34') || pattern.startsWith('37');
        const targetLength = isAmex ? 15 : 16;
        pattern = pattern.padEnd(targetLength, 'x');
        binInput.value = pattern;
    }
    
    const hasPattern = pattern.toLowerCase().includes('x');
    const isAmex = pattern.startsWith('34') || pattern.startsWith('37');

    if (hasPattern) {
        const expectedLength = isAmex ? 15 : 16;
        if (pattern.length !== expectedLength) {
            showError(`Error: El patrón para esta tarjeta debe tener ${expectedLength} caracteres.`);
            return;
        }
    } else if (pattern.length < 6) { 
        showError("Error: El BIN debe tener al menos 6 dígitos.");
        return;
    }

    const monthInput = document.getElementById('manual-month') as HTMLInputElement;
    const yearInput = document.getElementById('manual-year') as HTMLInputElement;
    const cvvInput = document.getElementById('advanced-cvv') as HTMLInputElement;
    const quantityInput = document.getElementById('adv-quantity') as HTMLInputElement;

    addHistoryEntry({
        bin: pattern,
        month: monthInput.value,
        year: yearInput.value,
        cvv: cvvInput.value,
        quantity: quantityInput.value
    });
    
    let year = yearInput.value;
    if (year) {
        let yearNum = parseInt(year, 10);
        if (!isNaN(yearNum) && yearNum >= 0 && yearNum < 100) {
            year = String(yearNum + 2000);
        }
    }

    const config = {
        month: monthInput.value,
        year: year,
        cvv: cvvInput.value,
        quantity: parseInt(quantityInput.value, 10) || 10
    };

    const results = Array.from({ length: config.quantity }, () => {
        let number: string;
        
        if (hasPattern) {
            const prefixLength = isAmex ? 14 : 15;
            let prefix = pattern.substring(0, prefixLength);
            let generatedPrefix = '';
            for (const char of prefix) {
                generatedPrefix += (char.toLowerCase() === 'x') ? Math.floor(Math.random() * 10) : char;
            }
            const luhnDigit = calculateLuhn(generatedPrefix);
            number = generatedPrefix + luhnDigit;
        } else {
            let baseNumber = pattern;
            const numberLength = isAmex ? 14 : 15;
            while (baseNumber.length < numberLength) {
                baseNumber += Math.floor(Math.random() * 10);
            }
            number = baseNumber + calculateLuhn(baseNumber);
        }

        const monthValue = config.month;
        const yearValue = config.year;

        const finalMonth = monthValue ? String(monthValue).padStart(2, '0') : String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const finalYear = yearValue || String(new Date().getFullYear() + Math.floor(Math.random() * 10));
        
        const cvvLength = isAmex ? 4 : 3;
        const cvv = config.cvv || String(Math.floor(Math.random() * (10 ** cvvLength))).padStart(cvvLength, '0');
        return { number, month: finalMonth, year: finalYear, cvv };
    });
    
    const resultsArea = document.getElementById('results-area-gen') as HTMLTextAreaElement;
    resultsArea.value = results.map(c => `${c.number}|${c.month}|${c.year}|${c.cvv}`).join('\n');
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

function calculateSimilarity() {
    const resultEl = document.getElementById('sim-result') as HTMLInputElement;
    const cc1 = (document.getElementById('sim-cc1') as HTMLInputElement).value;
    const cc2 = (document.getElementById('sim-cc2') as HTMLInputElement).value;
    resultEl.value = ''; // Clear previous results

    if (cc1.length < 15 || cc2.length < 15) { // Adjusted for Amex
        showError("Error: Ambas tarjetas deben tener al menos 15 dígitos.");
        return;
    }
    if (cc1.length !== cc2.length) {
        showError("Error: Las tarjetas deben tener la misma longitud.");
        return;
    }
    const bin1 = cc1.substring(0, 6);
    const bin2 = cc2.substring(0, 6);
    if (bin1 !== bin2) {
        showError("Error: Las tarjetas deben tener el mismo BIN.");
        return;
    }

    const rest1 = cc1.substring(6);
    const rest2 = cc2.substring(6);
    let result = '';
    for (let i = 0; i < rest1.length; i++) {
        result += (rest1[i] === rest2[i]) ? rest1[i] : 'x';
    }
    const finalResult = bin1 + result;
    resultEl.value = finalResult;
    
    // Guardar en historial
    addExtrapolatorHistoryEntry({
        card1: cc1,
        card2: cc2,
        result: finalResult
    });
}

function calculatePossibilities() {
    const resultEl = document.getElementById('pos-result') as HTMLTextAreaElement;
    const fullInput = (document.getElementById('pos-cc') as HTMLInputElement).value;
    resultEl.value = ''; // Clear previous results

    const parts = fullInput.split('|');
    const cc = parts[0].replace(/\D/g, '');
    
    if (cc.length < 15) { // Adjusted for Amex
        showError("Error: El número de tarjeta debe tener al menos 15 dígitos.");
        return;
    }

    const otherParts = parts.length > 1 ? '|' + parts.slice(1).join('|') : '';

    const patterns = [
        cc.substring(0, 12) + 'xxxx',
        cc.substring(0, 10) + 'xxxxxx',
        cc.substring(0, 8) + 'xxxxxxxx',
        cc.substring(0, 6) + 'xxxxxxxxxx',
        cc.substring(0, 11) + 'xxxx' + cc.slice(-1),
        cc.substring(0, 10) + 'x' + cc.charAt(11) + 'xxx'
    ].filter(p => p.length === cc.length); // Ensure patterns match original length

    resultEl.value = patterns.map(p => p + otherParts).join('\n');
}

function setupMethod1Generator() {
    const generateBtn = document.getElementById('m1-generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateFromPattern);
    }

    const binInput = document.getElementById('m1-bin') as HTMLInputElement;
    if (binInput) {
        binInput.addEventListener('input', () => {
            binInput.value = binInput.value.replace(/[^0-9xX]/g, '').toLowerCase();
        });
    }
    
    filterNumericInputs(['m1-month', 'm1-year', 'm1-cvv', 'm1-quantity']);
}

function generateFromPattern() {
    const patternInput = document.getElementById('m1-bin') as HTMLInputElement;
    const pattern = patternInput.value;
    const isAmex = pattern.startsWith('34') || pattern.startsWith('37');
    const expectedLength = isAmex ? 15 : 16;

    if (pattern.length !== expectedLength) {
        showError(`El patrón para esta tarjeta debe tener ${expectedLength} caracteres.`);
        return;
    }

    const month = (document.getElementById('m1-month') as HTMLInputElement).value;
    const year = (document.getElementById('m1-year') as HTMLInputElement).value;
    const cvv = (document.getElementById('m1-cvv') as HTMLInputElement).value;
    const quantity = parseInt((document.getElementById('m1-quantity') as HTMLInputElement).value, 10) || 10;
    
    const results = [];
    for (let i = 0; i < quantity; i++) {
        const prefixLength = isAmex ? 14 : 15;
        let prefix = pattern.substring(0, prefixLength);
        let generatedPrefix = '';
        for (const char of prefix) {
            generatedPrefix += (char.toLowerCase() === 'x') ? Math.floor(Math.random() * 10) : char;
        }

        const luhnDigit = calculateLuhn(generatedPrefix);
        const number = generatedPrefix + luhnDigit;

        const finalMonth = month ? String(month).padStart(2, '0') : String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const finalYear = year || String(new Date().getFullYear() + Math.floor(Math.random() * 10));
        
        const cvvLength = isAmex ? 4 : 3;
        const finalCvv = cvv || String(Math.floor(Math.random() * (10 ** cvvLength))).padStart(cvvLength, '0');
        
        results.push(`${number}|${finalMonth}|${finalYear}|${finalCvv}`);
    }
    const resultsArea = document.getElementById('m1-results-area') as HTMLTextAreaElement;
    const resultsText = results.join('\n');
    resultsArea.value = resultsText;
    
    // Guardar en historial
    addMethod1HistoryEntry({
        pattern: pattern,
        results: resultsText
    });
}

// --- HISTORY FUNCTIONS ---
function setupHistory() {
    const clearButton = document.getElementById('clear-history-btn');
    if (clearButton) {
        clearButton.addEventListener('click', clearHistory);
    }
    loadHistory();
    renderHistory();
}

function loadHistory() {
    try {
        const storedHistory = localStorage.getItem('generationHistory');
        if (storedHistory) {
            generationHistory = JSON.parse(storedHistory);
        }
    } catch (e) {
        console.error("Could not load history from localStorage", e);
        generationHistory = [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem('generationHistory', JSON.stringify(generationHistory));
    } catch (e) {
        console.error("Could not save history to localStorage", e);
    }
}

function renderHistory() {
    const list = document.getElementById('history-list') as HTMLUListElement;
    const emptyState = document.getElementById('history-empty-state');
    const clearButton = document.getElementById('clear-history-btn');

    if (!list || !emptyState || !clearButton) return;

    list.innerHTML = '';

    if (generationHistory.length === 0) {
        emptyState.classList.remove('hidden');
        list.classList.add('hidden');
        clearButton.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.classList.remove('hidden');
        clearButton.classList.remove('hidden');

        generationHistory.forEach(entry => {
            const item = document.createElement('li');
            item.className = 'history-item';
            
            const binSpan = document.createElement('span');
            binSpan.className = 'history-item-bin';
            binSpan.textContent = entry.bin;

            const dateSpan = document.createElement('span');
            dateSpan.className = 'history-item-date';
            dateSpan.textContent = `${entry.month || 'MM'}/${(entry.year || 'YY').slice(-2)}`;

            item.appendChild(binSpan);
            item.appendChild(dateSpan);
            
            item.addEventListener('click', () => applyHistoryEntry(entry));
            list.appendChild(item);
        });
    }
}

function addHistoryEntry(entry: HistoryEntry) {
    // Remove existing entry with the same BIN to avoid duplicates and move it to the top
    const existingIndex = generationHistory.findIndex(h => h.bin === entry.bin);
    if (existingIndex > -1) {
        generationHistory.splice(existingIndex, 1);
    }
    
    // Add to the beginning of the array
    generationHistory.unshift(entry);

    // Trim the history to the max length
    if (generationHistory.length > MAX_HISTORY_ITEMS) {
        generationHistory = generationHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    saveHistory();
    renderHistory();
}

function applyHistoryEntry(entry: HistoryEntry) {
    (document.getElementById('bin') as HTMLInputElement).value = entry.bin;
    (document.getElementById('manual-month') as HTMLInputElement).value = entry.month;
    (document.getElementById('manual-year') as HTMLInputElement).value = entry.year;
    (document.getElementById('advanced-cvv') as HTMLInputElement).value = entry.cvv;
    (document.getElementById('adv-quantity') as HTMLInputElement).value = entry.quantity;

    // Trigger input event to re-run BIN analysis if needed
    (document.getElementById('bin') as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
}

function clearHistory() {
    generationHistory = [];
    saveHistory();
    renderHistory();
}
// --- HISTORY FOR EXTRAPOLADOR ---
interface ExtrapolatorHistoryEntry {
    card1: string;
    card2: string;
    result: string;
}

let extrapolatorHistory: ExtrapolatorHistoryEntry[] = [];
const MAX_EXTRAPOLATOR_HISTORY = 10;

function setupHistoryExtrapolator() {
    const clearButton = document.getElementById('clear-history-btn-extrapolator');
    if (clearButton) {
        clearButton.addEventListener('click', clearExtrapolatorHistory);
    }
    loadExtrapolatorHistory();
    renderExtrapolatorHistory();
}

function loadExtrapolatorHistory() {
    try {
        const stored = localStorage.getItem('extrapolatorHistory');
        if (stored) {
            extrapolatorHistory = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Could not load extrapolator history", e);
        extrapolatorHistory = [];
    }
}

function saveExtrapolatorHistory() {
    try {
        localStorage.setItem('extrapolatorHistory', JSON.stringify(extrapolatorHistory));
    } catch (e) {
        console.error("Could not save extrapolator history", e);
    }
}

function renderExtrapolatorHistory() {
    const list = document.getElementById('history-list-extrapolator') as HTMLUListElement;
    const emptyState = document.getElementById('history-empty-state-extrapolator');
    const clearButton = document.getElementById('clear-history-btn-extrapolator');

    if (!list || !emptyState || !clearButton) return;

    list.innerHTML = '';

    if (extrapolatorHistory.length === 0) {
        emptyState.classList.remove('hidden');
        list.classList.add('hidden');
        clearButton.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.classList.remove('hidden');
        clearButton.classList.remove('hidden');

        extrapolatorHistory.forEach(entry => {
            const item = document.createElement('li');
            item.className = 'history-item';
            
            const resultSpan = document.createElement('span');
            resultSpan.className = 'history-item-bin';
            resultSpan.textContent = entry.result.substring(0, 20) + '...';

            item.appendChild(resultSpan);
            
            item.addEventListener('click', () => applyExtrapolatorEntry(entry));
            list.appendChild(item);
        });
    }
}

function addExtrapolatorHistoryEntry(entry: ExtrapolatorHistoryEntry) {
    const existingIndex = extrapolatorHistory.findIndex(h => h.card1 === entry.card1 && h.card2 === entry.card2);
    if (existingIndex > -1) {
        extrapolatorHistory.splice(existingIndex, 1);
    }
    
    extrapolatorHistory.unshift(entry);

    if (extrapolatorHistory.length > MAX_EXTRAPOLATOR_HISTORY) {
        extrapolatorHistory = extrapolatorHistory.slice(0, MAX_EXTRAPOLATOR_HISTORY);
    }

    saveExtrapolatorHistory();
    renderExtrapolatorHistory();
}

function applyExtrapolatorEntry(entry: ExtrapolatorHistoryEntry) {
    (document.getElementById('sim-cc1') as HTMLInputElement).value = entry.card1;
    (document.getElementById('sim-cc2') as HTMLInputElement).value = entry.card2;
    (document.getElementById('sim-result') as HTMLInputElement).value = entry.result;
}

function clearExtrapolatorHistory() {
    extrapolatorHistory = [];
    saveExtrapolatorHistory();
    renderExtrapolatorHistory();
}

// --- HISTORY FOR METHOD 1 ---
interface Method1HistoryEntry {
    pattern: string;
    results: string;
}

let method1History: Method1HistoryEntry[] = [];
const MAX_METHOD1_HISTORY = 10;

function setupHistoryMethod1() {
    const clearButton = document.getElementById('clear-history-btn-method1');
    if (clearButton) {
        clearButton.addEventListener('click', clearMethod1History);
    }
    loadMethod1History();
    renderMethod1History();
}

function loadMethod1History() {
    try {
        const stored = localStorage.getItem('method1History');
        if (stored) {
            method1History = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Could not load method1 history", e);
        method1History = [];
    }
}

function saveMethod1History() {
    try {
        localStorage.setItem('method1History', JSON.stringify(method1History));
    } catch (e) {
        console.error("Could not save method1 history", e);
    }
}

function renderMethod1History() {
    const list = document.getElementById('history-list-method1') as HTMLUListElement;
    const emptyState = document.getElementById('history-empty-state-method1');
    const clearButton = document.getElementById('clear-history-btn-method1');

    if (!list || !emptyState || !clearButton) return;

    list.innerHTML = '';

    if (method1History.length === 0) {
        emptyState.classList.remove('hidden');
        list.classList.add('hidden');
        clearButton.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.classList.remove('hidden');
        clearButton.classList.remove('hidden');

        method1History.forEach(entry => {
            const item = document.createElement('li');
            item.className = 'history-item';
            
            const patternSpan = document.createElement('span');
            patternSpan.className = 'history-item-bin';
            patternSpan.textContent = entry.pattern;

            item.appendChild(patternSpan);
            
            item.addEventListener('click', () => applyMethod1Entry(entry));
            list.appendChild(item);
        });
    }
}

function addMethod1HistoryEntry(entry: Method1HistoryEntry) {
    const existingIndex = method1History.findIndex(h => h.pattern === entry.pattern);
    if (existingIndex > -1) {
        method1History.splice(existingIndex, 1);
    }
    
    method1History.unshift(entry);

    if (method1History.length > MAX_METHOD1_HISTORY) {
        method1History = method1History.slice(0, MAX_METHOD1_HISTORY);
    }

    saveMethod1History();
    renderMethod1History();
}

function applyMethod1Entry(entry: Method1HistoryEntry) {
    (document.getElementById('m1-bin') as HTMLInputElement).value = entry.pattern;
    (document.getElementById('m1-results-area') as HTMLTextAreaElement).value = entry.results;
}

function clearMethod1History() {
    method1History = [];
    saveMethod1History();
    renderMethod1History();
}
// --- RANGE GENERATOR ---
function setupRangeGenerator() {
    const generateBtn = document.getElementById('range-generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateFromRange);
    }
    
    // Filtrar inputs numéricos
    filterNumericInputs(['range-start', 'range-end', 'range-month', 'range-year', 'range-cvv', 'range-quantity']);
}

function generateFromRange() {
    const startInput = document.getElementById('range-start') as HTMLInputElement;
    const endInput = document.getElementById('range-end') as HTMLInputElement;
    const monthInput = document.getElementById('range-month') as HTMLInputElement;
    const yearInput = document.getElementById('range-year') as HTMLInputElement;
    const cvvInput = document.getElementById('range-cvv') as HTMLInputElement;
    const quantityInput = document.getElementById('range-quantity') as HTMLInputElement;
    
    const start = startInput.value.trim();
    const end = endInput.value.trim();
    
    if (!start || !end) {
        showError('Debes ingresar un número inicial y final.');
        return;
    }
    
    if (start.length !== 16 || end.length !== 16) {
        showError('Ambos números deben tener 16 dígitos.');
        return;
    }
    
    const startNum = BigInt(start);
    const endNum = BigInt(end);
    
    if (startNum >= endNum) {
        showError('El número inicial debe ser menor que el número final.');
        return;
    }
    
    const maxQuantity = parseInt(quantityInput.value, 10) || 10;
    const range = endNum - startNum;
    const quantity = range < BigInt(maxQuantity) ? Number(range) : maxQuantity;
    
    const month = monthInput.value || String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const year = yearInput.value || String(new Date().getFullYear() + Math.floor(Math.random() * 10));
    const cvv = cvvInput.value || String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    const results = [];
    const step = range / BigInt(quantity);
    
    for (let i = 0; i < quantity; i++) {
        let currentNum = startNum + (step * BigInt(i));
        let cardNumber = currentNum.toString().padStart(16, '0');
        
        // Recalcular el dígito de Luhn
        const prefix = cardNumber.substring(0, 15);
        const luhnDigit = calculateLuhn(prefix);
        cardNumber = prefix + luhnDigit;
        
        results.push(`${cardNumber}|${month}|${year}|${cvv}`);
    }
    
    const resultsArea = document.getElementById('range-results-area') as HTMLTextAreaElement;
    resultsArea.value = results.join('\n');
}

// --- STATISTICS ---
interface Stats {
    totalGenerated: number;
    totalSessions: number;
}

let stats: Stats = {
    totalGenerated: 0,
    totalSessions: 0
};

function loadStats() {
    try {
        const storedStats = localStorage.getItem('ccgenStats');
        if (storedStats) {
            stats = JSON.parse(storedStats);
        } else {
            // Primera vez, incrementar sesiones
            stats.totalSessions = 1;
            saveStats();
        }
    } catch (e) {
        console.error("Could not load stats from localStorage", e);
        stats = { totalGenerated: 0, totalSessions: 1 };
    }
    renderStats();
}

function saveStats() {
    try {
        localStorage.setItem('ccgenStats', JSON.stringify(stats));
    } catch (e) {
        console.error("Could not save stats to localStorage", e);
    }
}

function renderStats() {
    const totalGeneratedEl = document.getElementById('total-generated');
    const totalSessionsEl = document.getElementById('total-sessions');
    
    if (totalGeneratedEl) {
        totalGeneratedEl.textContent = stats.totalGenerated.toString();
    }
    if (totalSessionsEl) {
        totalSessionsEl.textContent = stats.totalSessions.toString();
    }
}

function incrementGenerated(count: number) {
    stats.totalGenerated += count;
    saveStats();
    renderStats();
}

function setupStats() {
    loadStats();
}