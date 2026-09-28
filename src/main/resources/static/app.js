/* The dashboard reads the original REST endpoints; it never changes database records. */
(() => {
  'use strict';

  const D = window.CampusData;
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const number = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  const titleCase = (key) => key === 'universities' ? 'Universities' : 'Professors';
  const routeNames = { overview: 'Overview', explorer: 'Data explorer', quality: 'Data quality', catalog: 'Dataset catalog' };
  const pageCopy = {
    overview: ['Your data, at a glance', 'A clearer view of your universities, people, and data quality.'],
    explorer: ['Make every record count', 'Search, filter, and explore the details behind your datasets.'],
    quality: ['Good insights start here', 'Understand completeness and inspect the records that need attention.'],
    catalog: ['Know your datasets', 'A simple reference for your sources, fields, and data flow.']
  };
  const state = {
    view: 'overview', dataset: 'universities', mode: new URLSearchParams(location.search).get('source') === 'live' ? 'live' : 'demo',
    data: { universities: [], professors: [] }, query: '', location: '', category: '', sortKey: 'id', sortDirection: 'asc',
    page: 1, qualityPage: 1, qualityDataset: 'all', chartDataset: 'all', loading: false, error: false, loadedAt: null
  };
  let requestController;
  let toastTimer;

  function notify(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
  }

  function resetFilters() {
    state.query = ''; state.location = ''; state.category = ''; state.sortKey = 'id'; state.sortDirection = 'asc'; state.page = 1;
  }

  function profile(key) { return D.profile(state.data[key], D.schemas[key]); }

  function combinedProfile() {
    const university = profile('universities');
    const professor = profile('professors');
    const total = university.totalCells + professor.totalCells;
    const filled = university.filledCells + professor.filledCells;
    return { total, filled, missing: total - filled, score: total ? Math.round(filled / total * 1000) / 10 : null, issues: university.issues.length + professor.issues.length };
  }

  function filteredRows() { return D.filterRows(state.data[state.dataset], D.schemas[state.dataset], state); }

  function metric(label, value, symbol, footer, featured = false, suffix = '') {
    return `<article class="metric${featured ? ' featured' : ''}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(symbol)}</span></div><div class="metric-value">${value}${suffix ? `<small>${suffix}</small>` : ''}</div><div class="metric-foot">${footer}</div></article>`;
  }

  function metrics() {
    const quality = combinedProfile();
    return `<div class="section-kicker"><h2>Workspace snapshot</h2><span>All records · current source</span></div><section class="metrics" aria-label="Dataset summary">
      ${metric('Total records', number(state.data.universities.length + state.data.professors.length), 'data', '<span class="tiny-dot"></span> Across 2 datasets', true)}
      ${metric('Universities', number(state.data.universities.length), 'university', '<span class="tag">6 fields</span> Institution dataset')}
      ${metric('Professors', number(state.data.professors.length), 'people', '<span class="tag">8 fields</span> Faculty dataset')}
      ${metric('Data completeness', quality.score === null ? '—' : number(quality.score), 'check', quality.total ? `${number(quality.missing)} missing of ${number(quality.total)} field values` : 'No field values to evaluate', false, quality.score === null ? '' : '%')}
    </section>`;
  }

  function chart() {
    const universityGroups = D.groupCounts(state.data.universities, 'location');
    const professorGroups = D.groupCounts(state.data.professors, 'city');
    const counts = new Map();
    for (const [groups, kind] of [[universityGroups, 'universities'], [professorGroups, 'professors']]) {
      if (state.chartDataset !== 'all' && state.chartDataset !== kind) continue;
      for (const group of groups) {
        if (!counts.has(group.label)) counts.set(group.label, { label: group.label, universities: 0, professors: 0 });
        counts.get(group.label)[kind] = group.count;
      }
    }
    const groups = [...counts.values()].sort((a, b) => (b.universities + b.professors) - (a.universities + a.professors) || a.label.localeCompare(b.label)).slice(0, 5);
    const max = Math.max(1, ...groups.map((group) => group.universities + group.professors));
    return `<article class="panel"><div class="panel-heading"><div><h2>Where your data lives</h2><p class="panel-description">Record distribution by city</p></div><label><span class="sr-only">Chart dataset</span><select id="chart-dataset" class="subtle-select"><option value="all"${state.chartDataset === 'all' ? ' selected' : ''}>Both datasets</option><option value="universities"${state.chartDataset === 'universities' ? ' selected' : ''}>Universities</option><option value="professors"${state.chartDataset === 'professors' ? ' selected' : ''}>Professors</option></select></label></div><div class="chart-body"><div class="chart-legend"><span class="legend-item"><i class="legend-dot"></i>Universities</span><span class="legend-item"><i class="legend-dot soft"></i>Professors</span></div><div class="bars" role="img" aria-label="${escapeHtml(groups.map((group) => `${group.label}: ${group.universities} universities, ${group.professors} professors`).join('; ') || 'No city data')}">${groups.map((group) => `<div class="bar-row"><span class="bar-label" title="${escapeHtml(group.label)}">${escapeHtml(group.label)}</span><div class="bar-track"><span class="bar-segment" style="width:${group.universities / max * 97}%"></span><span class="bar-segment soft" style="width:${group.professors / max * 97}%"></span></div><span class="bar-value">${number(group.universities + group.professors)}</span></div>`).join('') || '<div class="empty-state"><strong>No city data yet</strong></div>'}</div><p class="chart-caption">Top 5 cities · records with an empty location are excluded</p></div></article>`;
  }

  function qualityCard() {
    const quality = combinedProfile();
    return `<article class="panel"><div class="panel-heading"><div><h2>A pulse on data quality</h2><p class="panel-description">Field completeness across both datasets</p></div><a href="#quality" class="text-link" aria-label="View data quality">${icon('arrow')}</a></div><div class="quality-content"><div class="quality-ring" style="--score:${quality.score ?? 0}" role="img" aria-label="${quality.score === null ? 'No data to evaluate' : `${quality.score}% of field values are filled`}"><div class="ring-center"><strong>${quality.score === null ? '—' : number(quality.score) + '%'}</strong><span>completeness</span></div></div><div class="quality-legend"><div><span class="legend-item"><i class="legend-dot"></i>Filled values</span><strong>${number(quality.filled)}</strong></div><div><span class="legend-item"><i class="legend-dot soft"></i>Missing values</span><strong>${number(quality.missing)}</strong></div></div></div><div class="quality-footer${quality.issues ? ' warning' : ''}">${icon('check')}<span>${quality.total ? quality.issues ? `${number(quality.issues)} checks flagged. Review the details in Data quality.` : 'All completeness and validation checks passed.' : 'Add records to begin checking data quality.'}</span></div></article>`;
  }

  function options(key) {
    return D.groupCounts(state.data[state.dataset], key).sort((a, b) => a.label.localeCompare(b.label)).map((group) => `<option value="${escapeHtml(group.label)}"${group.label === (key === 'location' || key === 'city' ? state.location : state.category) ? ' selected' : ''}>${escapeHtml(group.label)}</option>`).join('');
  }

  function tablePanel() {
    const explorer = state.view === 'explorer';
    return `<section class="panel dataset-panel" aria-label="Dataset records"><div class="panel-heading"><div><h2>${explorer ? 'Explore your records' : 'A closer look at your data'}</h2><p class="panel-description">${explorer ? 'Filter any field. Select a name to inspect the full record.' : 'Browse the records behind the numbers.'}</p></div><div class="table-actions">${explorer ? '' : '<a class="text-link" href="#explorer">Open explorer ' + icon('arrow') + '</a>'}<button id="export-csv" class="button secondary">${icon('download')}Export CSV</button></div></div><div class="dataset-tabs" role="group" aria-label="Choose dataset">${['universities', 'professors'].map((key) => `<button class="dataset-tab${state.dataset === key ? ' active' : ''}" data-dataset="${key}" aria-pressed="${state.dataset === key}">${titleCase(key)} <span class="tab-count">${number(state.data[key].length)}</span></button>`).join('')}</div><div class="filter-toolbar"><label class="search-box">${icon('search')}<span class="sr-only">Search records</span><input id="record-search" type="search" autocomplete="off" placeholder="Search any field…" value="${escapeHtml(state.query)}"></label><label class="sr-only" for="location-filter">Filter by city</label><select id="location-filter"><option value="">All cities</option>${options(state.dataset === 'universities' ? 'location' : 'city')}</select><label class="sr-only" for="category-filter">Filter by ${state.dataset === 'universities' ? 'education direction' : 'department'}</label><select id="category-filter"><option value="">${state.dataset === 'universities' ? 'All directions' : 'All departments'}</option>${options(state.dataset === 'universities' ? 'education_direction' : 'department')}</select><button class="text-link reset-button" id="reset-filters"${state.query || state.location || state.category ? '' : ' hidden'}>Clear filters</button><span class="filter-count" id="filter-count"></span></div><div id="records-region"></div></section>`;
  }

  function cellValue(row, column, rowIndex) {
    const value = row[column.key];
    if (D.isMissing(value)) return '<span class="missing-cell">Missing</span>';
    if (column.key === 'name') {
      const initials = String(value).trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
      return `<button class="record-name" data-record="${rowIndex}" aria-label="View ${escapeHtml(value)}"><span class="record-avatar">${escapeHtml(initials)}</span><span>${escapeHtml(value)}</span></button>`;
    }
    if (column.key === 'id') return `<span class="row-id">#${escapeHtml(value)}</span>`;
    if (column.key === 'education_direction' || column.key === 'department') {
      const color = String(value).length % 3;
      return `<span class="category-pill${color === 1 ? ' blue' : color === 2 ? ' purple' : ''}">${escapeHtml(value)}</span>`;
    }
    return escapeHtml(value);
  }

  function renderTable() {
    const region = $('#records-region');
    if (!region) return;
    const rows = filteredRows();
    const schema = D.schemas[state.dataset];
    const shownKeys = state.view === 'explorer' ? schema.map((column) => column.key) : state.dataset === 'universities' ? ['name', 'location', 'education_direction', 'creation_year'] : ['name', 'department', 'city', 'experience'];
    const columns = shownKeys.map((key) => schema.find((column) => column.key === key));
    const pageSize = state.view === 'overview' ? 5 : 10;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    const originalIndex = new Map(state.data[state.dataset].map((row, index) => [row, index]));
    const issuesByRow = new Set(profile(state.dataset).issues.map((issue) => issue.rowIndex));
    const headers = columns.map((column) => `<th scope="col" aria-sort="${state.sortKey === column.key ? state.sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}"><button data-sort="${column.key}">${escapeHtml(column.label)}<span class="sort-symbol" aria-hidden="true">${state.sortKey === column.key ? state.sortDirection === 'asc' ? '↑' : '↓' : '↕'}</span></button></th>`).join('');
    const body = pageRows.map((row) => { const index = originalIndex.get(row); const hasIssue = issuesByRow.has(index); return `<tr>${columns.map((column) => `<td title="${escapeHtml(row[column.key] ?? 'Missing value')}">${cellValue(row, column, index)}</td>`).join('')}<td><span class="row-status${hasIssue ? ' incomplete' : ''}">${hasIssue ? 'Review' : 'Complete'}</span></td></tr>`; }).join('');
    region.innerHTML = `<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable ${titleCase(state.dataset)} table"><table><caption class="sr-only">${titleCase(state.dataset)} · ${rows.length} matching records</caption><thead><tr>${headers}<th scope="col">Quality</th></tr></thead><tbody>${body || `<tr><td colspan="${columns.length + 1}"><div class="empty-state">${icon('search')}<strong>${state.data[state.dataset].length ? 'No matching records' : 'This dataset is empty'}</strong><p>${state.data[state.dataset].length ? 'Try another search or clear your filters to see all records.' : 'The current source returned no records for this dataset.'}</p>${state.data[state.dataset].length ? '<button class="button secondary" data-action="clear-filters">Clear filters</button>' : ''}</div></td></tr>`}</tbody></table></div><div class="table-footer"><span id="results-summary" role="status">${rows.length ? `${number(start + 1)}–${number(Math.min(start + pageSize, rows.length))}` : '0'} of ${number(rows.length)} records${rows.length !== state.data[state.dataset].length ? ' · filtered' : ''}</span><div class="pagination"><button class="page-button" data-page="previous"${state.page === 1 ? ' disabled' : ''} aria-label="Previous page">← Prev</button><span class="page-number">${state.page} / ${pages}</span><button class="page-button" data-page="next"${state.page >= pages ? ' disabled' : ''} aria-label="Next page">Next →</button></div></div>`;
    $('#filter-count').textContent = `${number(rows.length)} records`;
    $('#reset-filters').hidden = !(state.query || state.location || state.category);
    $('#export-csv').disabled = !rows.length;
  }

  function lineage() {
    return `<div class="pipeline-strip" aria-label="Data flow"><span class="pipeline-label">${state.mode === 'demo' ? 'DEMO DATA FLOW' : 'DATA FLOW'}</span><span class="pipeline-step">${icon('data')}${state.mode === 'demo' ? 'Synthetic records' : 'SQL database'}</span><span class="pipeline-arrow">→</span><span class="pipeline-step">${icon('code')}${state.mode === 'demo' ? 'Local dataset' : 'Spring Boot API'}</span><span class="pipeline-arrow">→</span><span class="pipeline-step">${icon('grid')}Browser analytics</span><span class="pipeline-arrow">→</span><span class="pipeline-step">${icon('download')}CSV export</span></div>`;
  }

  function qualityView() {
    return `<div class="quality-grid">${['universities', 'professors'].map((key) => { const report = profile(key); return `<article class="panel quality-summary"><div class="quality-summary-top"><h2>${titleCase(key)}</h2><span class="dataset-icon">${icon(key === 'universities' ? 'university' : 'people')}</span></div><div class="quality-stat-line"><span>Field completeness</span><strong>${report.completeness === null ? '—' : number(report.completeness) + '%'}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${report.completeness ?? 0}%"></div></div><div class="quality-summary-foot"><span>${number(report.missingCells)} missing values</span><span>${number(report.duplicateIds)} duplicate IDs</span><span>${number(report.issues.length)} flags</span></div></article>`; }).join('')}</div><section class="panel"><div class="panel-heading"><div><h2>Records to review</h2><p class="panel-description">Transparent checks, with the original field and record.</p></div><label><span class="sr-only">Dataset to check</span><select id="quality-dataset" class="subtle-select"><option value="all">Both datasets</option><option value="universities"${state.qualityDataset === 'universities' ? ' selected' : ''}>Universities</option><option value="professors"${state.qualityDataset === 'professors' ? ' selected' : ''}>Professors</option></select></label></div><p class="quality-rules">Checks cover missing values, duplicate IDs, and numeric validity (including age, experience, and founding year). All fields count toward completeness; a missing optional field is a review flag, not a database error.</p><div id="issues-region"></div></section>`;
  }

  function renderIssues() {
    const issues = ['universities', 'professors'].filter((key) => state.qualityDataset === 'all' || key === state.qualityDataset).flatMap((key) => profile(key).issues.map((issue) => ({ ...issue, dataset: key })));
    const pages = Math.max(1, Math.ceil(issues.length / 10));
    state.qualityPage = Math.min(state.qualityPage, pages);
    const start = (state.qualityPage - 1) * 10;
    $('#issues-region').innerHTML = `<div class="table-scroll" tabindex="0" role="region" aria-label="Quality issues table"><table><caption class="sr-only">Data quality review flags</caption><thead><tr><th scope="col">Dataset</th><th scope="col">Record</th><th scope="col">Field</th><th scope="col">Check result</th></tr></thead><tbody>${issues.slice(start, start + 10).map((issue) => `<tr><td>${titleCase(issue.dataset)}</td><td><button class="text-link" data-issue-row="${issue.rowIndex}" data-issue-dataset="${issue.dataset}">${escapeHtml(state.data[issue.dataset][issue.rowIndex].name || `Row ${issue.rowIndex + 1}`)}</button></td><td><code>${escapeHtml(issue.field)}</code></td><td><span class="issue-type">${escapeHtml(issue.message)}</span></td></tr>`).join('') || '<tr><td colspan="4"><div class="empty-state">' + icon('check') + `<strong>${state.data.universities.length + state.data.professors.length ? 'No flags in this selection' : 'No records to evaluate'}</strong><p>Checks describe this snapshot and do not verify real-world accuracy.</p></div></td></tr>`}</tbody></table></div><div class="table-footer"><span role="status">${number(issues.length)} review flags · no data is changed</span><div class="pagination"><button class="page-button" data-quality-page="previous"${state.qualityPage === 1 ? ' disabled' : ''}>← Prev</button><span class="page-number">${state.qualityPage} / ${pages}</span><button class="page-button" data-quality-page="next"${state.qualityPage >= pages ? ' disabled' : ''}>Next →</button></div></div>`;
  }

  function catalogView() {
    return `<section class="catalog-grid" aria-label="Dataset schemas">${['universities', 'professors'].map((key) => `<article class="panel catalog-card"><span class="dataset-icon">${icon(key === 'universities' ? 'university' : 'people')}</span><h2>${titleCase(key)}</h2><p>${key === 'universities' ? 'Institution profiles, locations, education directions, and founding years.' : 'Faculty profiles, departments, experience, skills, and locations.'}</p><div class="catalog-meta"><span><strong>${number(state.data[key].length)}</strong> records</span><span><strong>${D.schemas[key].length}</strong> fields</span><span>Read-only API</span></div><div class="endpoint">GET /${key}</div><div class="schema-list">${D.schemas[key].map((column) => `<div class="schema-row"><code>${column.key}</code><span>${column.key === 'id' ? 'integer · primary key' : column.type === 'number' ? 'integer' : 'string'}</span></div>`).join('')}</div><button class="button secondary" data-open-dataset="${key}">Explore ${key} ${icon('arrow')}</button></article>`).join('')}</section><article class="panel catalog-note">${icon('book')}<div><h2>Two datasets. One education workspace.</h2><p>The original <code>universities</code> and <code>professors</code> tables are independent: there is no university ID on a professor record. City distributions group the existing location fields; they do not assign professors to universities. In live mode, records come from the existing Spring Boot endpoints. Filters, quality checks, and CSV exports run in your browser on the loaded snapshot.</p></div></article>${lineage()}`;
  }

  function render() {
    const [title, description] = pageCopy[state.view];
    $('#page-title').innerHTML = `${title}<span>.</span>`;
    $('#page-description').textContent = description;
    $('#breadcrumb-title').textContent = routeNames[state.view];
    document.title = `${routeNames[state.view]} — Campus`;
    document.querySelectorAll('[data-view]').forEach((link) => {
      const active = link.dataset.view === state.view;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    $('#view-content').setAttribute('aria-busy', String(state.loading));
    $('#refresh-button').disabled = state.loading;
    $('#source-select').value = state.mode;
    $('#error-banner').hidden = !state.error;
    const sample = state.mode === 'demo';
    $('#sidebar-source').textContent = state.loading ? 'Loading data…' : state.error ? 'Connection unavailable' : sample ? 'Sample data ready' : 'Database connected';
    $('#sidebar-detail').textContent = sample ? 'Local demo · 2 datasets' : 'SQL database · read-only view';
    $('#source-notice').innerHTML = `<span class="notice-label">${sample ? 'DEMO' : 'LIVE'}</span><span>${sample ? 'Synthetic education data for exploration. Switch to <strong>Live database</strong> to use your application records.' : 'Database records via your Spring Boot API. Analytics reflect the latest loaded snapshot.'}</span><span class="snapshot" id="snapshot-time">${state.loadedAt && !state.loading && !state.error ? 'Loaded ' + state.loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</span>`;
    if (state.loading) { $('#view-content').innerHTML = '<div class="loading-state" role="status"><span class="spinner"></span>Loading your datasets…</div>'; return; }
    if (state.error) { $('#view-content').innerHTML = '<div class="panel empty-state">' + icon('data') + '<strong>Your live workspace is waiting</strong><p>Start the Spring Boot application with a reachable PostgreSQL database, then refresh. You can also explore the demo dataset.</p><button class="button secondary" data-action="retry">Retry connection</button></div>'; return; }
    $('#view-content').innerHTML = state.view === 'overview' ? metrics() + '<section class="dashboard-grid" aria-label="Dataset insights">' + chart() + qualityCard() + '</section>' + tablePanel() + lineage() : state.view === 'explorer' ? tablePanel() + lineage() : state.view === 'quality' ? qualityView() : catalogView();
    if (state.view === 'overview' || state.view === 'explorer') renderTable();
    if (state.view === 'quality') renderIssues();
  }

  function openRecord(dataset, index) {
    const row = state.data[dataset][index];
    if (!row) return;
    $('#record-title').textContent = row.name || 'Unnamed record';
    $('#record-dataset').textContent = `${titleCase(dataset).toUpperCase()} / RECORD ${row.id ?? index + 1}`;
    $('#record-fields').innerHTML = D.schemas[dataset].map((column) => `<div><dt>${escapeHtml(column.label)}</dt><dd>${D.isMissing(row[column.key]) ? '<span class="missing-cell">Missing value</span>' : escapeHtml(row[column.key])}</dd></div>`).join('');
    $('#record-dialog').showModal();
  }

  function exportCsv() {
    const rows = filteredRows();
    if (!rows.length) return;
    const blob = new Blob(['\uFEFF', D.toCsv(rows, D.schemas[state.dataset])], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-${state.dataset}-${state.mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${number(rows.length)} ${state.dataset} records${state.mode === 'demo' ? ' from the demo dataset' : ''}.`);
  }

  async function loadData(showNotification = false) {
    if (requestController) requestController.abort();
    const controller = new AbortController();
    requestController = controller;
    state.loading = true; state.error = false; state.loadedAt = null;
    state.data = { universities: [], professors: [] };
    render();
    let timeout;
    try {
      if (state.mode === 'demo') state.data = D.demo;
      else {
        timeout = setTimeout(() => controller.abort(), 12000);
        const datasets = await Promise.all(['universities', 'professors'].map(async (key) => {
          const response = await fetch(`/${key}`, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (!response.ok) {
            if (response.status === 401) location.replace('login.html?expired=1');
            const error = new Error(`/${key} returned HTTP ${response.status}.`);
            error.status = response.status;
            throw error;
          }
          const rows = await response.json();
          if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row) || D.schemas[key].some((column) => row[column.key] != null && typeof row[column.key] === 'object'))) throw new Error(`/${key} did not return a valid record array.`);
          return [key, rows];
        }));
        if (requestController !== controller) return;
        state.data = Object.fromEntries(datasets);
      }
      state.loadedAt = new Date();
      // A refreshed snapshot may no longer contain the previously selected filter values.
      const rows = state.data[state.dataset];
      const locationKey = state.dataset === 'universities' ? 'location' : 'city';
      const categoryKey = state.dataset === 'universities' ? 'education_direction' : 'department';
      if (state.location && !D.groupCounts(rows, locationKey).some((group) => group.label === state.location)) state.location = '';
      if (state.category && !D.groupCounts(rows, categoryKey).some((group) => group.label === state.category)) state.category = '';
      state.page = 1; state.qualityPage = 1;
      if (showNotification) notify(state.mode === 'demo' ? 'Demo snapshot refreshed.' : 'Both datasets refreshed from the database.');
    } catch (error) {
      if (requestController !== controller) return;
      controller.abort();
      state.error = true;
      $('#error-message').textContent = error.status === 403 ? 'Data insights are available to administrators and HR staff. Return to Campus to open your own workspace.' : error.name === 'AbortError' ? 'The request timed out after 12 seconds. Check that the application and database are running.' : 'The data API is unavailable or returned an unexpected response. Open this page through Spring Boot to load your PostgreSQL records.';
    } finally {
      clearTimeout(timeout);
      if (requestController === controller) { state.loading = false; render(); }
    }
  }

  function selectSource(mode) {
    state.mode = mode;
    resetFilters();
    const url = new URL(location.href);
    if (mode === 'demo') { url.searchParams.delete('source'); url.searchParams.set('demo', '1'); }
    else { url.searchParams.delete('demo'); url.searchParams.set('source', 'live'); }
    history.replaceState(null, '', url);
    loadData();
  }

  function setRoute(event) {
    const next = location.hash.slice(1);
    state.view = Object.hasOwn(routeNames, next) ? next : 'overview';
    state.page = 1;
    render();
    if (event && event.type === 'hashchange') $('#main').focus();
  }

  $('#source-select').addEventListener('change', (event) => selectSource(event.target.value));
  $('.skip-link').addEventListener('click', (event) => { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); });
  $('#use-demo').addEventListener('click', () => selectSource('demo'));
  $('#refresh-button').addEventListener('click', () => loadData(true));
  $('#close-dialog').addEventListener('click', () => $('#record-dialog').close());
  $('#record-dialog').addEventListener('click', (event) => { if (event.target === $('#record-dialog')) { const bounds = event.target.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close(); } });

  $('#view-content').addEventListener('input', (event) => {
    if (event.target.id === 'record-search') { state.query = event.target.value; state.page = 1; renderTable(); }
  });
  $('#view-content').addEventListener('change', (event) => {
    if (event.target.id === 'location-filter') { state.location = event.target.value; state.page = 1; renderTable(); }
    if (event.target.id === 'category-filter') { state.category = event.target.value; state.page = 1; renderTable(); }
    if (event.target.id === 'chart-dataset') { state.chartDataset = event.target.value; render(); $('#chart-dataset').focus(); }
    if (event.target.id === 'quality-dataset') { state.qualityDataset = event.target.value; state.qualityPage = 1; renderIssues(); }
  });
  $('#view-content').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.id === 'export-csv') exportCsv();
    else if (button.id === 'reset-filters' || button.dataset.action === 'clear-filters') { resetFilters(); render(); $('#record-search').focus(); }
    else if (button.dataset.action === 'retry') loadData();
    else if (button.dataset.dataset) { state.dataset = button.dataset.dataset; resetFilters(); render(); $(`[data-dataset="${state.dataset}"]`).focus(); }
    else if (button.dataset.sort) { state.sortDirection = state.sortKey === button.dataset.sort && state.sortDirection === 'asc' ? 'desc' : 'asc'; state.sortKey = button.dataset.sort; state.page = 1; renderTable(); $(`[data-sort="${state.sortKey}"]`).focus(); }
    else if (button.dataset.page) { state.page += button.dataset.page === 'next' ? 1 : -1; renderTable(); const preferred = $(`[data-page="${button.dataset.page}"]`); (preferred.disabled ? $('[data-page]:not(:disabled)') || $('#records-region') : preferred).focus(); }
    else if (button.dataset.record !== undefined) openRecord(state.dataset, Number(button.dataset.record));
    else if (button.dataset.issueRow !== undefined) openRecord(button.dataset.issueDataset, Number(button.dataset.issueRow));
    else if (button.dataset.qualityPage) { state.qualityPage += button.dataset.qualityPage === 'next' ? 1 : -1; renderIssues(); const next = $(`[data-quality-page="${button.dataset.qualityPage}"]:not(:disabled)`) || $('[data-quality-page]:not(:disabled)'); if (next) next.focus(); }
    else if (button.dataset.openDataset) { state.dataset = button.dataset.openDataset; resetFilters(); location.hash = 'explorer'; }
  });
  window.addEventListener('hashchange', setRoute);
  setRoute();
  loadData();
})();
