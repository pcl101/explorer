// js/charts.js

import { renderPage, renderPagination, makeSortable } from './pagination.js';

export function updateTrendsPage() {
    const cohorts = [...new Set(appState.currentData.map(r => r.COHORT))].sort((a,b)=>a-b);

    // Aantal unieke keuzedelen per cohort
    const unique = cohorts.map(c => 
        new Set(appState.currentData.filter(r => r.COHORT === c).map(r => r.KWALIFICATIE)).size
    );

    // Nieuwe keuzedelen per cohort
    const newCounts = [];
    let seen = new Set();
    cohorts.forEach(c => {
        const curr = new Set(appState.currentData.filter(r => r.COHORT === c).map(r => r.KWALIFICATIE));
        newCounts.push([...curr].filter(x => !seen.has(x)).length);
        seen = new Set([...seen, ...curr]);
    });

    // Vernietig oude charts als ze bestaan
    if (appState.uniqueKeuzChart) appState.uniqueKeuzChart.destroy();
    if (appState.newKeuzChart) appState.newKeuzChart.destroy();

    appState.uniqueKeuzChart = new Chart(document.getElementById('uniqueKeuzChart'), {
        type: 'line',
        data: {
            labels: cohorts,
            datasets: [{
                label: 'Unieke keuzedelen',
                data: unique,
                borderColor: 'rgb(75,192,192)',
                tension: 0.1
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });

    appState.newKeuzChart = new Chart(document.getElementById('newKeuzChart'), {
        type: 'bar',
        data: {
            labels: cohorts,
            datasets: [{
                label: 'Nieuwe keuzedelen',
                data: newCounts,
                backgroundColor: 'rgb(153,102,255)'
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });

    // ────────────────────────────────────────────────
    // Top 10 beschikbaarheidstabel – met koppen gefixt
    // ────────────────────────────────────────────────
    const top10Map = {};
    appState.currentData.forEach(r => {
        if (!top10Map[r.KWALIFICATIE]) {
            top10Map[r.KWALIFICATIE] = { count: 0, oms: r.OMSCHRIJVING || 'Geen omschrijving' };
        }
        top10Map[r.KWALIFICATIE].count++;
    });

    const top10 = Object.entries(top10Map)
        .sort((a,b) => b[1].count - a[1].count)
        .slice(0,10)
        .map(([code, info]) => ({ code, oms: info.oms }));

    // Header vullen
    const header = document.getElementById('availabilityHeader');
    if (header) {
        let headerHTML = '<tr>';
        headerHTML += '<th class="sortable text-start" style="min-width: 120px;">Keuzedeel</th>';
        headerHTML += '<th class="sortable text-start" style="min-width: 320px;">Omschrijving</th>';
        cohorts.forEach(c => {
            headerHTML += `<th class="sortable text-center">${c}</th>`;
        });
        headerHTML += '</tr>';
        header.innerHTML = headerHTML;
    } else {
        console.error('Header niet gevonden!');
    }

    // Body vullen
    const tbody = document.getElementById('availabilityBody');
    if (tbody) {
        tbody.innerHTML = '';

        if (top10.length === 0 || cohorts.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${cohorts.length + 2}" class="text-center text-muted py-4">Geen data beschikbaar</td>`;
            tbody.appendChild(tr);
        } else {
            top10.forEach(item => {
                const tr = document.createElement('tr');
                let rowHTML = `
                    <td class="text-start fw-bold">${item.code}</td>
                    <td class="text-start">${item.oms}</td>
                `;
                cohorts.forEach(c => {
                    const available = appState.currentData.some(r => r.COHORT === c && r.KWALIFICATIE === item.code);
                    rowHTML += `
                        <td class="text-center ${available ? 'available' : 'not-available'}">
                            ${available ? '✓' : '—'}
                        </td>
                    `;
                });
                tr.innerHTML = rowHTML;
                tbody.appendChild(tr);
            });
        }

        console.log('Top-10 tabel bijgewerkt:', tbody.querySelectorAll('tr').length, 'rijen');
    } else {
        console.error('tbody niet gevonden!');
    }

    makeSortable('availabilityTable', 'availability');
}