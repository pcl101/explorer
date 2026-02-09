// js/events.js

import { applyFilters, resetAndApplyFilters } from './filters.js';
import { showViewWithHistory, updateCurrentSelection, handleBackButton } from './ui.js';
import { renderKwalificaties, updateStatisticsPage, updateOverlapPage, updateExpiredPage } from './tables.js';
import { updateTrendsPage } from './charts.js';
import { printFullSelection, printDetailSelection, printExpiredDetailSelection, printOverlapDetailSelection } from './export.js';
import { exportCurrentSelection } from './export.js';

// Importeer setTheme uit main.js (zorg dat main.js exporteert!)
import { setTheme } from './main.js';

export function initEventListeners() {
    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.onclick = () => handleBackButton(btn);
    });

    // Hoofdknoppen navigatie
    document.getElementById('showStatsBtn')?.addEventListener('click', () =>
        showViewWithHistory('statsView', updateStatisticsPage));

    document.getElementById('showTrendsBtn')?.addEventListener('click', () =>
        showViewWithHistory('trendsView', updateTrendsPage));

    document.getElementById('showOverlapBtn')?.addEventListener('click', () =>
        showViewWithHistory('overlapView', updateOverlapPage));

    document.getElementById('showExpiredBtn')?.addEventListener('click', () =>
        showViewWithHistory('expiredView', updateExpiredPage));

    // PDF knoppen (vervangen print → pdf, zelfde functie behouden)
    document.getElementById('printBtn')?.addEventListener('click', printFullSelection);
    document.getElementById('printDetailBtn')?.addEventListener('click', printDetailSelection);
    document.getElementById('printExpiredDetailBtn')?.addEventListener('click', printExpiredDetailSelection);
    document.getElementById('printOverlapDetailBtn')?.addEventListener('click', printOverlapDetailSelection);

    // Optioneel: als je later een aparte print voor overlap/exprired wilt:
    // document.getElementById('printOverlapBtn')?.addEventListener('click', printFullSelection);
	
    // Export en print knoppen - spreiding / overlap view
    document.getElementById('exportCsvOverlapBtn')?.addEventListener('click', () => exportCurrentSelection('csv'));
    document.getElementById('exportJsonOverlapBtn')?.addEventListener('click', () => exportCurrentSelection('json'));
    document.getElementById('printOverlapBtn')?.addEventListener('click', printFullSelection);
	
    // Export en print knoppen - vervallen view
    document.getElementById('exportCsvExpiredBtn')?.addEventListener('click', () => exportCurrentSelection('csv'));
    document.getElementById('exportJsonExpiredBtn')?.addEventListener('click', () => exportCurrentSelection('json'));
    document.getElementById('printExpiredBtn')?.addEventListener('click', printFullSelection);

    // Filters
    document.getElementById('resetFiltersBtn')?.addEventListener('click', resetAndApplyFilters);

    ['sectorFilter','leerwegFilter','cohortFilter','opleidingFilter'].forEach(id =>
        document.getElementById(id)?.addEventListener('change', applyFilters));

    document.getElementById('searchFilter')?.addEventListener('input', applyFilters);

    // Export knoppen - hoofdpagina
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => exportCurrentSelection('csv'));
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => exportCurrentSelection('json'));

    // Export knoppen - detail view
    document.getElementById('exportCsvDetailBtn')?.addEventListener('click', () => exportCurrentSelection('csv'));
    document.getElementById('exportJsonDetailBtn')?.addEventListener('click', () => exportCurrentSelection('json'));

    // Export knoppen - overlap view
    document.getElementById('exportCsvOverlapDetailBtn')?.addEventListener('click', () => exportCurrentSelection('csv'));
    document.getElementById('exportJsonOverlapDetailBtn')?.addEventListener('click', () => exportCurrentSelection('json'));

    // Export knoppen - expired detail
    document.getElementById('exportCsvExpiredDetailBtn')?.addEventListener('click', () => exportCurrentSelection('csv'));
    document.getElementById('exportJsonExpiredDetailBtn')?.addEventListener('click', () => exportCurrentSelection('json'));

    // ────────────────────────────────────────────────
    // Dark mode / theme toggle
    // ────────────────────────────────────────────────
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const root = document.documentElement;
        const isCurrentlyDark = root.classList.contains('dark');
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        
        setTheme(newTheme);
    });
}