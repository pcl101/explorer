// js/tables.js

import { renderPage, renderPagination, makeSortable } from './pagination.js';
import { showView, updateSelectionText } from './ui.js';

const pageSizes = [10, 25, 50, 100];

// Helper: controleer of dit keuzedeel een relevante (Curio) overlap heeft
function hasRelevantOverlapForCurio(kwalificatieCode) {
    const creboSet = appState.overlapCreboByKwal.get(kwalificatieCode);
    if (!creboSet || creboSet.size === 0) return false;

    // Kijk of er minstens één CREBO van dit keuzedeel in de overlap-set zit
    return appState.currentData.some(row => 
        row.KWALIFICATIE === kwalificatieCode && 
        creboSet.has(String(row.CREBO))
    );
}

// Helper: converteer Excel serial datum naar leesbare NL datum
function excelToDate(serial) {
    if (!serial) return '—';
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toLocaleDateString('nl-NL');
}

export function renderKwalificaties() {
    const map = {};
    appState.currentData.forEach(r => {
        if (!map[r.KWALIFICATIE]) {
            map[r.KWALIFICATIE] = { omschrijving: r.OMSCHRIJVING || 'Geen omschrijving', cohorten: new Set() };
        }
        map[r.KWALIFICATIE].cohorten.add(r.COHORT);
    });

    const count = Object.keys(map).length;
    document.getElementById('resultCount').textContent = `(${count} ${count === 1 ? 'keuzedeel' : 'keuzedelen'})`;

    const rows = Object.keys(map).sort().map(k => {
        const cohorts = [...map[k].cohorten].sort((a,b) => a - b).join(', ');

        const sbbEntry = appState.sbbByCode?.get(k);
        let extraInfo = '';
        if (sbbEntry?.einddatum) {
            const trimmed = String(sbbEntry.einddatum).trim();
            if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
                extraInfo = ` <span class="expired-date">(vervalt ${trimmed})</span>`;
            }
        }

        // NIEUW: overlap-icon met class voor aparte click-handler
        let overlapIcon = '';
        if (hasRelevantOverlapForCurio(k)) {
            overlapIcon = ` <i class="bi bi-exclamation-triangle text-danger overlap-icon cursor-pointer" 
                              data-kwal="${k}" 
                              title="Klik voor overlap details binnen Curio aanbod"></i>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `
            <td>
                <strong>${k}</strong>
                <i class="bi bi-info-circle info-icon ms-2 text-primary" style="font-size:1.1rem;" title="Meer informatie over dit keuzedeel"></i>
            </td>
            <td>${map[k].omschrijving}${overlapIcon}${extraInfo}</td>
            <td>${cohorts}</td>
        `;

        // if (extraInfo) tr.classList.add('orange-row');

        // Rij-klik: ga naar volledige detailView (alle opleidingen)
        tr.onclick = () => {
            appState.currentKeuzedeel = k;
            appState.currentOmschrijving = map[k].omschrijving;
            document.getElementById('detailTitle').textContent = `Keuzedeel ${k} — ${appState.currentOmschrijving}`;
            showView('detailView');
            appState.viewHistory.push('detailView');
            updateSelectionText();
            renderDetailOpleidingen();
        };

        // Info-icon: SBB detail
        tr.querySelector('.info-icon')?.addEventListener('click', e => {
            e.stopPropagation();
            appState.currentKeuzedeel = k;
            showView('sbbDetailView');
            appState.viewHistory.push('sbbDetailView');
            renderSbbDetail();
        });

        return tr;
    });

    if (count === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center text-muted">Geen keuzedelen gevonden</td>';
        rows.push(tr);
    }

    // Voeg rows toe aan de tabel
    const tbody = document.getElementById('kwalificatiesTable');
    if (tbody) {
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
    }

    // NIEUW: voeg click-listeners toe aan alle overlap-icons (na rows toevoegen)
    document.querySelectorAll('.overlap-icon').forEach(icon => {
        icon.addEventListener('click', e => {
            e.stopPropagation();  // Voorkom dat rij-klik triggert
            const k = e.target.dataset.kwal;
            appState.currentKeuzedeel = k;
            appState.currentOmschrijving = map[k]?.omschrijving || 'Geen omschrijving';
            document.getElementById('overlapDetailTitle').textContent = `Overlap voor keuzedeel ${k} — ${appState.currentOmschrijving}`;
            showView('overlapDetailView');
            appState.viewHistory.push('overlapDetailView');
            updateSelectionText();
            renderOverlapDetail();
        });
    });

    appState.pagination = appState.pagination || {};
    appState.pagination.main = { page: 1, size: 10, data: rows };

    renderPage('main');
    renderPagination('main', rows.length);
    makeSortable('mainTable', 'main');
}

export function updateExpiredPage() {
    const expiredList = [];
    const seen = new Set();
    const relevantCodes = new Set(appState.currentData.map(r => r.KWALIFICATIE));

    appState.sbbData.forEach(entry => {
        const code = entry.code;
        if (!relevantCodes.has(code) || seen.has(code)) return;
        seen.add(code);

        const trimmed = String(entry.einddatum || '').trim();
        if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
            expiredList.push({
                code,
                omschrijving: entry.titel || 'Geen omschrijving',
                vervaldatum: trimmed
            });
        }
    });

    expiredList.sort((a, b) => a.code.localeCompare(b.code));

    document.getElementById('expiredCount').textContent = `(${expiredList.length} vervallen keuzedelen)`;

    const rows = expiredList.map(item => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `<td><strong>${item.code}</strong></td><td>${item.omschrijving}</td><td>${item.vervaldatum}</td>`;
        tr.onclick = () => {
            appState.currentKeuzedeel = item.code;
            appState.currentOmschrijving = item.omschrijving;
            document.getElementById('expiredDetailTitle').textContent = `Vervallen keuzedeel ${item.code} — ${item.omschrijving}`;
            showView('expiredDetailView');
            appState.viewHistory.push('expiredDetailView');
            updateSelectionText();
            renderExpiredDetailOpleidingen();
        };
        return tr;
    });

    if (!expiredList.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center text-muted">Geen vervallen keuzedelen gevonden in deze selectie</td>';
        rows.push(tr);
    }

    appState.pagination = appState.pagination || {};
    appState.pagination.expired = { page: 1, size: 10, data: rows };

    renderPage('expired');
    renderPagination('expired', rows.length);
    makeSortable('expiredTable', 'expired');
}

export function renderDetailOpleidingen() {
    const data = appState.currentData.filter(r => r.KWALIFICATIE === appState.currentKeuzedeel);
    const tbody = document.getElementById('detailTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Geen data</td></tr>';
        return;
    }

    const grouped = groupBySectorOpleiding(data);
    const rows = createGroupedRows(grouped);

    appState.pagination = appState.pagination || {};
    appState.pagination.detail = { page: 1, size: 10, data: rows };

    renderPage('detail');
    renderPagination('detail', rows.length);
    makeSortable('detailTable', 'detail');
}

export function renderExpiredDetailOpleidingen() {
    const data = appState.currentData.filter(r => r.KWALIFICATIE === appState.currentKeuzedeel);
    const tbody = document.getElementById('expiredDetailTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Geen aanbod gevonden</td></tr>';
        return;
    }

    const grouped = groupBySectorOpleiding(data);
    const rows = createGroupedRows(grouped);

    appState.pagination = appState.pagination || {};
    appState.pagination.expiredDetail = { page: 1, size: 10, data: rows };

    renderPage('expiredDetail');
    renderPagination('expiredDetail', rows.length);
    makeSortable('expiredDetailTable', 'expiredDetail');
}

export function renderOverlapDetail() {
    const kwal = appState.currentKeuzedeel;
    const creboSet = appState.overlapCreboByKwal.get(kwal) || new Set();

    const overlappingCreboItems = appState.overlapData.filter(item => 
        item.Kwalificatie === kwal &&
        item.overlap === "Ja" &&
        creboSet.has(String(item.Crebo))
    );

    overlappingCreboItems.sort((a, b) => Number(a.Crebo) - Number(b.Crebo));

    const tbody = document.getElementById('overlapDetailTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    let hasAnyRows = false;

    overlappingCreboItems.forEach(item => {
        const crebo = String(item.Crebo);

        // Groepeer per opleiding + verzamel cohorten
const opleidingData = appState.rawData
    .filter(r => String(r.CREBO) === crebo && r.KWALIFICATIE === kwal)
    .reduce((acc, r) => {
        if (!acc[r.OPLEIDING]) {
            acc[r.OPLEIDING] = new Set();
        }
        acc[r.OPLEIDING].add(r.COHORT);
        return acc;
    }, {});

// console.log(`Voor CREBO ${crebo}:`, opleidingData);  // ← Tijdelijk toevoegen voor debug

        // Alleen rij toevoegen als er minstens één opleiding gevonden is
        if (Object.keys(opleidingData).length > 0) {
            hasAnyRows = true;

            Object.entries(opleidingData).forEach(([opleiding, cohortsSet]) => {
                const cohorts = [...cohortsSet].sort((a, b) => a - b).join(', ');
                const cohortText = cohorts ? ` (${cohorts})` : '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${crebo}</td>
                    <td>${opleiding}${cohortText}</td>
                    <td>${excelToDate(item.datum)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    });

    if (!hasAnyRows) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Geen overlappende opleidingen gevonden in Curio data</td></tr>';
    }

    // Optioneel: pagination bijwerken
    const rowCount = tbody.querySelectorAll('tr').length;
    appState.pagination = appState.pagination || {};
    appState.pagination.overlapDetail = { page: 1, size: 10, data: [] };
    renderPage('overlapDetail');
    renderPagination('overlapDetail', rowCount);
    makeSortable('overlapDetailTable', 'overlapDetail');
}

export function renderSbbDetail() {
    const entry = appState.sbbByCode?.get(appState.currentKeuzedeel);
    const titleEl = document.getElementById('sbbDetailTitle');
    const tbody = document.getElementById('sbbInfoBody');

    if (!titleEl || !tbody) return;

    titleEl.textContent = entry
        ? `SBB Info voor ${appState.currentKeuzedeel} — ${entry.titel || '—'}`
        : `Geen SBB info voor ${appState.currentKeuzedeel}`;

    tbody.innerHTML = '';

    if (!entry) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Geen informatie beschikbaar</td></tr>';
        return;
    }

    const fields = [
        { label: 'Titel',                    value: entry.titel },
        { label: 'Ingangsdatum',             value: entry.ingangsdatum },
        { label: 'Einddatum',                value: entry.einddatum },
        { label: 'SBU',                      value: entry.sbu },
        { label: 'Beschrijving',             value: entry.beschrijving },
        { label: 'Relevantie',               value: entry.relevantie },
        { label: 'Toelichting',              value: entry.toelichting },
        { 
            label: 'Sectorkamer', 
            value: entry.sectorkamer_nr 
                ? (appState.sectorkamerLookup[entry.sectorkamer_nr] || `Onbekend (${entry.sectorkamer_nr})`)
                : '—' 
        },
        { 
            label: 'Aard', 
            value: entry.aarden?.map(nr => appState.aardenLookup[nr] || nr + ' (onbekend)').join(', ') || '' 
        },
        { label: 'Ingangsdatum Certificaat', value: entry.ingangsdatum_certificaat },
        { label: 'Einddatum Certificaat',    value: entry.einddatum_certificaat },
        { label: 'Certificaat',              value: entry.is_certificaat ? 'Ja' : 'Nee' }
    ];

    fields.forEach(f => {
        if (f.value != null && f.value !== '') {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${f.label}</strong></td><td>${f.value}</td>`;
            tbody.appendChild(tr);
        }
    });
}

export function updateStatisticsPage() {
    const setSize = field => new Set(appState.currentData.map(r => r[field])).size;

    document.getElementById('statKeuzedelen').textContent = setSize('KWALIFICATIE');
    document.getElementById('statOpleidingen').textContent = setSize('OPLEIDING');
    document.getElementById('statCohorten').textContent = setSize('COHORT');
    document.getElementById('statRecords').textContent = appState.currentData.length;

    const counts = {};
    appState.currentData.forEach(r => {
        counts[r.KWALIFICATIE] = (counts[r.KWALIFICATIE] || 0) + 1;
    });

    const top10 = Object.entries(counts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 10);

    const list = document.getElementById('top10List');
    if (!list) return;

    list.innerHTML = top10.length ? '' : '<li class="text-muted">Geen data</li>';

    top10.forEach(([code, cnt]) => {
        const omschrijving = appState.currentData.find(r => r.KWALIFICATIE === code)?.OMSCHRIJVING || 'Onbekend';
        const li = document.createElement('li');
        li.innerHTML = `<strong>${code}</strong> — ${omschrijving} <span class="text-muted float-end">${cnt}×</span>`;
        list.appendChild(li);
    });
}

export function updateOverlapPage() {
    const currentSet = new Set(appState.currentData.map(r => r.KWALIFICATIE));
    const tbody = document.getElementById('overlapTableBody');
    if (!tbody) return;

    if (!currentSet.size) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Geen keuzedelen</td></tr>';
        return;
    }

    const overlap = {};
    appState.rawData.forEach(r => {
        if (!currentSet.has(r.KWALIFICATIE)) return;
        if (!overlap[r.KWALIFICATIE]) {
            overlap[r.KWALIFICATIE] = { omschrijving: r.OMSCHRIJVING || 'Onbekend', sectoren: new Set(), opleidingen: new Set() };
        }
        overlap[r.KWALIFICATIE].sectoren.add(r.SECTOR);
        overlap[r.KWALIFICATIE].opleidingen.add(r.OPLEIDING);
    });

    const rows = Object.entries(overlap)
        .filter(([,v]) => v.sectoren.size > 1)
        .sort((a,b) => b[1].sectoren.size - a[1].sectoren.size || b[1].opleidingen.size - a[1].opleidingen.size)
        .map(([code, {omschrijving, sectoren, opleidingen}]) => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.innerHTML = `<td><strong>${code}</strong></td><td>${omschrijving}</td><td>${sectoren.size}</td><td>${opleidingen.size}</td>`;
            tr.onclick = () => {
                appState.currentKeuzedeel = code;
                appState.currentOmschrijving = omschrijving;
                document.getElementById('detailTitle').textContent = `Keuzedeel ${code} — ${omschrijving}`;
                showView('detailView');
                appState.viewHistory.push('detailView');
                renderDetailOpleidingen();
            };
            return tr;
        });

    appState.pagination = appState.pagination || {};
    appState.pagination.overlap = { page: 1, size: 10, data: rows };

    renderPage('overlap');
    renderPagination('overlap', rows.length);
    makeSortable('overlapTable', 'overlap');
}

// ─── hulpfuncties voor detail views ────────────────────────────────────────

function groupBySectorOpleiding(data) {
    const grouped = {};
    data.forEach(r => {
        const key = `${r.SECTOR}|${r.OPLEIDING}`;
        if (!grouped[key]) {
            grouped[key] = { sectoren: r.SECTOR, opleidingen: r.OPLEIDING, crebo: r.CREBO, cohorten: new Set() };
        }
        grouped[key].cohorten.add(r.COHORT);
    });
    return grouped;
}

function createGroupedRows(grouped) {
    return Object.values(grouped)
        .sort((a,b) => a.sectoren.localeCompare(b.sectoren) || a.opleidingen.localeCompare(b.opleidingen))
        .map(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.sectoren}</td>
                <td>${item.opleidingen} (${item.crebo})</td>
                <td>${[...item.cohorten].sort((a,b)=>a-b).join(', ')}</td>
            `;
            return tr;
        });
}