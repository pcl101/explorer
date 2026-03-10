// js/ui.js

const views = [
    'mainView', 'statsView', 'trendsView', 'overlapView',
    'expiredView', 'detailView', 'expiredDetailView', 'sbbDetailView',
    'overlapDetailView'
];

export function showView(viewId) {
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? 'block' : 'none';
    });
    appState.currentView = viewId;
}

export function showViewWithHistory(viewId, afterShowCallback = null) {
    showView(viewId);
    appState.viewHistory.push(viewId);
    updateSelectionText();
    if (afterShowCallback) afterShowCallback();
}

export function handleBackButton(btn) {
    if (btn.hasAttribute('data-return')) {
        const target = btn.getAttribute('data-return');
        showView(target);
        const idx = appState.viewHistory.lastIndexOf(target);
        if (idx !== -1) appState.viewHistory = appState.viewHistory.slice(0, idx + 1);
    } else {
        appState.viewHistory.pop();
        showView(appState.viewHistory[appState.viewHistory.length - 1] || 'mainView');
    }
}

export function updateCurrentSelection() {
    const vals = ['sectorFilter','leerwegFilter','cohortFilter','opleidingFilter'].map(id => {
        const el = document.getElementById(id);
        const v = el?.value;
        if (!v) return `alle ${id.replace('Filter','').toLowerCase()}en`;
        return id === 'cohortFilter' ? `cohort ${v}` : v;
    });

    const text = `Huidige filters: ${vals.join(', ')}`;
    document.getElementById('currentSelection').textContent = text;
}

export function updateSelectionText() {
    const text = document.getElementById('currentSelection')?.textContent?.replace('Huidige filters: ', '') || '';
    document.querySelectorAll(
        '#statsSelectionText, #trendsSelectionText, #overlapSelectionText, ' +
        '#expiredSelectionText, #detailSelectionText, #expiredDetailSelectionText, ' +
        '#overlapDetailSelectionText, #expiredDetailSelectionText'
    ).forEach(el => el.textContent = text);
}