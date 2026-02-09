// js/app.js

let rawData = [], currentData = [], currentKeuzedeel = '', currentOmschrijving = '';
let uniqueKeuzChart, newKeuzChart;
let sbbData = [];
let aardenLookup = {};
let overlapSet = new Set();
let sectorkamerLookup = {};  // nr → titel

let viewHistory = ['mainView'];

const pageSizes = [10, 25, 50, 100];
const paginationState = {
    main:       { page: 1, size: 25, data: [] },
    overlap:    { page: 1, size: 25, data: [] },
    detail:     { page: 1, size: 25, data: [] },
    availability: { page: 1, size: 10, data: [] },
    expired:    { page: 1, size: 25, data: [] },
    expiredDetail: { page: 1, size: 25, data: [] }
};

const views = [
    'mainView', 'statsView', 'trendsView', 'overlapView',
    'expiredView', 'detailView', 'expiredDetailView', 'sbbDetailView'
];

// ────────────────────────────────────────────────
// Data ophalen
// ────────────────────────────────────────────────
Promise.all([
    fetch('data/keuzedelen_curio.json').then(r => r.ok ? r.json() : Promise.reject('Curio niet gevonden')),
    fetch('data/keuzedelen_sbb.json').then(r => r.ok ? r.json() : Promise.reject('SBB niet gevonden')),
    fetch('data/aard.json').then(r => r.ok ? r.json() : Promise.reject('Aard niet gevonden')),
    fetch('data/overlapchecks.json').then(r => r.ok ? r.json() : Promise.reject('Overlapchecks niet gevonden')),
    fetch('data/sectorkamer.json').then(r => r.ok ? r.json() : Promise.reject('Sectorkamer niet gevonden'))
]).then(([curioJson, sbbJson, aardJson, overlapJson, sectorkamerJson]) => {
    rawData = curioJson.Keuzedelen_clean || [];
    sbbData = sbbJson.keuzedelen || [];

    if (aardJson && aardJson.aardenkeuzedeel) {
        aardJson.aardenkeuzedeel.forEach(item => {
            aardenLookup[item.nr] = item.titel;
        });
    }

    if (overlapJson && overlapJson.overlap) {
        overlapSet = new Set(
            overlapJson.overlap
                .filter(item => item.overlap === "Ja")
                .map(item => item.Kwalificatie)
        );
    }

    // Sectorkamer lookup vullen
    if (Array.isArray(sectorkamerJson)) {
        sectorkamerJson.forEach(kamer => {
            if (kamer.nr) {
                sectorkamerLookup[kamer.nr] = kamer.titel || `Sectorkamer ${kamer.nr}`;
            }
        });
    } else if (typeof sectorkamerJson === 'object' && sectorkamerJson !== null) {
        Object.keys(sectorkamerJson).forEach(nr => {
            const kamer = sectorkamerJson[nr];
            sectorkamerLookup[nr] = kamer.titel || `Sectorkamer ${nr}`;
        });
    }

    currentData = [...rawData];
    document.getElementById('loading').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';
    populateFilters();
    renderKwalificaties();
    updateCurrentSelection();
}).catch(err => {
    console.error('Data laden mislukt:', err);
    const el = document.getElementById('loading');
    el.className = 'alert alert-danger';
    el.textContent = 'Fout bij laden data: ' + err.message;
});

// ────────────────────────────────────────────────
// Event listeners – navigatie
// ────────────────────────────────────────────────
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.hasAttribute('data-return')) {
            const target = btn.getAttribute('data-return');
            showView(target);
            const idx = viewHistory.lastIndexOf(target);
            if (idx !== -1) viewHistory = viewHistory.slice(0, idx + 1);
        } else {
            viewHistory.pop();
            showView(viewHistory[viewHistory.length - 1] || 'mainView');
        }
    };
});

document.getElementById('showStatsBtn').onclick = () => {
    showView('statsView'); viewHistory.push('statsView');
    updateSelectionText(); updateStatisticsPage();
};

document.getElementById('showTrendsBtn').onclick = () => {
    showView('trendsView'); viewHistory.push('trendsView');
    updateSelectionText(); updateTrendsPage();
};

document.getElementById('showOverlapBtn').onclick = () => {
    showView('overlapView'); viewHistory.push('overlapView');
    updateSelectionText(); updateOverlapPage();
};

document.getElementById('showExpiredBtn').onclick = () => {
    showView('expiredView'); viewHistory.push('expiredView');
    updateSelectionText(); updateExpiredPage();
};

document.getElementById('printBtn').onclick = printFullSelection;
document.getElementById('printOverlapBtn').onclick = printFullSelection;

// ────────────────────────────────────────────────
// Basis functies
// ────────────────────────────────────────────────
function showView(viewId) {
    views.forEach(id => {
        document.getElementById(id).style.display = (id === viewId) ? 'block' : 'none';
    });
}

function updateSelectionText() {
    const text = document.getElementById('currentSelection').textContent.replace('Huidige filters: ', '');
    document.querySelectorAll('#statsSelectionText, #trendsSelectionText, #overlapSelectionText, #expiredSelectionText, #detailSelectionText, #expiredDetailSelectionText')
        .forEach(el => el.textContent = text);
}

function updateCurrentSelection() {
    const vals = ['sectorFilter','leerwegFilter','cohortFilter','opleidingFilter'].map(id => {
        const v = document.getElementById(id).value;
        return v ? (id === 'cohortFilter' ? `cohort ${v}` : v) : `alle ${id.replace('Filter','').toLowerCase()}en`;
    });
    document.getElementById('currentSelection').textContent = `Huidige filters: ${vals.join(', ')}`;
}

// ────────────────────────────────────────────────
// Filters
// ────────────────────────────────────────────────
document.getElementById('resetFiltersBtn').onclick = () => {
    ['sectorFilter','leerwegFilter','cohortFilter','opleidingFilter','searchFilter'].forEach(id =>
        document.getElementById(id).value = '');
    applyFilters();
};

['sectorFilter','leerwegFilter','cohortFilter','opleidingFilter'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters)
);
document.getElementById('searchFilter').addEventListener('input', applyFilters);

function applyFilters() {
    let data = [...rawData];
    const filters = {
        sector: document.getElementById('sectorFilter').value,
        leerweg: document.getElementById('leerwegFilter').value,
        cohort: document.getElementById('cohortFilter').value,
        opleiding: document.getElementById('opleidingFilter').value,
        search: document.getElementById('searchFilter').value.toLowerCase()
    };

    if (filters.sector) data = data.filter(r => r.SECTOR === filters.sector);
    if (filters.leerweg) data = data.filter(r => r.LEERWEG === filters.leerweg);
    if (filters.cohort) data = data.filter(r => r.COHORT === parseInt(filters.cohort));
    if (filters.opleiding) data = data.filter(r => r.OPLEIDING === filters.opleiding);
    if (filters.search) {
        data = data.filter(r =>
            r.KWALIFICATIE.toLowerCase().includes(filters.search) ||
            (r.OMSCHRIJVING && r.OMSCHRIJVING.toLowerCase().includes(filters.search))
        );
    }

    currentData = data;
    populateFilters();
    renderKwalificaties();
    updateCurrentSelection();
}

function populateFilters() {
    const selects = {
        sector:  { el: 'sectorFilter',  field: 'SECTOR',  all: 'Alle sectoren' },
        leerweg: { el: 'leerwegFilter', field: 'LEERWEG', all: 'Alle leerwegen' },
        cohort:  { el: 'cohortFilter',  field: 'COHORT',  all: 'Alle cohorten' },
        opleiding: { el: 'opleidingFilter', field: 'OPLEIDING', all: 'Alle opleidingen', custom: true }
    };

    Object.values(selects).forEach(s => {
        const select = document.getElementById(s.el);
        const current = select.value;

        const values = s.custom
            ? [...new Map(currentData.map(r => [r.OPLEIDING, r.CREBO])).entries()]
                .sort((a,b) => a[0].localeCompare(b[0]))
            : [...new Set(currentData.map(r => r[s.field]))].sort((a,b) =>
                s.field === 'COHORT' ? a - b : a.localeCompare(b));

        select.innerHTML = `<option value="">${s.all}</option>`;
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = s.custom ? v[0] : v;
            opt.textContent = s.custom ? `${v[0]} (${v[1]})` : v;
            if (opt.value == current) opt.selected = true;
            select.appendChild(opt);
        });
    });
}

// ────────────────────────────────────────────────
// Hoofdtabel renderen
// ────────────────────────────────────────────────
function renderKwalificaties() {
    const map = {};
    currentData.forEach(r => {
        if (!map[r.KWALIFICATIE]) {
            map[r.KWALIFICATIE] = { oms: r.OMSCHRIJVING || 'Geen omschrijving', ch: new Set() };
        }
        map[r.KWALIFICATIE].ch.add(r.COHORT);
    });

    const count = Object.keys(map).length;
    document.getElementById('resultCount').textContent = `(${count} ${count === 1 ? 'keuzedeel' : 'keuzedelen'})`;

    const rows = Object.keys(map).sort().map(k => {
        const cohorts = [...map[k].ch].sort((a,b) => a - b).join(', ');

        const sbbEntry = sbbData.find(entry => entry.code === k);
        let omsText = map[k].oms;
        let extraInfo = '';

        if (sbbEntry && sbbEntry.einddatum) {
            const trimmed = String(sbbEntry.einddatum).trim();
            if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
                extraInfo = ` <span class="expired-date">(vervalt ${trimmed})</span>`;
            }
        }

        let overlapIcon = '';
        if (overlapSet.has(k)) {
            overlapIcon = ' <i class="bi bi-exclamation-triangle text-warning" title="Dit keuzedeel heeft ondoelmatige overlap"></i>';
        }

        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `
            <td>
                <strong>${k}</strong>
                <i class="bi bi-info-circle info-icon ms-2 text-primary" style="font-size:1.1rem;" title="Meer informatie over dit keuzedeel"></i>
            </td>
            <td>${omsText}${overlapIcon}${extraInfo}</td>
            <td>${cohorts}</td>
        `;

        if (extraInfo) tr.classList.add('orange-row');

        tr.onclick = () => {
            currentKeuzedeel = k;
            currentOmschrijving = map[k].oms;
            showView('detailView');
            viewHistory.push('detailView');
            document.getElementById('detailTitle').textContent = `Keuzedeel ${k} — ${currentOmschrijving}`;
            updateSelectionText();
            renderDetailOpleidingen();
        };

        tr.querySelector('.info-icon').onclick = (e) => {
            e.stopPropagation();
            currentKeuzedeel = k;
            showView('sbbDetailView');
            viewHistory.push('sbbDetailView');
            renderSbbDetail();
        };

        return tr;
    });

    if (count === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center text-muted">Geen keuzedelen gevonden</td>';
        rows.push(tr);
    }

    paginationState.main.data = rows;
    paginationState.main.page = 1;
    renderPage('main');
    renderPagination('main', rows.length);
    makeSortable('mainTable', 'main');
}

// ────────────────────────────────────────────────
// Vervallen overzicht
// ────────────────────────────────────────────────
function updateExpiredPage() {
    const expiredList = [];
    const seen = new Set();
    const relevantCodes = new Set(currentData.map(r => r.KWALIFICATIE));

    sbbData.forEach(entry => {
        const code = entry.code;
        if (!relevantCodes.has(code)) return;
        if (seen.has(code)) return;
        seen.add(code);

        const trimmedEind = String(entry.einddatum || '').trim();
        if (trimmedEind && trimmedEind !== 'null' && trimmedEind !== 'undefined') {
            expiredList.push({
                code,
                oms: entry.titel || 'Geen omschrijving',
                vervaldatum: trimmedEind
            });
        }
    });

    expiredList.sort((a, b) => a.code.localeCompare(b.code));

    document.getElementById('expiredCount').textContent = `(${expiredList.length} vervallen keuzedelen)`;

    const rows = expiredList.map(item => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `<td><strong>${item.code}</strong></td><td>${item.oms}</td><td>${item.vervaldatum}</td>`;
        tr.onclick = () => {
            currentKeuzedeel = item.code;
            currentOmschrijving = item.oms;
            showView('expiredDetailView');
            viewHistory.push('expiredDetailView');
            document.getElementById('expiredDetailTitle').textContent = `Vervallen keuzedeel ${item.code} — ${item.oms}`;
            updateSelectionText();
            renderExpiredDetailOpleidingen();
        };
        return tr;
    });

    if (expiredList.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center text-muted">Geen vervallen keuzedelen gevonden in deze selectie</td>';
        rows.push(tr);
    }

    paginationState.expired.data = rows;
    paginationState.expired.page = 1;
    renderPage('expired');
    renderPagination('expired', rows.length);
    makeSortable('expiredTable', 'expired');
}

// ────────────────────────────────────────────────
// Vervallen detail
// ────────────────────────────────────────────────
function renderExpiredDetailOpleidingen() {
    const data = currentData.filter(r => r.KWALIFICATIE === currentKeuzedeel);
    const tbody = document.getElementById('expiredDetailTableBody');
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Geen aanbod gevonden</td></tr>';
        return;
    }

    const grouped = {};
    data.forEach(r => {
        const key = `${r.SECTOR}|${r.OPLEIDING}`;
        if (!grouped[key]) {
            grouped[key] = { sec: r.SECTOR, opl: r.OPLEIDING, crebo: r.CREBO, ch: new Set() };
        }
        grouped[key].ch.add(r.COHORT);
    });

    const rows = Object.values(grouped)
        .sort((a,b) => a.sec.localeCompare(b.sec) || a.opl.localeCompare(b.opl))
        .map(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.sec}</td>
                <td>${item.opl} (${item.crebo})</td>
                <td>${[...item.ch].sort((a,b)=>a-b).join(', ')}</td>
            `;
            return tr;
        });

    paginationState.expiredDetail.data = rows;
    paginationState.expiredDetail.page = 1;
    renderPage('expiredDetail');
    renderPagination('expiredDetail', rows.length);
    makeSortable('expiredDetailTable', 'expiredDetail');
}

// ────────────────────────────────────────────────
// Normale detailweergave
// ────────────────────────────────────────────────
function renderDetailOpleidingen() {
    const data = currentData.filter(r => r.KWALIFICATIE === currentKeuzedeel);
    if (!data.length) {
        document.getElementById('detailTableBody').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Geen data</td></tr>';
        return;
    }

    const grouped = {};
    data.forEach(r => {
        const key = `${r.SECTOR}|${r.OPLEIDING}`;
        if (!grouped[key]) grouped[key] = {sec:r.SECTOR, opl:r.OPLEIDING, crebo:r.CREBO, ch:new Set()};
        grouped[key].ch.add(r.COHORT);
    });

    const rows = Object.values(grouped).sort((a,b) =>
        a.sec.localeCompare(b.sec) || a.opl.localeCompare(b.opl)
    ).map(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.sec}</td><td>${item.opl} (${item.crebo})</td><td>${[...item.ch].sort((a,b)=>a-b).join(', ')}</td>`;
        return tr;
    });

    paginationState.detail.data = rows;
    paginationState.detail.page = 1;
    renderPage('detail');
    renderPagination('detail', rows.length);
    makeSortable('detailTable', 'detail');
}

// ────────────────────────────────────────────────
// SBB detail – met sectorkamernaam
// ────────────────────────────────────────────────
function renderSbbDetail() {
    const entry = sbbData.find(e => e.code === currentKeuzedeel);
    document.getElementById('sbbDetailTitle').textContent = entry
        ? `SBB Info voor ${currentKeuzedeel} — ${entry.titel}`
        : `Geen SBB info voor ${currentKeuzedeel}`;

    const tbody = document.getElementById('sbbInfoBody');
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
                ? (sectorkamerLookup[entry.sectorkamer_nr] || `Onbekend (${entry.sectorkamer_nr})`)
                : '—' 
        },
        { label: 'Aard', value: entry.aarden ? entry.aarden.map(nr => aardenLookup[nr] || nr + ' (onbekend)').join(', ') : '' },
        { label: 'Ingangsdatum Certificaat', value: entry.ingangsdatum_certificaat },
        { label: 'Einddatum Certificaat',    value: entry.einddatum_certificaat },
        { label: 'Certificaat',           value: entry.is_certificaat ? 'Ja' : 'Nee' }
    ];

    fields.forEach(field => {
        if (field.value !== undefined && field.value !== null && field.value !== '') {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${field.label}</strong></td><td>${field.value}</td>`;
            tbody.appendChild(tr);
        }
    });
}

// ────────────────────────────────────────────────
// Statistieken
// ────────────────────────────────────────────────
function updateStatisticsPage() {
    const set = field => new Set(currentData.map(r => r[field])).size;
    document.getElementById('statKeuzedelen').textContent = set('KWALIFICATIE');
    document.getElementById('statOpleidingen').textContent = set('OPLEIDING');
    document.getElementById('statCohorten').textContent = set('COHORT');
    document.getElementById('statRecords').textContent = currentData.length;

    const counts = {};
    currentData.forEach(r => counts[r.KWALIFICATIE] = (counts[r.KWALIFICATIE] || 0) + 1);
    const top10 = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);

    const list = document.getElementById('top10List');
    list.innerHTML = top10.length ? '' : '<li class="text-muted">Geen data</li>';
    top10.forEach(([code, cnt]) => {
        const oms = currentData.find(r => r.KWALIFICATIE === code)?.OMSCHRIJVING || 'Onbekend';
        const li = document.createElement('li');
        li.innerHTML = `<strong>${code}</strong> — ${oms} <span class="text-muted float-end">${cnt}×</span>`;
        list.appendChild(li);
    });
}

// ────────────────────────────────────────────────
// Trends
// ────────────────────────────────────────────────
function updateTrendsPage() {
    const cohorts = [...new Set(currentData.map(r => r.COHORT))].sort((a,b)=>a-b);

    const unique = cohorts.map(c => new Set(currentData.filter(r=>r.COHORT===c).map(r=>r.KWALIFICATIE)).size);

    const newCounts = [];
    let seen = new Set();
    cohorts.forEach(c => {
        const curr = new Set(currentData.filter(r=>r.COHORT===c).map(r=>r.KWALIFICATIE));
        newCounts.push([...curr].filter(x => !seen.has(x)).length);
        seen = new Set([...seen, ...curr]);
    });

    uniqueKeuzChart?.destroy();
    newKeuzChart?.destroy();

    uniqueKeuzChart = new Chart(document.getElementById('uniqueKeuzChart'), {
        type: 'line',
        data: { labels: cohorts, datasets: [{label:'Unieke keuzedelen', data: unique, borderColor:'rgb(75,192,192)', tension:.1}] },
        options: { scales: { y: { beginAtZero: true } } }
    });

    newKeuzChart = new Chart(document.getElementById('newKeuzChart'), {
        type: 'bar',
        data: { labels: cohorts, datasets: [{label:'Nieuwe keuzedelen', data: newCounts, backgroundColor:'rgb(153,102,255)'}] },
        options: { scales: { y: { beginAtZero: true } } }
    });

    const top10Map = {};
    currentData.forEach(r => {
        if (!top10Map[r.KWALIFICATIE]) {
            top10Map[r.KWALIFICATIE] = { count: 0, oms: r.OMSCHRIJVING || 'Geen omschrijving' };
        }
        top10Map[r.KWALIFICATIE].count++;
    });

    const top10 = Object.entries(top10Map)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([code, info]) => ({ code, oms: info.oms }));

    document.getElementById('availabilityHeader').innerHTML = '<tr><th class="sortable">Keuzedeel</th>' +
        cohorts.map(c => `<th class="sortable">${c}</th>`).join('') + '</tr>';

    const rows = top10.map(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${item.code}</strong><br><small class="text-muted">${item.oms}</small></td>`;
        cohorts.forEach(c => {
            const td = document.createElement('td');
            td.className = currentData.some(r => r.COHORT === c && r.KWALIFICATIE === item.code) ? 'available' : 'not-available';
            td.textContent = td.className === 'available' ? '✓' : '—';
            tr.appendChild(td);
        });
        return tr;
    });

    paginationState.availability.data = rows;
    paginationState.availability.page = 1;
    renderPage('availability');
    renderPagination('availability', rows.length);
    makeSortable('availabilityTable', 'availability');
}

// ────────────────────────────────────────────────
// Overlap
// ────────────────────────────────────────────────
function updateOverlapPage() {
    const currentSet = new Set(currentData.map(r => r.KWALIFICATIE));
    if (!currentSet.size) {
        document.getElementById('overlapTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Geen keuzedelen</td></tr>';
        return;
    }

    const overlap = {};
    rawData.forEach(r => {
        if (!currentSet.has(r.KWALIFICATIE)) return;
        if (!overlap[r.KWALIFICATIE]) {
            overlap[r.KWALIFICATIE] = {oms: r.OMSCHRIJVING||'Onbekend', sec:new Set(), opl:new Set()};
        }
        overlap[r.KWALIFICATIE].sec.add(r.SECTOR);
        overlap[r.KWALIFICATIE].opl.add(r.OPLEIDING);
    });

    const rows = Object.entries(overlap)
        .filter(([, {sec}]) => sec.size > 1)
        .sort((a,b) => b[1].sec.size - a[1].sec.size || b[1].opl.size - a[1].opl.size)
        .map(([code, {oms, sec, opl}]) => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.innerHTML = `<td><strong>${code}</strong></td><td>${oms}</td><td>${sec.size}</td><td>${opl.size}</td>`;
            tr.onclick = () => {
                currentKeuzedeel = code;
                currentOmschrijving = oms;
                showView('detailView');
                viewHistory.push('detailView');
                document.getElementById('detailTitle').textContent = `Keuzedeel ${code} — ${oms}`;
                renderDetailOpleidingen();
            };
            return tr;
        });

    paginationState.overlap.data = rows;
    paginationState.overlap.page = 1;
    renderPage('overlap');
    renderPagination('overlap', rows.length);
    makeSortable('overlapTable', 'overlap');
}

// ────────────────────────────────────────────────
// Export & Print
// ────────────────────────────────────────────────
function printFullSelection() {
    const mainState = paginationState.main;
    const originalSize = mainState.size;
    const originalPage = mainState.page;

    mainState.size = 999999;
    mainState.page = 1;
    renderPage('main');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            mainState.size = originalSize;
            mainState.page = originalPage;
            renderPage('main');
        }, 100);
    }, 300);
}

function exportCurrentSelection(format) {
    if (format !== 'csv' && format !== 'json') return;

    const keuzedeelMap = {};
    currentData.forEach(r => {
        if (!keuzedeelMap[r.KWALIFICATIE]) {
            keuzedeelMap[r.KWALIFICATIE] = {
                oms: r.OMSCHRIJVING || 'Geen omschrijving',
                cohorten: new Set()
            };
        }
        keuzedeelMap[r.KWALIFICATIE].cohorten.add(r.COHORT);
    });

    const allCohorten = [...new Set(currentData.map(r => r.COHORT))].sort((a, b) => a - b);

    if (format === 'csv') {
        let csv = '\uFEFFKWALIFICATIE,OMSCHRIJVING';
        allCohorten.forEach(c => csv += `,${c}`);
        csv += '\n';

        Object.keys(keuzedeelMap).sort().forEach(k => {
            const entry = keuzedeelMap[k];
            let row = `"${k}","${entry.oms.replace(/"/g, '""')}"`;
            allCohorten.forEach(c => {
                row += entry.cohorten.has(c) ? ',✓' : ',';
            });
            csv += row + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curio_keuzedelen_per_cohort.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
    else if (format === 'json') {
        const jsonData = Object.keys(keuzedeelMap).sort().map(k => {
            const entry = keuzedeelMap[k];
            return {
                kwalificatie: k,
                omschrijving: entry.oms,
                cohorten: [...entry.cohorten].sort((a, b) => a - b)
            };
        });

        const json = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curio_keuzedelen.json';
        a.click();
        URL.revokeObjectURL(url);
    }
}

document.getElementById('exportCsvBtn').onclick       = () => exportCurrentSelection('csv');
document.getElementById('exportJsonBtn').onclick      = () => exportCurrentSelection('json');
document.getElementById('exportCsvDetailBtn').onclick = () => exportCurrentSelection('csv');
document.getElementById('exportJsonDetailBtn').onclick= () => exportCurrentSelection('json');
document.getElementById('exportCsvOverlapBtn').onclick= () => exportCurrentSelection('csv');
document.getElementById('exportJsonOverlapBtn').onclick= () => exportCurrentSelection('json');
document.getElementById('exportCsvExpiredDetailBtn').onclick = () => exportCurrentSelection('csv');
document.getElementById('exportJsonExpiredDetailBtn').onclick= () => exportCurrentSelection('json');

// ────────────────────────────────────────────────
// Pagination & Sortable
// ────────────────────────────────────────────────
function renderPagination(key, total) {
    const state = paginationState[key];
    const container = document.getElementById(key + 'Pagination');
    if (total <= state.size) {
        container.innerHTML = '';
        return;
    }

    const pages = Math.ceil(total / state.size);
    const start = (state.page - 1) * state.size + 1;
    const end = Math.min(state.page * state.size, total);

    let html = `<div class="pagination-info">Toon ${start}–${end} van ${total}</div>`;
    html += `<div><label>Rijen: <select class="form-select form-select-sm d-inline-block w-auto page-size">`;
    pageSizes.forEach(n => html += `<option ${n===state.size?'selected':''}>${n}</option>`);
    html += `</select></label> <nav class="d-inline-block ms-3"><ul class="pagination pagination-sm mb-0">`;
    html += `<li class="page-item ${state.page<2?'disabled':''}"><a class="page-link" href="#" data-page="${state.page-1}">Vorige</a></li>`;
    for (let i = 1; i <= pages; i++) {
        html += `<li class="page-item ${i===state.page?'active':''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${state.page>=pages?'disabled':''}"><a class="page-link" href="#" data-page="${state.page+1}">Volgende</a></li></ul></nav></div>`;
    container.innerHTML = html;

    container.querySelector('.page-size').onchange = e => {
        state.size = +e.target.value;
        state.page = 1;
        renderPage(key);
        renderPagination(key, total);
    };

    container.querySelectorAll('.page-link').forEach(a => {
        a.onclick = e => {
            e.preventDefault();
            const p = +a.dataset.page;
            if (p > 0 && p <= pages && p !== state.page) {
                state.page = p;
                renderPage(key);
                renderPagination(key, total);
            }
        };
    });
}

function renderPage(key) {
    const state = paginationState[key];
    const tbodyMap = {
        main: 'kwalificatiesTable',
        overlap: 'overlapTableBody',
        detail: 'detailTableBody',
        availability: 'availabilityBody',
        expired: 'expiredTableBody',
        expiredDetail: 'expiredDetailTableBody'
    };
    const tbody = document.getElementById(tbodyMap[key]);
    if (!tbody) return;

    tbody.innerHTML = '';
    state.data.slice((state.page-1)*state.size, state.page*state.size)
        .forEach(row => tbody.appendChild(row));
}

function makeSortable(tableId, stateKey) {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.querySelectorAll('th.sortable').forEach((th, colIndex) => {
        th.onclick = () => {
            const asc = !th.classList.contains('sort-asc');
            table.querySelectorAll('th.sortable').forEach(h => h.classList.remove('sort-asc','sort-desc'));
            th.classList.add(asc ? 'sort-asc' : 'sort-desc');

            const rows = [...paginationState[stateKey].data];
            rows.sort((a, b) => {
                let va = a.cells[colIndex].innerText.trim();
                let vb = b.cells[colIndex].innerText.trim();

                if (stateKey === 'expired' && colIndex === 2) {
                    const parseDate = str => {
                        const [dd, mm, yyyy] = str.split('-').map(Number);
                        return new Date(yyyy, mm - 1, dd);
                    };
                    const dateA = parseDate(va);
                    const dateB = parseDate(vb);
                    if (!isNaN(dateA) && !isNaN(dateB)) {
                        return asc ? dateA - dateB : dateB - dateA;
                    }
                }

                const numA = parseFloat(va);
                const numB = parseFloat(vb);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return asc ? numA - numB : numB - numA;
                }

                return asc ? va.localeCompare(vb) : vb.localeCompare(va);
            });

            paginationState[stateKey].data = rows;
            paginationState[stateKey].page = 1;
            renderPage(stateKey);
            renderPagination(stateKey, rows.length);
        };
    });
}