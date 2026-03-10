// js/export.js

import { renderPage, renderPagination } from './pagination.js';

export function printFullSelection() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('jsPDF kon niet geladen worden. Controleer de console voor fouten.');
        console.error('jsPDF niet beschikbaar');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Bepaal welke data te printen op basis van huidige view
    let dataToPrint;
    let viewTitle;
    let countText;
    
    const view = appState.currentView;
    
    if (view === 'expiredView' && appState.expiredData) {
        dataToPrint = appState.expiredData;
        viewTitle = 'Vervallen Keuzedelen';
        countText = `${dataToPrint.length} vervallen keuzedelen`;
    } else if (view === 'overlapView' && appState.overlapExportData) {
        // Overlap view: SECTOREN bevat sector informatie
        dataToPrint = appState.overlapExportData.map(d => ({
            KWALIFICATIE: d.KWALIFICATIE,
            OMSCHRIJVING: d.OMSCHRIJVING,
            COHORT: d.SECTOREN
        }));
        viewTitle = 'Spreiding Keuzedelen';
        countText = `${dataToPrint.length} keuzedelen met spreiding`;
    } else {
        dataToPrint = appState.currentData;
        viewTitle = 'Huidige Selectie';
        const resultCountElem = document.getElementById('resultCount');
        countText = resultCountElem ? resultCountElem.innerText.trim().replace(/[()]/g, '') : '';
    }

    // Header informatie
    const selectionTextElem = document.getElementById('currentSelection');
    const selectionText = selectionTextElem ? selectionTextElem.innerText.trim() : 'Huidige selectie';

    doc.setFontSize(16);
    doc.text(`Curio Keuzedelen Explorer - ${viewTitle}`, 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(selectionText, 14, 22);
    if (countText) {
        doc.text(`Aantal: ${countText}`, 14, 28);
    }
    doc.text(`gegenereerd op: ${new Date().toLocaleString('nl-NL')}`, 14, countText ? 34 : 28);

    doc.line(14, countText ? 38 : 32, 280, countText ? 38 : 32);

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

    // Bepaal welke data te exporteren op basis van huidige view
    let dataToExport;
    let filename;
    
    const view = appState.currentView;
    
    if (view === 'expiredView' && appState.expiredData) {
        // Expired view: gebruik opgeslagen expired data
        // Let op: vervaldatum is geen cohort, dus we slaan het over voor cohort filtering
        dataToExport = appState.expiredData.map(item => ({
            KWALIFICATIE: item.code,
            OMSCHRIJVING: item.omschrijving,
            COHORT: item.vervaldatum, // Dit is eigenlijk een datum, niet een cohort
            VERVALDATUM: item.vervaldatum
        }));
        filename = 'curio_vervallen_keuzedelen';
    } else if (view === 'overlapView' && appState.overlapExportData) {
        // Overlap view: gebruik opgeslagen overlap data
        // SECTOREN bevat sector informatie, niet cohorten
        dataToExport = appState.overlapExportData.map(item => ({
            KWALIFICATIE: item.KWALIFICATIE,
            OMSCHRIJVING: item.OMSCHRIJVING,
            SECTOREN: item.SECTOREN,
            COHORT: item.SECTOREN // Gebruik sectoren als "cohort" vervanger voor compatibiliteit
        }));
        filename = 'curio_spreiding_keuzedelen';
    } else {
        // Hoofdview of andere views: gebruik gefilterde data
        dataToExport = appState.currentData;
        filename = 'curio_keuzedelen_per_cohort';
    }

    const keuzedeelMap = {};
    dataToExport.forEach(r => {
        const key = r.KWALIFICATIE;
        if (!keuzedeelMap[key]) {
            keuzedeelMap[key] = {
                oms: r.OMSCHRIJVING || 'Geen omschrijving',
                cohorten: new Set()
            };
        }
        if (r.COHORT) keuzedeelMap[key].cohorten.add(r.COHORT);
    });

    const allCohorten = [...new Set(dataToExport.map(r => r.COHORT).filter(Boolean))].sort((a,b)=>a-b);

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

        downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
    }
    else if (format === 'json') {
        const jsonData = Object.keys(keuzedeelMap).sort().map(k => ({
            kwalificatie: k,
            omschrijving: keuzedeelMap[k].oms,
            cohorten: [...keuzedeelMap[k].cohorten].sort((a,b)=>a-b)
        }));

        const json = JSON.stringify(jsonData, null, 2);
        downloadBlob(json, `${filename}.json`, 'application/json');
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