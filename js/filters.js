// js/filters.js

import { renderKwalificaties } from './tables.js';
import { updateCurrentSelection } from './ui.js';

/**
 * Past alle actieve filters toe op de ruwe data en werkt de UI bij.
 * Wordt aangeroepen bij elke wijziging in een filter (dropdown of zoekveld).
 */
export function applyFilters() {
    // Stap 1: bewaar de huidige filterwaarden (voordat we de selects leegmaken/herbouwen)
    const filters = {
        sector:   document.getElementById('sectorFilter')?.value   || '',
        leerweg:  document.getElementById('leerwegFilter')?.value  || '',
        cohort:   document.getElementById('cohortFilter')?.value   || '',
        opleiding: document.getElementById('opleidingFilter')?.value || '',
        search:   document.getElementById('searchFilter')?.value?.trim() || ''
    };

    // Stap 2: single-pass filter (veel efficiënter dan gekoppelde .filter() calls)
    const hasFilters = filters.sector || filters.leerweg || filters.cohort || filters.opleiding || filters.search;
    
    let filteredData;
    if (!hasFilters) {
        filteredData = appState.rawData;
    } else {
        const searchTerm = filters.search ? filters.search.toLowerCase() : '';
        const cohortNum = filters.cohort ? Number(filters.cohort) : null;
        
        filteredData = appState.rawData.filter(r => {
            if (filters.sector && r.SECTOR !== filters.sector) return false;
            if (filters.leerweg && r.LEERWEG !== filters.leerweg) return false;
            if (cohortNum !== null && r.COHORT !== cohortNum) return false;
            if (filters.opleiding && r.OPLEIDING !== filters.opleiding) return false;
            if (searchTerm) {
                const kwal = (r.KWALIFICATIE || '').toLowerCase();
                const oms = (r.OMSCHRIJVING || '').toLowerCase();
                if (!kwal.includes(searchTerm) && !oms.includes(searchTerm)) return false;
            }
            return true;
        });
    }

    // Stap 3: update globale state
    appState.currentData = filteredData;

    // Stap 4: vul dropdowns opnieuw (met beperkte opties op basis van gefilterde data)
    populateFilters();

    // Stap 5: herstel de eerder geselecteerde waarden (ze gaan anders verloren bij herbouwen)
    restoreFilterValues(filters);

    // Stap 7: update tabel + tekst "Huidige filters"
    renderKwalificaties();
    updateCurrentSelection();
}

/**
 * Herstelt de geselecteerde waarden in de dropdowns na populateFilters()
 * @param {Object} filters - object met de eerder bewaarde waarden
 */
function restoreFilterValues(filters) {
    const els = {
        sectorFilter:   filters.sector,
        leerwegFilter:  filters.leerweg,
        cohortFilter:   filters.cohort,
        opleidingFilter: filters.opleiding
    };

    Object.entries(els).forEach(([id, value]) => {
        const select = document.getElementById(id);
        if (select && value !== '') {
            select.value = value;
        }
    });

    // searchFilter is een <input> → waarde blijft automatisch behouden
}

/**
 * Vult alle filter-dropdowns opnieuw op basis van de actuele currentData
 */
export function populateFilters() {
    const configs = [
        { id: 'sectorFilter',   field: 'SECTOR',   label: 'Alle sectoren' },
        { id: 'leerwegFilter',  field: 'LEERWEG',  label: 'Alle leerwegen' },
        { id: 'cohortFilter',   field: 'COHORT',   label: 'Alle cohorten', numeric: true },
        { id: 'opleidingFilter', field: 'OPLEIDING', label: 'Alle opleidingen', custom: true }
    ];

    configs.forEach(cfg => {
        const select = document.getElementById(cfg.id);
        if (!select) return;

        // Bewaar huidige waarde (voor herstel na clearen)
        const currentValue = select.value;

        let options = [];

        if (cfg.custom) {
            // Opleiding + CREBO
            const uniqueMap = new Map(
                appState.currentData.map(r => [r.OPLEIDING, r.CREBO])
            );
            options = [...uniqueMap.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]));
        } else {
            // Gewone velden
            options = [...new Set(appState.currentData.map(r => r[cfg.field]))]
                .filter(v => v != null && v !== '')
                .sort((a, b) => cfg.numeric ? Number(a) - Number(b) : a.localeCompare(b));
        }

        // Bouw HTML opnieuw op
        let html = `<option value="">${cfg.label}</option>`;

        if (cfg.custom) {
            options.forEach(([opleiding, crebo]) => {
                html += `<option value="${opleiding}">${opleiding} (${crebo})</option>`;
            });
        } else {
            options.forEach(val => {
                html += `<option value="${val}">${val}</option>`;
            });
        }

        select.innerHTML = html;

        // Probeer de oude waarde te herstellen (als die nog bestaat)
        if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    });
}

/**
 * Reset alle filters naar leeg en past de filtering opnieuw toe
 */
export function resetAndApplyFilters() {
    ['sectorFilter', 'leerwegFilter', 'cohortFilter', 'opleidingFilter', 'searchFilter']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

    applyFilters();
}