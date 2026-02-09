// js/data.js

export async function loadAllData() {
    const files = [
        'data/keuzedelen_curio.json',
        'data/keuzedelen_sbb.json',
        'data/aard.json',
        'data/overlapchecks.json',
        'data/sectorkamer.json'
    ];

    const responses = await Promise.all(files.map(f => fetch(f)));
    const jsons = await Promise.all(responses.map(r => {
        if (!r.ok) throw new Error(`${r.url} niet gevonden`);
        return r.json();
    }));

    const [curioJson, sbbJson, aardJson, overlapJson, sectorkamerJson] = jsons;

    // Hoofddata
    appState.rawData = curioJson.Keuzedelen_clean || [];
    appState.currentData = [...appState.rawData];
    appState.sbbData = sbbJson.keuzedelen || [];

    // Aarden lookup
    if (aardJson?.aardenkeuzedeel) {
        aardJson.aardenkeuzedeel.forEach(item => {
            appState.aardenLookup[item.nr] = item.titel;
        });
    }

// In loadAllData(), na het laden van overlapJson:
if (overlapJson?.overlap) {
    // console.log('Na laden overlapJson:', overlapJson);
	appState.overlapData = overlapJson?.overlap || [];
	// console.log('overlapData lengte:', appState.overlapData.length);

    // Maak een snellere lookup: Map<kwalificatie, Set<crebo's met overlap Ja>>
    appState.overlapCreboByKwal = new Map();
    overlapJson.overlap.forEach(item => {
        if (item.overlap === "Ja") {
            if (!appState.overlapCreboByKwal.has(item.Kwalificatie)) {
                appState.overlapCreboByKwal.set(item.Kwalificatie, new Set());
            }
            appState.overlapCreboByKwal.get(item.Kwalificatie).add(String(item.Crebo));
        }
    });
} else {
    appState.overlapData = [];
    appState.overlapCreboByKwal = new Map();
}

    // Sectorkamer lookup
    if (Array.isArray(sectorkamerJson)) {
        sectorkamerJson.forEach(k => {
            if (k.nr) appState.sectorkamerLookup[k.nr] = k.titel || `Sectorkamer ${k.nr}`;
        });
    } else if (sectorkamerJson && typeof sectorkamerJson === 'object') {
        Object.entries(sectorkamerJson).forEach(([nr, kamer]) => {
            appState.sectorkamerLookup[nr] = kamer.titel || `Sectorkamer ${nr}`;
        });
    }
}