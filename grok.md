# Handleiding voor Grok: Structuur en Bestanden van de Curio Keuzedelen Explorer App

Deze handleiding is speciaal voor jou (Grok) geschreven, om je te helpen bij het analyseren en adviseren over wijzigingen in de applicatie. Wanneer de gebruiker je vraagt om functionaliteit te wijzigen, voeg ik deze handleiding toe aan de query. Jij moet dan **op basis van de beschreven structuur** bepalen welke bestanden (.html, .js of .css) betrokken zijn bij de wijziging. 

### Belangrijke Richtlijnen voor Jou (Grok)
- **Stap-voor-stap redenering**: Wanneer een wijziging gevraagd wordt, redeneer je eerst: 
  1. Wat is de wijziging precies? (Bijv. "Voeg een nieuwe filter toe" of "Verander de grafiek in trends").
  2. Welke onderdelen van de app raken dit? (Bijv. UI, data laden, filters, tabellen renderen).
  3. Welke bestanden zijn relevant op basis van deze handleiding?
- **Output structuur**: Geef een lijst met betrokken bestanden, met korte uitleg waarom. Bijv.:
  - `index.html`: Voor het toevoegen van een nieuw filter-element in de HTML.
  - `js/filters.js`: Voor het updaten van de filter-logica.
  - `css/styles.css`: Voor styling van het nieuwe element.
- **Assumpties**: 
  - Focus alleen op code-bestanden: `index.html`, `css/styles.css`, en de JS-modules.
  - Als een wijziging meerdere views of functionaliteiten raakt, noem alle relevante bestanden.
  - Ald je een bestand wijzigt geef je altijd het volledige bestand terug in een code venster.
  - Als iets niet duidelijk past, zeg dat en stel voor om te verduidelijken.
  - Gebruik geen tools tenzij expliciet nodig voor de wijziging (bijv. code_execution om te testen).
- **Niet wijzigen**: Deze handleiding zelf niet wijzigen; baseer je advies puur hierop.

### Algemene App Structuur
- **Taal/Tech**: HTML5, Bootstrap 5, Chart.js, JavaScript (ES modules).
- **Entry Point**: `index.html` laadt alle views en scripts. Het gebruikt `<script type="module" src="js/main.js"></script>` om de JS te starten.
- **Globale State**: Veel logica gebruikt `window.appState` (bijv. data, views, pagination).
- **Views**: De app heeft meerdere "views" (divs met ID's zoals `mainView`, `statsView`), die met `display: block/none` geschakeld worden.
- **Data Bronnen**: JSON-bestanden in `data/` (niet te wijzigen code, maar laad-logica zit in JS).
- **Afhankelijkheden**: Externe libs via CDN (Bootstrap, Chart.js, Bootstrap Multiselect) – wijzigingen hier raken `index.html`.

### Bestanden Overzicht
Hieronder een gedetailleerde breakdown per bestand: wat het doet, welke functionaliteiten het beheert, en voorbeelden van wijzigingen die het raken.

#### 1. `index.html` (Hoofd HTML-bestand)
   - **Beschrijving**: Bevat de volledige HTML-structuur, inclusief alle views (divs), knoppen, tabellen, canvassen voor charts, en form-elementen (filters, search). Laadt CSS en JS via links/scripts.
   - **Belangrijke Onderdelen**:
     - Hoofdview (`mainView`): Filters, knoppen (export, stats, etc.), hoofd-tabel.
     - Stats view (`statsView`): Stats-kaarten, top-10 lijst.
     - Trends view (`trendsView`): Charts (uniqueKeuzChart, newKeuzChart), beschikbaarheidstabel.
     - Overlap view (`overlapView`): Overlap-tabel.
     - Expired view (`expiredView`): Vervallen keuzedelen-tabel.
     - Detail views (`detailView`, `expiredDetailView`, `sbbDetailView`): Detail-tabellen en info.
     - Loading/alerts, print/export knoppen.
   - **Wanneer wijzigen?**:
     - Nieuwe UI-elementen toevoegen (bijv. extra knop, filter, tabel-kolom).
     - Bestaande HTML aanpassen (bijv. titels, labels, class-namen voor styling).
     - Externe libs toevoegen/veranderen (CDN links).
   - **Voorbeelden**: Toevoegen van een nieuw filter → voeg <select> toe in mainView. Verander layout van een view → pas div/structuur aan.

#### 2. `css/styles.css` (Styling)
   - **Beschrijving**: Bevat custom CSS voor de app, bovenop Bootstrap. Definieert klassen zoals `.page-card`, `.stat-card`, `.chart-container`, `.available`/`not-available` (voor tabellen), `.orange-row` (voor expired items), pagination-stijlen, etc.
   - **Belangrijke Onderdelen**:
     - Layout: Containers, headers, grids.
     - Tabellen: Hover, sortable headers, icons.
     - Charts: Container sizing.
     - Alerts/Loading: Kleuren en positioning.
   - **Wanneer wijzigen?**:
     - Styling aanpassen (kleuren, fonts, margins, responsive design).
     - Nieuwe klassen toevoegen voor nieuwe UI-elementen.
     - Theming (bijv. dark mode).
   - **Voorbeelden**: Maak tabellen responsive → pas table-responsive aan. Voeg animaties toe → nieuwe CSS-regels.

#### 3. `js/main.js` (Entry Point)
   - **Beschrijving**: Start de app, laadt data, initialiseert event listeners, en importeert alle andere JS-modules. Definieert `window.appState`.
   - **Belangrijke Onderdelen**:
     - DOMContentLoaded handler: Laad data, populate filters, render initieel.
     - Init event listeners (via `events.js`).
   - **Wanneer wijzigen?**:
     - Globale initialisatie veranderen (bijv. nieuwe globals toevoegen).
     - Import-volgorde of entry-logica aanpassen.
   - **Voorbeelden**: Voeg een nieuwe module toe → import hier. Verander startup-flow.

#### 4. `js/data.js` (Data Ophalen)
   - **Beschrijving**: Haalt JSON-data op via fetch, vult lookups (aardenLookup, overlapSet, sectorkamerLookup).
   - **Belangrijke Onderdelen**:
     - `loadAllData()`: Promise.all voor JSON-files, error handling.
   - **Wanneer wijzigen?**:
     - Nieuwe data-bronnen toevoegen (bijv. extra JSON).
     - Lookup-logica aanpassen (bijv. nieuwe mappings).
   - **Voorbeelden**: Voeg een nieuw JSON-bestand toe → update fetch-lijst.

#### 5. `js/filters.js` (Filters & Zoeken)
   - **Beschrijving**: Handelt filter-logica, populate dropdowns, apply/reset filters.
   - **Belangrijke Onderdelen**:
     - `applyFilters()`: Filter currentData op basis van selecties/search.
     - `populateFilters()`: Vul dropdowns dynamisch.
     - `resetAndApplyFilters()`: Wis filters.
   - **Wanneer wijzigen?**:
     - Nieuwe filters toevoegen (bijv. extra select).
     - Filter-criteria veranderen (bijv. nieuwe velden).
   - **Voorbeelden**: Voeg search op sectorkamer toe → update applyFilters.

#### 6. `js/ui.js` (View Switching & Teksten)
   - **Beschrijving**: Schakelt views, beheert viewHistory, update selectie-teksten.
   - **Belangrijke Onderdelen**:
     - `showView()`, `showViewWithHistory()`: Display toggle.
     - `handleBackButton()`: Navigatie terug.
     - `updateCurrentSelection()`, `updateSelectionText()`: Filter-teksten updaten.
   - **Wanneer wijzigen?**:
     - Nieuwe views toevoegen.
     - Navigatie-logica veranderen (bijv. extra back-buttons).
   - **Voorbeelden**: Voeg een nieuwe view toe → update views-array en showView.

#### 7. `js/events.js` (Event Listeners)
   - **Beschrijving**: Initialiseert alle event listeners (knoppen, filters, etc.).
   - **Belangrijke Onderdelen**:
     - `initEventListeners()`: Click handlers voor navigatie, export, filters.
   - **Wanneer wijzigen?**:
     - Nieuwe events toevoegen (bijv. voor nieuwe knop).
     - Bestaande handlers aanpassen.
   - **Voorbeelden**: Voeg click op nieuwe knop toe → update initEventListeners.

#### 8. `js/tables.js` (Tabellen Renderen)
   - **Beschrijving**: Render alle tabellen en detail-views, inclusief stats en overlap.
   - **Belangrijke Onderdelen**:
     - `renderKwalificaties()`: Hoofd-tabel.
     - `updateExpiredPage()`, `renderDetailOpleidingen()`, etc.: Specifieke tabellen.
     - `renderSbbDetail()`: SBB info-tabel.
     - `updateStatisticsPage()`, `updateOverlapPage()`: Stats en overlap logica.
   - **Wanneer wijzigen?**:
     - Tabel-structuur veranderen (bijv. extra kolommen).
     - Render-logica aanpassen (bijv. nieuwe iconen, sortering).
   - **Voorbeelden**: Voeg overlap-detail toe → update updateOverlapPage.

#### 9. `js/charts.js` (Charts & Trends)
   - **Beschrijving**: Creëert en update Chart.js instanties voor trends.
   - **Belangrijke Onderdelen**:
     - `updateTrendsPage()`: Bereken unique/new counts, maak charts, render beschikbaarheidstabel.
   - **Wanneer wijzigen?**:
     - Nieuwe charts toevoegen.
     - Trends-berekeningen veranderen (bijv. extra metrics).
   - **Voorbeelden**: Verander chart-type → update Chart config.

#### 10. `js/pagination.js` (Paginatie & Sortering)
    - **Beschrijving**: Handelt paginatie, rendering van pages, sortable tabellen.
    - **Belangrijke Onderdelen**:
      - `renderPagination()`, `renderPage()`: Paginatie controls.
      - `makeSortable()`: Sorteer-logica voor tabellen.
    - **Wanneer wijzigen?**:
      - Paginatie-opties aanpassen (bijv. page sizes).
      - Sorteer-criteria veranderen (bijv. custom parsers).
    - **Voorbeelden**: Voeg infinite scroll toe → herschrijf renderPage.

#### 11. `js/export.js` (Export & Print)
    - **Beschrijving**: Handelt CSV/JSON export en print-functionaliteit.
    - **Belangrijke Onderdelen**:
      - `printFullSelection()`: Print hele selectie.
      - `exportCurrentSelection()`: Genereer CSV/JSON blobs.
    - **Wanneer wijzigen?**:
      - Nieuwe export-formaten toevoegen (bijv. PDF).
      - Export-data veranderen (bijv. extra velden).
    - **Voorbeelden**: Voeg Excel-export toe → update exportCurrentSelection.

### Voorbeeld Gebruik van deze Handleiding
Als gebruiker vraagt: "Voeg een nieuw filter voor sectorkamer toe."
- Redeneer: Raakt filters (logica/populate/apply), UI (nieuw select in HTML), event listeners (change event), mogelijk CSS (styling).
- Advies: `index.html` (voeg <select> toe), `js/filters.js` (update populate/apply), `js/events.js` (add change listener), `css/styles.css` (styling).