// js/export.js

import { renderPage, renderPagination } from './pagination.js';

export function printFullSelection() {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('jsPDF kon niet geladen worden. Controleer de console voor fouten.');
            console.error('jsPDF niet beschikbaar');
            return;
        }

        // Bepaal welke data te gebruiken op basis van huidige view
        let dataToPrint;
        let viewTitle = 'Huidige Selectie';
        
        const view = appState.currentView;
        
        // Bereken overlap data opnieuw als we op overlapView zijn
        if (view === 'overlapView') {
            const currentSet = new Set(appState.currentData.map(r => r.KWALIFICATIE));
            const overlap = {};
            appState.rawData.forEach(r => {
                if (!currentSet.has(r.KWALIFICATIE)) return;
                if (!overlap[r.KWALIFICATIE]) {
                    overlap[r.KWALIFICATIE] = { omschrijving: r.OMSCHRIJVING || 'Onbekend', sectoren: new Set() };
                }
                overlap[r.KWALIFICATIE].sectoren.add(r.SECTOR);
            });
            // Alleen keuzedelen met spreiding (meer dan 1 sector)
            const overlapEntries = Object.entries(overlap).filter(([,v]) => v.sectoren.size > 1);
            dataToPrint = overlapEntries.map(([code, data]) => ({
                KWALIFICATIE: code,
                OMSCHRIJVING: data.omschrijving,
                COHORT: [...data.sectoren].join(', ')
            }));
            viewTitle = 'Spreiding';
        } else {
            dataToPrint = appState.currentData;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Header informatie
        const selectionTextElem = document.getElementById('currentSelection');
        const selectionText = selectionTextElem ? selectionTextElem.innerText.trim() : 'Huidige selectie';

        const resultCountElem = document.getElementById('resultCount');
        const resultCountText = resultCountElem ? resultCountElem.innerText.trim().replace(/[()]/g, '') : '';

        doc.setFontSize(16);
        doc.text(`Curio Keuzedelen Explorer - ${viewTitle}`, 14, 15);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(selectionText, 14, 22);
        if (resultCountText) {
            doc.text(`Aantal unieke keuzedelen: ${resultCountText}`, 14, 28);
        }
        doc.text(`gegenereerd op: ${new Date().toLocaleString('nl-NL')}`, 14, resultCountText ? 34 : 28);

        doc.line(14, resultCountText ? 38 : 32, 280, resultCountText ? 38 : 32);

        // Unieke keuzedelen verzamelen
        const keuzedeelMap = {};
        dataToPrint.forEach(r => {
        const key = r.KWALIFICATIE;
        if (!keuzedeelMap[key]) {
            keuzedeelMap[key] = {
                kwalificatie: key,
                omschrijving: r.OMSCHRIJVING || 'Geen omschrijving',
                cohorten: new Set()
            };
        }
        if (r.COHORT) {
            keuzedeelMap[key].cohorten.add(r.COHORT);
        }
    });

    // Sorteer op keuzedeel
    const uniqueData = Object.values(keuzedeelMap).sort((a, b) => a.kwalificatie.localeCompare(b.kwalificatie));

    // Headers
    const headers = [
        'Keuzedeel',
        'Omschrijving',
        'Beschikbaar in cohorten'
    ];

    // Body: cohorten als gesorteerde comma-gescheiden string
    const body = uniqueData.map(entry => [
        entry.kwalificatie || '',
        entry.omschrijving || '',
        [...entry.cohorten].sort((a, b) => a - b).join(', ')
    ]);

    // autoTable
    const startY = resultCountText ? 42 : 36;
    doc.autoTable({
        startY: startY,
        head: [headers],
        body: body,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', halign: 'left' },
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 110 },
            2: { cellWidth: 110 }
        },
        margin: { top: startY, left: 14, right: 14 }
    });

    // Download
    const filename = `curio_keuzedelen_selectie_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
    } catch (err) {
        console.error('PDF fout:', err);
        alert('Fout bij maken PDF: ' + err.message);
    }
}

export function printDetailSelection() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('jsPDF kon niet geladen worden. Controleer de console voor fouten.');
        console.error('jsPDF niet beschikbaar');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header informatie
    const titleElem = document.getElementById('detailTitle');
    const titleText = titleElem ? titleElem.innerText.trim() : 'Detail Keuzedeel';

    const selectionTextElem = document.getElementById('detailSelectionText');
    const selectionText = selectionTextElem ? selectionTextElem.innerText.trim() : 'Huidige selectie';

    doc.setFontSize(16);
    doc.text('Curio Keuzedelen Explorer - Detail Selectie', 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(titleText, 14, 22);
    doc.text(selectionText, 14, 28);
    doc.text(`gegenereerd op: ${new Date().toLocaleString('nl-NL')}`, 14, 34);

    doc.line(14, 38, 280, 38);

    // Unieke opleidingen verzamelen
    const opleidingMap = {};
    appState.currentData.forEach(r => {
        const key = r.CREBO; // Aangenomen veldnaam voor opleiding
        if (!opleidingMap[key]) {
            opleidingMap[key] = {
                sector: r.SECTOR || '', // Aangenomen veld
                opleiding: `${r.OPLEIDING || ''} (${key})`,
                cohorten: new Set()
            };
        }
        if (r.COHORT) {
            opleidingMap[key].cohorten.add(r.COHORT);
        }
    });

    // Sorteer op opleiding
    const uniqueData = Object.values(opleidingMap).sort((a, b) => a.opleiding.localeCompare(b.opleiding));

    // Headers
    const headers = [
        'Sector',
        'Opleiding (CREBO)',
        'Cohorten'
    ];

    // Body
    const body = uniqueData.map(entry => [
        entry.sector || '',
        entry.opleiding || '',
        [...entry.cohorten].sort((a, b) => a - b).join(', ')
    ]);

    // autoTable
    doc.autoTable({
        startY: 42,
        head: [headers],
        body: body,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', halign: 'left' },
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 120 },
            2: { cellWidth: 80 }
        },
        margin: { top: 42, left: 14, right: 14 }
    });

    // Download
    const filename = `curio_keuzedelen_detail_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}

export function printExpiredDetailSelection() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('jsPDF kon niet geladen worden. Controleer de console voor fouten.');
        console.error('jsPDF niet beschikbaar');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header informatie
    const titleElem = document.getElementById('expiredDetailTitle');
    const titleText = titleElem ? titleElem.innerText.trim() : 'Detail Vervallen Keuzedeel';

    const selectionTextElem = document.getElementById('expiredDetailSelectionText');
    const selectionText = selectionTextElem ? selectionTextElem.innerText.trim() : 'Huidige selectie';

    doc.setFontSize(16);
    doc.text('Curio Keuzedelen Explorer - Vervallen Detail Selectie', 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(titleText, 14, 22);
    doc.text(selectionText, 14, 28);
    doc.text(`gegenereerd op: ${new Date().toLocaleString('nl-NL')}`, 14, 34);

    doc.line(14, 38, 280, 38);

    // Unieke opleidingen verzamelen (zelfde als detail)
    const opleidingMap = {};
    appState.currentData.forEach(r => {
        const key = r.CREBO;
        if (!opleidingMap[key]) {
            opleidingMap[key] = {
                sector: r.SECTOR || '',
                opleiding: `${r.OPLEIDING || ''} (${key})`,
                cohorten: new Set()
            };
        }
        if (r.COHORT) {
            opleidingMap[key].cohorten.add(r.COHORT);
        }
    });

    // Sorteer op opleiding
    const uniqueData = Object.values(opleidingMap).sort((a, b) => a.opleiding.localeCompare(b.opleiding));

    // Headers
    const headers = [
        'Sector',
        'Opleiding (CREBO)',
        'Cohorten'
    ];

    // Body
    const body = uniqueData.map(entry => [
        entry.sector || '',
        entry.opleiding || '',
        [...entry.cohorten].sort((a, b) => a - b).join(', ')
    ]);

    // autoTable
    doc.autoTable({
        startY: 42,
        head: [headers],
        body: body,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', halign: 'left' },
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 120 },
            2: { cellWidth: 80 }
        },
        margin: { top: 42, left: 14, right: 14 }
    });

    // Download
    const filename = `curio_keuzedelen_expired_detail_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}

export function printOverlapDetailSelection() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('jsPDF kon niet geladen worden. Controleer de console voor fouten.');
        console.error('jsPDF niet beschikbaar');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header informatie
    const titleElem = document.getElementById('overlapDetailTitle');
    const titleText = titleElem ? titleElem.innerText.trim() : 'Overlap Detail Keuzedeel';

    const selectionTextElem = document.getElementById('overlapDetailSelectionText');
    const selectionText = selectionTextElem ? selectionTextElem.innerText.trim() : 'Huidige selectie';

    doc.setFontSize(16);
    doc.text('Curio Keuzedelen Explorer - Overlap Detail Selectie', 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(titleText, 14, 22);
    doc.text(selectionText, 14, 28);
    doc.text(`gegenereerd op: ${new Date().toLocaleString('nl-NL')}`, 14, 34);

    doc.line(14, 38, 280, 38);

    // Data voor overlap (aangenomen uniek per CREBO)
    const body = appState.currentData.map(r => [
        r.CREBO || '',
        `${r.OPLEIDING || ''} (${r.COHORTEN || ''})`, // Aangenomen velden
        r.PUBLICATIEDATUM || ''
    ]).sort((a, b) => a[0].localeCompare(b[0]));

    // Headers
    const headers = [
        'CREBO',
        'Opleiding (cohorten)',
        'Publicatiedatum'
    ];

    // autoTable
    doc.autoTable({
        startY: 42,
        head: [headers],
        body: body,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', halign: 'left' },
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 140 },
            2: { cellWidth: 70 }
        },
        margin: { top: 42, left: 14, right: 14 }
    });

    // Download
    const filename = `curio_keuzedelen_overlap_detail_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}

export function exportCurrentSelection(format = 'csv') {
    if (!['csv', 'json'].includes(format)) return;

    const keuzedeelMap = {};
    appState.currentData.forEach(r => {
        if (!keuzedeelMap[r.KWALIFICATIE]) {
            keuzedeelMap[r.KWALIFICATIE] = {
                oms: r.OMSCHRIJVING || 'Geen omschrijving',
                cohorten: new Set()
            };
        }
        keuzedeelMap[r.KWALIFICATIE].cohorten.add(r.COHORT);
    });

    const allCohorten = [...new Set(appState.currentData.map(r => r.COHORT))].sort((a,b)=>a-b);

    if (format === 'csv') {
        let csv = '\uFEFFKWALIFICATIE,OMSCHRIJVING';
        allCohorten.forEach(c => csv += `,${c}`);
        csv += '\n';

        Object.keys(keuzedeelMap).sort().forEach(k => {
            const entry = keuzedeelMap[k];
            let row = `"${k.replace(/"/g,'""')}","${entry.oms.replace(/"/g,'""')}"`;
            allCohorten.forEach(c => {
                row += entry.cohorten.has(c) ? ',✓' : ',';
            });
            csv += row + '\n';
        });

        downloadBlob(csv, 'curio_keuzedelen_per_cohort.csv', 'text/csv;charset=utf-8;');
    }
    else if (format === 'json') {
        const jsonData = Object.keys(keuzedeelMap).sort().map(k => ({
            kwalificatie: k,
            omschrijving: keuzedeelMap[k].oms,
            cohorten: [...keuzedeelMap[k].cohorten].sort((a,b)=>a-b)
        }));

        const json = JSON.stringify(jsonData, null, 2);
        downloadBlob(json, 'curio_keuzedelen.json', 'application/json');
    }
}

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}