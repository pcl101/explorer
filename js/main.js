// js/main.js ── entry point

import { loadAllData } from './data.js';
import { applyFilters, populateFilters, resetAndApplyFilters } from './filters.js';
import { 
  showView, 
  showViewWithHistory, 
  updateCurrentSelection, 
  updateSelectionText, 
  handleBackButton 
} from './ui.js';

// Tabellen, stats, overlap, expired, details
import {
  renderKwalificaties,
  updateExpiredPage,
  renderDetailOpleidingen,
  renderExpiredDetailOpleidingen,
  renderSbbDetail,
  updateStatisticsPage,
  updateOverlapPage
} from './tables.js';

// Trends & charts
import { updateTrendsPage } from './charts.js';

import { initEventListeners } from './events.js';

window.appState = {
    rawData: [],
    currentData: [],
    sbbData: [],
    currentKeuzedeel: '',
    currentOmschrijving: '',
    aardenLookup: {},
    overlapSet: new Set(),
    sectorkamerLookup: {},
    viewHistory: ['mainView'],
    uniqueKeuzChart: null,
    newKeuzChart: null,
};

// ────────────────────────────────────────────────
// Theme / dark mode functies
// ────────────────────────────────────────────────

function getPreferredTheme() {
    // Kijk eerst naar localStorage
    const saved = localStorage.getItem('theme');
    if (saved) return saved;

    // Anders: systeemvoorkeur
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function setTheme(theme) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Update icoontjes in de toggle-knop
    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    
    if (darkIcon && lightIcon) {
        if (theme === 'dark') {
            darkIcon.classList.add('d-none');
            lightIcon.classList.remove('d-none');
        } else {
            darkIcon.classList.remove('d-none');
            lightIcon.classList.add('d-none');
        }
    }

    // Sla op
    localStorage.setItem('theme', theme);
}

function initTheme() {
    const theme = getPreferredTheme();
    setTheme(theme);

    // Luister naar systeemwijziging (optioneel, maar netjes)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {  // alleen als gebruiker niet handmatig gekozen heeft
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// ────────────────────────────────────────────────
// Hoofd initialisatie
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Eerst thema instellen (zodat pagina niet flikkert)
    initTheme();

    try {
        await loadAllData();
        populateFilters();
        renderKwalificaties();
        updateCurrentSelection();
        document.getElementById('loading').style.display = 'none';
        document.getElementById('mainView').style.display = 'block';
    } catch (err) {
        console.error('Data laden mislukt:', err);
        const el = document.getElementById('loading');
        el.className = 'alert alert-danger';
        el.textContent = 'Fout bij laden data: ' + err.message;
    }

    initEventListeners();
});

// Voor gebruik in andere modules (optioneel export)
// export { applyFilters, renderKwalificaties, updateCurrentSelection };
export { setTheme, applyFilters, renderKwalificaties, updateCurrentSelection };