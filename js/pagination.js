// js/pagination.js

const pageSizes = [10, 25, 50, 100];

export function renderPagination(key, total) {
    const state = (appState.pagination || {})[key];
    if (!state) return;

    const container = document.getElementById(key + 'Pagination');
    if (!container) return;

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

export function renderPage(key) {
    const state = (appState.pagination || {})[key];
    if (!state) return;

    const tbodyMap = {
        main:           'kwalificatiesTable',
        overlap:        'overlapTableBody',
        detail:         'detailTableBody',
        availability:   'availabilityBody',
        expired:        'expiredTableBody',
        expiredDetail:  'expiredDetailTableBody'
    };

    const tbodyId = tbodyMap[key];
    if (!tbodyId) return;

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = '';
    const slice = state.data.slice((state.page-1)*state.size, state.page*state.size);
    slice.forEach(row => tbody.appendChild(row));
}

export function makeSortable(tableId, stateKey) {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.querySelectorAll('th.sortable').forEach((th, colIndex) => {
        th.onclick = () => {
            const asc = !th.classList.contains('sort-asc');
            table.querySelectorAll('th.sortable').forEach(h => h.classList.remove('sort-asc','sort-desc'));
            th.classList.add(asc ? 'sort-asc' : 'sort-desc');

            const rows = [...(appState.pagination?.[stateKey]?.data || [])];

            rows.sort((a, b) => {
                let va = a.cells[colIndex].innerText.trim();
                let vb = b.cells[colIndex].innerText.trim();

                // Speciale datum sortering voor vervallen tabel
                if (stateKey === 'expired' && colIndex === 2) {
                    const parseDate = str => {
                        const [dd, mm, yyyy] = str.split('-').map(Number);
                        return new Date(yyyy, mm - 1, dd);
                    };
                    const da = parseDate(va);
                    const db = parseDate(vb);
                    if (!isNaN(da) && !isNaN(db)) {
                        return asc ? da - db : db - da;
                    }
                }

                const na = parseFloat(va);
                const nb = parseFloat(vb);
                if (!isNaN(na) && !isNaN(nb)) {
                    return asc ? na - nb : nb - na;
                }

                return asc ? va.localeCompare(vb) : vb.localeCompare(va);
            });

            appState.pagination[stateKey].data = rows;
            appState.pagination[stateKey].page = 1;

            renderPage(stateKey);
            renderPagination(stateKey, rows.length);
        };
    });
}