/* Campus portal: session-based sign-in and role-specific pages over the existing Java models. */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    university: '<path d="m3 8 9-5 9 5H3zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18M2 18h20"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zm-4 9 3 3 5-6"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
    trash: '<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M9 10v7m6-7v7"/>',
    location: '<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
    chart: '<path d="M4 3v18h17M9 16v-4m5 4V8m5 8V5"/>',
    logout: '<path d="M10 4H4v16h6m-1-8h12m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    refresh: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
    book: '<path d="M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4zM12 6v15"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
  const brand = () => '<a href="index.html" class="brand" aria-label="Campus home"><span class="brand-symbol"><i></i><i></i><i></i></span>campus<span class="brand-dot">.</span></a>';
  const roleLabels = { ADMIN: 'Administrator', HR: 'HR specialist', STUDENT: 'Student' };
  const rolePages = { ADMIN: 'admin.html', HR: 'hr.html', STUDENT: 'student.html' };
  const page = document.documentElement.dataset.page;
  const expectedRole = document.documentElement.dataset.role;
  const state = {
    session: null, connected: false, user: null, demo: false, section: 'overview', data: {},
    query: '', city: '', page: 1, sort: 'name', loading: false, dataError: '', modal: null, busy: false
  };
  let toastTimer;
  let loadVersion = 0;

  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
  }

  async function api(path, { method = 'GET', body, form = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (method !== 'GET' && state.session?.csrfToken) headers[state.session.csrfHeader || 'X-CSRF-TOKEN'] = state.session.csrfToken;
    if (body !== undefined) headers['Content-Type'] = form ? 'application/x-www-form-urlencoded;charset=UTF-8' : 'application/json';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(path, {
        method, headers, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        body: body === undefined ? undefined : form ? new URLSearchParams(body).toString() : JSON.stringify(body)
      });
      const text = await response.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch { /* The static preview has no API. */ }
      if (!response.ok) {
        const error = new Error(payload?.message || payload?.error || (response.status === 401 ? 'Your email or password is incorrect, or your session has expired.' : response.status === 403 ? 'You do not have permission for this action. Refresh your workspace if your access changed.' : 'The request could not be completed. Please try again.'));
        error.status = response.status;
        if (response.status === 401 && expectedRole && state.user) location.replace('login.html?expired=1');
        throw error;
      }
      if (method === 'GET' && payload === null) throw new Error('The Campus API is unavailable. Start the Spring Boot application to use accounts and workspaces.');
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
      if (error instanceof TypeError) throw new Error('Cannot reach the server. Check that the Campus application is running.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  async function session() {
    const result = await api('/api/auth/session');
    if (!result || typeof result.csrfToken !== 'string') throw new Error('The Campus API is unavailable. Open the site through Spring Boot, not the static preview server.');
    state.session = result;
    state.user = result.user;
    state.demo = result.demo === true;
    state.connected = true;
    return result;
  }

  function campusArt() {
    return `<div class="campus-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-sun"></div><svg viewBox="0 0 520 350" class="campus-building"><path d="M30 285h460" stroke="#9eb58e" stroke-width="2"/><path d="M100 282V161h100v121M320 282V161h100v121" fill="#d3dfbd"/><path d="M92 161h116v-17H92zm220 0h116v-17H312z" fill="#9eb58e"/><path d="M184 282V127h152v155" fill="#edf0d7"/><path d="m166 127 94-63 94 63z" fill="#c6dba8"/><path d="m190 119 70-46 70 46z" fill="#789b71"/><path d="M245 98h30M260 84v29" stroke="#d8e5c0" stroke-width="3"/><path d="M231 282v-57a29 29 0 0 1 58 0v57" fill="#446d53"/><path d="M260 206v76" stroke="#90aa7d" stroke-width="2"/><g fill="#729276"><path d="M119 183h20v29h-20zm44 0h20v29h-20zm-44 48h20v29h-20zm44 0h20v29h-20zm176-48h20v29h-20zm43 0h20v29h-20zm-43 48h20v29h-20zm43 0h20v29h-20z"/><path d="M207 151h21v32h-21zm43 0h21v32h-21zm43 0h21v32h-21z"/></g><path d="M220 283h80v10h-80m-14 0h108v10H206m-14 0h136v9H192" fill="#aabe98"/><path d="M61 280v-50m398 50v-59" stroke="#729276" stroke-width="6"/><ellipse cx="61" cy="215" rx="27" ry="38" fill="#94b27c"/><ellipse cx="459" cy="207" rx="31" ry="43" fill="#87a872"/><path d="M54 270h20m373 0h22" stroke="#aabe98" stroke-width="3"/></svg><div class="art-card art-card-top"><span class="art-icon">${icon('shield')}</span><div><strong>A space for every role</strong><span>One connected campus</span></div><i class="online-dot"></i></div><div class="art-card art-card-bottom"><span class="avatar-stack"><i>A</i><i>H</i><i>S</i></span><div><strong>People at the centre</strong><span>Administration · Faculty · Students</span></div></div></div>`;
  }

  function connectionNotice() {
    return state.connected ? '' : '<div class="notice warning" role="status"><strong>Server connection needed</strong><p>Accounts and saved changes work through the Java application. Start the demo with <code>./mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=demo</code>, then open <a href="http://127.0.0.1:8080">127.0.0.1:8080</a>.</p><button class="text-button" data-action="reconnect">Retry connection ' + icon('refresh') + '</button></div>';
  }

  function home() {
    $('#portal-root').innerHTML = `<div class="public-page"><header class="public-header">${brand()}<span class="header-caption">UNIVERSITY MANAGEMENT SYSTEM</span><nav aria-label="Main navigation"><a class="quiet-link" href="#workspaces">Workspaces</a>${state.user ? `<a class="button" href="${rolePages[state.user.role]}">My workspace ${icon('arrow')}</a>` : '<a class="quiet-link" href="login.html">Sign in</a><a class="button" href="register.html">Create account ' + icon('arrow') + '</a>'}</nav></header><main id="main" tabindex="-1"><section class="home-hero"><div class="hero-copy"><div class="eyebrow"><span></span> WELCOME TO CAMPUS</div><h1>A connected campus.<br>A place for <em>everyone.</em></h1><p>From the people who keep things running to the students finding their next step. Bring your university community into one simple workspace.</p><div class="hero-actions"><a class="button large" href="${state.user ? rolePages[state.user.role] : 'register.html'}">${state.user ? 'Open my workspace' : 'Find your place'} ${icon('arrow')}</a><a class="text-button" href="login.html">Already part of Campus? Sign in</a></div><div class="hero-proof"><span>${icon('check')} Role-based workspaces</span><span>${icon('check')} Your progress, saved</span></div></div>${campusArt()}</section>${connectionNotice()}<section id="workspaces" class="workspaces-section"><div class="section-heading"><div><div class="eyebrow">ONE SYSTEM. THREE PERSPECTIVES.</div><h2>Your role. Your workspace.</h2></div><p>The right tools for the work you do.</p></div><div class="role-cards"><article><span class="feature-icon">${icon('university')}</span><span class="card-number">01</span><h3>University administration</h3><p>Keep university records organised, manage user access, and see the bigger picture.</p><a href="login.html">Administrator workspace ${icon('arrow')}</a></article><article><span class="feature-icon amber">${icon('people')}</span><span class="card-number">02</span><h3>People & faculty</h3><p>Look after your faculty directory. Add profiles, update details, and explore team expertise.</p><a href="login.html">HR workspace ${icon('arrow')}</a></article><article><span class="feature-icon blue">${icon('book')}</span><span class="card-number">03</span><h3>Your student journey</h3><p>Discover universities and courses. Save the places that interest you in your own collection.</p><a href="register.html">Create a student account ${icon('arrow')}</a></article></div></section></main><footer class="public-footer"><span>Campus · University Management System</span><span>A student project. Built for real interactions.</span></footer></div>`;
  }

  function authPage() {
    const register = page === 'register';
    $('#portal-root').innerHTML = `<main class="auth-layout" id="main" tabindex="-1"><section class="auth-story">${brand()}<div class="auth-story-copy"><div class="eyebrow light">YOUR NEXT CHAPTER STARTS HERE</div><h1>One campus.<br>Many possibilities.</h1><p>A shared space for the people who learn, teach, and make university life happen.</p></div>${campusArt()}<div class="auth-story-footer">Connected people. Better possibilities.</div></section><section class="auth-content"><a href="index.html" class="back-link">← Back to Campus</a><div class="auth-form-wrap"><span class="feature-icon">${icon(register ? 'user' : 'university')}</span><div class="eyebrow">${register ? 'JOIN YOUR COMMUNITY' : 'YOUR CAMPUS IS WAITING'}</div><h2>${register ? 'Make yourself at home.' : 'Welcome back.'}</h2><p class="auth-intro">${register ? 'Create your student account and start exploring.' : 'Sign in to open your personal workspace.'}</p>${connectionNotice()}${new URLSearchParams(location.search).has('expired') ? '<div class="notice">Your session ended. Please sign in again.</div>' : ''}<div class="form-error" id="auth-error" role="alert" hidden></div><form id="auth-form">${register ? '<label class="form-field">Full name<input name="name" autocomplete="name" placeholder="Your full name" required minlength="2" maxlength="100"></label>' : ''}<label class="form-field">Email address<input name="email" type="email" autocomplete="username" placeholder="you@university.edu" required maxlength="254"></label><label class="form-field">Password<span class="password-field"><input id="password-input" name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="${register ? 'At least 8 characters' : 'Your password'}" required${register ? ' minlength="8" maxlength="72"' : ' maxlength="200"'}><button type="button" class="icon-button" data-action="toggle-password" aria-label="Show password" aria-pressed="false">${icon('eye')}</button></span></label>${register ? '<label class="form-field">Confirm password<input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Repeat your password" required minlength="8" maxlength="72"></label><p class="field-help">New accounts start as students. Your administrator can grant staff access.</p>' : ''}<button class="button full-width" type="submit">${register ? 'Create account' : 'Sign in to Campus'} ${icon('arrow')}</button></form><p class="auth-switch">${register ? 'Already have an account? <a href="login.html">Sign in</a>' : 'New to Campus? <a href="register.html">Create an account</a>'}</p>${state.demo ? `<div class="demo-access"><span class="eyebrow">LOCAL DEMO ACCOUNTS</span><p>Explore a role using a preconfigured test account.</p><div class="demo-buttons">${[['ADMIN', 'Admin'], ['HR', 'HR'], ['STUDENT', 'Student']].map(([role, label]) => `<button class="button secondary small" data-demo-role="${role}" type="button">${label} ${icon('arrow')}</button>`).join('')}</div><span class="field-help">Local demo only · Changes are saved on this computer.</span></div>` : ''}</div><footer class="auth-footer">Campus / University Management System</footer></section></main>`;
  }

  function navigation() {
    if (state.user.role === 'ADMIN') return [['overview', 'Overview', 'grid'], ['universities', 'Universities', 'university'], ['faculty', 'Faculty directory', 'people'], ['users', 'Access management', 'shield'], ['profile', 'My account', 'user']];
    if (state.user.role === 'HR') return [['overview', 'Overview', 'grid'], ['faculty', 'Faculty directory', 'people'], ['universities', 'University catalog', 'university'], ['profile', 'My account', 'user']];
    return [['overview', 'My overview', 'grid'], ['universities', 'Discover universities', 'university'], ['saved', 'Saved universities', 'bookmark'], ['profile', 'My account', 'user']];
  }

  function shell() {
    const user = state.user;
    const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    $('#portal-root').innerHTML = `<div class="workspace-layout"><aside class="sidebar">${brand()}<div class="workspace-badge"><span class="workspace-icon">${icon(user.role === 'ADMIN' ? 'shield' : user.role === 'HR' ? 'people' : 'book')}</span><div><strong>${roleLabels[user.role]}</strong><span>${user.role === 'STUDENT' ? 'Your student space' : 'University workspace'}</span></div></div><div class="sidebar-label">WORKSPACE</div><nav aria-label="Workspace navigation">${navigation().map(([key, label, symbol]) => `<a href="#${key}" data-section="${key}">${icon(symbol)}<span>${label}</span>${key === 'saved' ? '<span id="saved-count" class="nav-count">0</span>' : ''}</a>`).join('')}${user.role !== 'STUDENT' ? '<a href="analytics.html?source=live">' + icon('chart') + '<span>Data insights</span><span class="external-arrow">↗</span></a>' : ''}</nav><div class="sidebar-bottom"><span class="sidebar-caption">A little more connected.</span><p>Your campus, all in one place.</p><div class="sidebar-user"><span class="avatar">${esc(initials)}</span><div><strong>${esc(user.name)}</strong><span>${roleLabels[user.role]}</span></div><button class="icon-button" data-action="logout" aria-label="Sign out" title="Sign out">${icon('logout')}</button></div></div></aside><div class="workspace-body"><header class="workspace-header"><div class="breadcrumb">Campus <span>/</span> <strong id="breadcrumb">Overview</strong></div><div class="workspace-header-right"><span class="connection-status"><i></i>${state.demo ? 'Local demo' : 'Connected'}</span><span class="avatar small-avatar">${esc(initials)}</span></div></header><main id="main" tabindex="-1" class="workspace-main">${state.demo ? '<div class="demo-banner"><span>DEMO</span> You are using the local demo database. Accounts and changes are saved on this computer.</div>' : ''}<div id="workspace-content"></div></main><footer class="workspace-footer"><span>Campus · University Management System</span><span>${roleLabels[user.role]} workspace</span></footer></div></div><dialog id="portal-dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>`;
  }

  function stat(label, value, symbol, detail, featured = false) {
    return `<article class="stat-card${featured ? ' featured' : ''}"><div><span>${label}</span><i>${icon(symbol)}</i></div><strong>${esc(value)}</strong><p>${detail}</p></article>`;
  }

  function heading(title, subtitle, action = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${state.user.role === 'STUDENT' ? 'YOUR CAMPUS, YOUR POSSIBILITIES' : 'UNIVERSITY MANAGEMENT'}</div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
  }

  function universityCards(rows, savedView = false) {
    const saved = new Set((state.data.bookmarks || []).map((row) => row.id));
    if (!rows.length) return empty(savedView ? 'Your collection starts here' : 'No universities found', savedView ? 'Save a university while exploring the catalog. It will appear here next time you sign in.' : state.query || state.city ? 'Try a different search or clear your filters.' : 'University records will appear here when an administrator adds them.', savedView ? '<a href="#universities" class="button secondary">Explore universities ' + icon('arrow') + '</a>' : state.query || state.city ? '<button class="button secondary" data-action="clear-filters">Clear filters</button>' : '');
    return `<div class="university-cards">${rows.map((row, index) => `<article class="university-card"><div class="university-card-top palette-${index % 3}"><span class="campus-monogram">${icon('university')}</span><span class="direction-label">${esc(row.education_direction || 'Education')}</span></div><div class="university-card-body"><span class="location-line">${icon('location')}${esc(row.location || 'Location not specified')}</span><h3>${esc(row.name)}</h3><p>${esc(row.course || 'Course information coming soon')}</p><div class="university-meta"><span>${icon('book')}${esc(row.creation_year ? 'Founded ' + row.creation_year : 'Founding year not set')}</span></div><div class="card-actions"><button class="text-button" data-details="${row.id}" data-kind="universities">View details ${icon('arrow')}</button>${state.user.role === 'STUDENT' ? `<button class="save-button${saved.has(row.id) ? ' saved' : ''}" data-bookmark="${row.id}" aria-pressed="${saved.has(row.id)}" aria-label="${saved.has(row.id) ? 'Remove' : 'Save'} ${esc(row.name)}">${icon('bookmark')}<span>${saved.has(row.id) ? 'Saved' : 'Save'}</span></button>` : ''}</div></div></article>`).join('')}</div>`;
  }

  function empty(title, description, action = '') {
    return `<div class="empty-state">${icon('search')}<h3>${title}</h3><p>${description}</p>${action}</div>`;
  }

  function overview() {
    const { universities = [], professors = [], users = [], bookmarks = [] } = state.data;
    const student = state.user.role === 'STUDENT';
    const cities = new Set(universities.map((row) => row.location).filter(Boolean)).size;
    const average = professors.length ? (professors.reduce((sum, row) => sum + (row.experience || 0), 0) / professors.length).toFixed(1) : '—';
    const greeting = esc(state.user.name.trim().split(/\s+/)[0]);
    const action = `<a class="button" href="#${student ? 'universities' : state.user.role === 'HR' ? 'faculty' : 'universities'}">${student ? 'Explore universities' : 'Open directory'} ${icon('arrow')}</a>`;
    const stats = student ? stat('Universities to explore', universities.length, 'university', 'Discover your next opportunity', true) + stat('Saved universities', bookmarks.length, 'bookmark', 'Your own shortlist') + stat('Cities represented', cities, 'location', 'Across the university catalog') : stat('University records', universities.length, 'university', 'In the university directory', true) + stat('Faculty members', professors.length, 'people', 'In the faculty directory') + (state.user.role === 'ADMIN' ? stat('Registered accounts', users.length, 'shield', 'Across all three roles') : stat('Average experience', average, 'chart', 'Years across faculty profiles'));
    return heading(`Good to see you, ${greeting}.`, student ? 'A new perspective, a new possibility. Find the places you want to be.' : 'Here is what is happening in your university workspace.', action) + `<section class="welcome-banner"><div><span class="eyebrow">${student ? 'MAKE YOUR NEXT MOVE' : 'A MORE CONNECTED CAMPUS'}</span><h2>${student ? 'Your next chapter is out there.' : state.user.role === 'HR' ? 'Great institutions start with great people.' : 'The details matter. So does the bigger picture.'}</h2><p>${student ? 'Explore courses, compare universities, and keep your favourites close.' : state.user.role === 'HR' ? 'Keep faculty profiles current and help your team put its expertise on the map.' : 'Keep your university catalog up to date and give your community the access it needs.'}</p></div><div class="banner-illustration" aria-hidden="true">${icon(student ? 'book' : state.user.role === 'HR' ? 'people' : 'university')}</div></section><section class="stats-grid" aria-label="Workspace summary">${stats}</section>${student ? `<div class="section-heading"><div><h2>Places to discover</h2><p>A few universities from your current catalog.</p></div><a class="text-button" href="#universities">View all ${icon('arrow')}</a></div>${universityCards(universities.slice(0, 3))}` : `<section class="overview-panels"><article class="panel"><div class="panel-title"><div><h2>${state.user.role === 'HR' ? 'Faculty by department' : 'Universities by city'}</h2><p>A snapshot of your current records</p></div>${icon('chart')}</div>${distribution(state.user.role === 'HR' ? professors : universities, state.user.role === 'HR' ? 'department' : 'location')}</article><article class="panel"><div class="panel-title"><div><h2>Your next action</h2><p>The tools you use, one step away</p></div></div><div class="quick-actions">${state.user.role === 'ADMIN' ? '<button data-action="create-university">' + icon('university') + '<span><strong>Add a university</strong><small>Grow the university directory</small></span>' + icon('arrow') + '</button><a href="#users">' + icon('shield') + '<span><strong>Manage account access</strong><small>Assign the right role to each person</small></span>' + icon('arrow') + '</a>' : '<button data-action="create-professor">' + icon('people') + '<span><strong>Add a faculty member</strong><small>Create a new professor profile</small></span>' + icon('arrow') + '</button><a href="#faculty">' + icon('search') + '<span><strong>Find faculty expertise</strong><small>Search skills, departments, and cities</small></span>' + icon('arrow') + '</a>'}<a href="analytics.html?source=live">${icon('chart')}<span><strong>Explore data insights</strong><small>Inspect quality and export your datasets</small></span>${icon('arrow')}</a></div></article></section>`}`;
  }

  function distribution(rows, key) {
    const groups = window.CampusData.groupCounts(rows, key).slice(0, 5);
    const max = Math.max(1, ...groups.map((group) => group.count));
    if (!groups.length) return empty('Your chart is waiting', 'Add records to see the distribution.');
    return `<div class="distribution">${groups.map((group) => `<div class="distribution-row"><div><span>${esc(group.label)}</span><strong>${group.count}</strong></div><div class="distribution-track"><span style="width:${group.count / max * 100}%"></span></div></div>`).join('')}<p>Top ${groups.length} groups · records without this field are excluded</p></div>`;
  }

  function filters(label, rows, locationKey) {
    const cities = [...new Set(rows.map((row) => row[locationKey]).filter(Boolean))].sort();
    return `<div class="directory-toolbar"><label class="search-input">${icon('search')}<span class="sr-only">${label}</span><input id="directory-search" type="search" placeholder="${label}" value="${esc(state.query)}"></label>${locationKey ? `<label class="select-field"><span class="sr-only">Filter by city</span><select id="directory-city"><option value="">All cities</option>${cities.map((city) => `<option value="${esc(city)}"${state.city === city ? ' selected' : ''}>${esc(city)}</option>`).join('')}</select></label>` : ''}<label class="select-field"><span class="sr-only">Sort records</span><select id="directory-sort"><option value="name"${state.sort === 'name' ? ' selected' : ''}>Name A–Z</option><option value="id"${state.sort === 'id' ? ' selected' : ''}>ID: oldest first</option></select></label><button class="text-button clear-filter" data-action="clear-filters"${state.query || state.city ? '' : ' hidden'}>Clear filters</button></div>`;
  }

  function directory() {
    const section = state.section;
    const universities = section === 'universities' || section === 'saved';
    const rows = universities ? section === 'saved' ? state.data.bookmarks : state.data.universities : state.data.professors;
    const editable = universities ? state.user.role === 'ADMIN' : state.user.role !== 'STUDENT';
    const title = section === 'saved' ? 'Keep your possibilities close.' : universities ? state.user.role === 'STUDENT' ? 'Where will you go next?' : 'University directory.' : 'People make the difference.';
    const subtitle = section === 'saved' ? 'Your saved universities, ready whenever you are.' : universities ? 'Explore locations, education directions, and available courses.' : 'A shared view of faculty experience, expertise, and departments.';
    const action = editable ? `<button class="button" data-action="${universities ? 'create-university' : 'create-professor'}">${icon('plus')}Add ${universities ? 'university' : 'faculty member'}</button>` : '';
    return heading(title, subtitle, action) + `<section class="${state.user.role === 'STUDENT' ? 'catalog-section' : 'panel directory-panel'}">${filters(universities ? 'Search universities or courses…' : 'Search faculty, expertise, or department…', rows || [], universities ? 'location' : 'city')}<div id="directory-results"></div></section>`;
  }

  function currentRows() {
    const key = state.section === 'faculty' ? 'professors' : state.section === 'users' ? 'users' : state.section === 'saved' ? 'bookmarks' : 'universities';
    const query = state.query.trim().toLocaleLowerCase();
    return (state.data[key] || []).filter((row) => (!query || Object.values(row).some((value) => String(value ?? '').toLocaleLowerCase().includes(query))) && (!state.city || (row.location || row.city) === state.city)).slice().sort((a, b) => state.sort === 'id' ? a.id - b.id : String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base', numeric: true }));
  }

  function pageFooter(count, pageSize) {
    const pages = Math.max(1, Math.ceil(count / pageSize));
    state.page = Math.min(state.page, pages);
    return `<div class="list-footer"><span role="status">${count ? (state.page - 1) * pageSize + 1 : 0}–${Math.min(state.page * pageSize, count)} of ${count} ${state.section === 'users' ? 'accounts' : 'records'}</span><div class="pagination"><button class="button secondary small" data-page="previous"${state.page <= 1 ? ' disabled' : ''}>← Previous</button><span>${state.page} / ${pages}</span><button class="button secondary small" data-page="next"${state.page >= pages ? ' disabled' : ''}>Next →</button></div></div>`;
  }

  function renderResults() {
    if (!$('#directory-results')) return;
    const rows = currentRows();
    const student = state.user.role === 'STUDENT';
    const pageSize = student ? 6 : 8;
    const footer = pageFooter(rows.length, pageSize);
    const visible = rows.slice((state.page - 1) * pageSize, state.page * pageSize);
    const faculty = state.section === 'faculty';
    const users = state.section === 'users';
    const kind = faculty ? 'professors' : 'universities';
    const editable = faculty || state.user.role === 'ADMIN';
    let content;
    if (student) content = universityCards(visible, state.section === 'saved' && !(state.query || state.city));
    else if (!visible.length) content = empty('No matching records', state.query || state.city ? 'Try a different search or clear your filters.' : users ? 'Registered accounts will appear here.' : 'Add your first record to get started.');
    else content = `<div class="table-scroll" role="region" tabindex="0" aria-label="${users ? 'User accounts' : faculty ? 'Faculty' : 'Universities'} table"><table><caption class="sr-only">${users ? 'User accounts and roles' : faculty ? 'Faculty directory' : 'University directory'}</caption><thead><tr><th scope="col">${users ? 'Account' : faculty ? 'Faculty member' : 'University'}</th><th scope="col">${users ? 'Email address' : faculty ? 'Department' : 'City'}</th><th scope="col">${users ? 'Role' : faculty ? 'Experience' : 'Education direction'}</th>${users ? '' : `<th scope="col">${faculty ? 'City' : 'Founded'}</th>`}<th scope="col" class="actions-heading">Actions</th></tr></thead><tbody>${visible.map((row) => `<tr><td><div class="table-person"><span class="table-avatar">${icon(users ? 'user' : faculty ? 'people' : 'university')}</span><div>${users ? `<strong>${esc(row.name)}${row.id === state.user.id ? ' <span class="you-label">you</span>' : ''}</strong>` : `<button class="record-link" data-details="${row.id}" data-kind="${kind}">${esc(row.name)}</button>`}<small>#${row.id}${faculty ? ' · ' + esc(row.knowledge || 'Expertise not set') : ''}</small></div></div></td><td>${esc(users ? row.email : faculty ? row.department : row.location) || '—'}</td><td>${users ? `<span class="role-pill role-${row.role.toLowerCase()}">${roleLabels[row.role]}</span>` : faculty ? `${esc(row.experience ?? '—')} years` : `<span class="tag">${esc(row.education_direction || 'Not specified')}</span>`}</td>${users ? '' : `<td>${esc(faculty ? row.city : row.creation_year) || '—'}</td>`}<td><div class="table-row-actions">${users ? `<button class="button secondary small" data-user-role="${row.id}"${row.id === state.user.id ? ' disabled title="You cannot change your own role"' : ''}>Change role</button>` : editable ? `<button class="icon-button" data-edit="${row.id}" data-kind="${kind}" aria-label="Edit ${esc(row.name)}" title="Edit">${icon('edit')}</button><button class="icon-button danger-icon" data-delete="${row.id}" data-kind="${kind}" aria-label="Delete ${esc(row.name)}" title="Delete">${icon('trash')}</button>` : `<button class="text-button" data-details="${row.id}" data-kind="${kind}">View ${icon('arrow')}</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
    $('#directory-results').innerHTML = content + footer;
    const clear = $('.clear-filter');
    if (clear) clear.hidden = !(state.query || state.city);
  }

  function accessPage() {
    return heading('The right access, for everyone.', 'Students can register themselves. Staff roles are assigned here by an administrator.') + `<div class="access-guide"><span>${icon('shield')}<strong>Admin</strong>Universities, faculty & access</span><span>${icon('people')}<strong>HR</strong>Faculty management</span><span>${icon('book')}<strong>Student</strong>Browse & save universities</span></div><section class="panel directory-panel">${filters('Search accounts by name, email, or role…', state.data.users || [])}<div id="directory-results"></div></section>`;
  }

  function profilePage() {
    return heading('Your place in Campus.', 'Your account and the workspace available to you.') + `<section class="panel profile-panel"><span class="profile-large">${icon('user')}</span><h2>${esc(state.user.name)}</h2><span class="role-pill role-${state.user.role.toLowerCase()}">${roleLabels[state.user.role]}</span><dl><div><dt>Email address</dt><dd>${esc(state.user.email)}</dd></div><div><dt>Account ID</dt><dd>#${state.user.id}</dd></div><div><dt>Workspace</dt><dd>${roleLabels[state.user.role]}</dd></div><div><dt>Connection</dt><dd>${state.demo ? 'Local demonstration database' : 'University database'}</dd></div></dl><p>Staff access is managed by a university administrator.</p><button class="button secondary" data-action="logout">${icon('logout')}Sign out of Campus</button></section>`;
  }

  function renderWorkspace() {
    const available = navigation();
    const label = available.find(([key]) => key === state.section)?.[1] || 'Overview';
    $('#breadcrumb').textContent = label;
    document.title = `${label} — Campus`;
    document.querySelectorAll('[data-section]').forEach((link) => {
      const active = link.dataset.section === state.section;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if ($('#saved-count')) $('#saved-count').textContent = (state.data.bookmarks || []).length;
    const content = $('#workspace-content');
    content.setAttribute('aria-busy', String(state.loading));
    if (state.loading) { content.innerHTML = '<div class="loading-content" role="status"><span class="loader"></span><p>Loading your workspace…</p></div>'; return; }
    if (state.dataError) { content.innerHTML = `<div class="notice warning" role="alert"><h2>We couldn’t load your workspace.</h2><p>${esc(state.dataError)}</p><button class="button secondary" data-action="reload">${icon('refresh')}Try again</button></div>`; return; }
    content.innerHTML = state.section === 'overview' ? overview() : state.section === 'profile' ? profilePage() : state.section === 'users' ? accessPage() : directory();
    renderResults();
  }

  async function loadWorkspace() {
    const version = ++loadVersion;
    state.loading = true;
    state.dataError = '';
    renderWorkspace();
    try {
      const requests = [['universities', '/universities']];
      if (state.user.role !== 'STUDENT') requests.push(['professors', '/professors']);
      if (state.user.role === 'ADMIN') requests.push(['users', '/api/users']);
      if (state.user.role === 'STUDENT') requests.push(['bookmarks', '/api/bookmarks']);
      const results = await Promise.all(requests.map(async ([key, path]) => {
        const rows = await api(path);
        if (!Array.isArray(rows)) throw new Error('The server returned an unexpected dataset. Please reload.');
        return [key, rows];
      }));
      if (version !== loadVersion) return;
      state.data = Object.fromEntries(results);
      // Do not retain an invisible city filter after edited or deleted records disappear.
      const visibleRows = state.data[state.section === 'faculty' ? 'professors' : state.section === 'saved' ? 'bookmarks' : 'universities'] || [];
      if (state.city && !visibleRows.some((row) => (row.location || row.city) === state.city)) state.city = '';
    } catch (error) {
      if (version !== loadVersion) return;
      state.dataError = error.message;
      if (error.status === 403) {
        try { await session(); if (state.user && state.user.role !== expectedRole) { location.replace(rolePages[state.user.role]); return; } } catch { /* Keep the retry message. */ }
      }
    } finally {
      if (version === loadVersion) { state.loading = false; renderWorkspace(); }
    }
  }

  function route(focus = false) {
    const next = location.hash.slice(1);
    state.section = navigation().some(([key]) => key === next) ? next : 'overview';
    state.query = ''; state.city = ''; state.page = 1; state.sort = 'name';
    renderWorkspace();
    if (focus) $('#main').focus();
  }

  const fieldLabels = {
    name: 'Name', location: 'City', education_direction: 'Education direction', creation_year: 'Founded year', course: 'Course',
    age: 'Age', department: 'Department', experience: 'Experience (years)', knowledge: 'Expertise / skills', personal_qualities: 'Personal qualities', city: 'City'
  };

  function dialogHeader(kicker, title) {
    return `<div class="dialog-header"><div><div class="eyebrow">${kicker}</div><h2 id="dialog-title">${esc(title)}</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>`;
  }

  function showDialog(html) {
    $('#dialog-content').innerHTML = html;
    const dialog = $('#portal-dialog');
    dialog.showModal();
  }

  function editRecord(kind, id) {
    const record = id === undefined ? {} : state.data[kind].find((row) => row.id === id);
    if (!record) return;
    const university = kind === 'universities';
    state.modal = { type: 'record', kind, id };
    const fields = window.CampusData.schemas[kind].filter((column) => column.key !== 'id');
    showDialog(dialogHeader(university ? 'UNIVERSITY DIRECTORY' : 'FACULTY DIRECTORY', `${id === undefined ? 'Add' : 'Edit'} ${university ? 'university' : 'faculty member'}`) + `<form id="record-form"><div id="dialog-error" class="form-error" role="alert" hidden></div><div class="record-form-grid">${fields.map((column) => {
      const number = column.type === 'number';
      const min = column.key === 'age' ? 18 : column.key === 'creation_year' ? 1000 : 0;
      const max = column.key === 'age' ? 100 : column.key === 'creation_year' ? new Date().getFullYear() : 82;
      return `<label class="form-field${column.key === 'name' || column.key === 'knowledge' || column.key === 'course' ? ' span-two' : ''}">${fieldLabels[column.key]}${column.key === 'personal_qualities' ? ' <span class="optional">(optional)</span>' : ''}<input name="${column.key}" type="${number ? 'number' : 'text'}" value="${esc(record[column.key] ?? '')}"${column.key === 'personal_qualities' ? '' : ' required'}${number ? ` min="${min}" max="${max}" step="1"` : ` maxlength="${column.key === 'name' ? 200 : 255}"`} autocomplete="off"></label>`;
    }).join('')}</div><div class="dialog-actions"><button class="button secondary" type="button" data-action="close-dialog">Cancel</button><button class="button" type="submit">${icon('check')}Save ${university ? 'university' : 'profile'}</button></div></form>`);
  }

  function showDetails(kind, id) {
    const record = state.data[kind]?.find((row) => row.id === id);
    if (!record) return;
    state.modal = { type: 'details', kind, id };
    showDialog(dialogHeader(kind === 'universities' ? 'UNIVERSITY PROFILE' : 'FACULTY PROFILE', record.name) + `<dl class="record-details">${window.CampusData.schemas[kind].map((column) => `<div><dt>${esc(column.key === 'id' ? 'Record ID' : fieldLabels[column.key])}</dt><dd>${esc(record[column.key] ?? '') || '<span class="muted">Not specified</span>'}</dd></div>`).join('')}</dl><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">Close</button></div>`);
  }

  function confirmDelete(kind, id) {
    const record = state.data[kind]?.find((row) => row.id === id);
    if (!record) return;
    state.modal = { type: 'delete', kind, id };
    showDialog(dialogHeader('DELETE RECORD', `Delete ${record.name}?`) + `<p class="dialog-copy">This removes the ${kind === 'universities' ? 'university and its student bookmarks' : 'faculty profile'} from the database. This action cannot be undone.</p><div id="dialog-error" class="form-error" role="alert" hidden></div><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">Cancel</button><button class="button danger" data-action="confirm-delete">${icon('trash')}Delete record</button></div>`);
  }

  function changeRole(id) {
    const user = state.data.users?.find((row) => row.id === id);
    if (!user || id === state.user.id) return;
    state.modal = { type: 'role', id };
    showDialog(dialogHeader('ACCOUNT ACCESS', `Change role for ${user.name}`) + `<form id="role-form"><p class="dialog-copy">${esc(user.email)}<br>Changes apply to this account’s next request, including existing signed-in sessions.</p><div id="dialog-error" class="form-error" role="alert" hidden></div><label class="form-field">Workspace role<select name="role">${Object.entries(roleLabels).map(([role, label]) => `<option value="${role}"${user.role === role ? ' selected' : ''}>${label}</option>`).join('')}</select></label><p class="field-help">Administrators can manage university records, faculty, and other users’ access.</p><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="button">Save role ${icon('check')}</button></div></form>`);
  }

  function formError(selector, message) {
    const element = $(selector);
    if (element) { element.textContent = message; element.hidden = false; element.scrollIntoView({ block: 'nearest' }); }
  }

  async function withBusy(element, operation, errorTarget = '#dialog-error') {
    if (state.busy) return;
    state.busy = true;
    const buttons = [...element.querySelectorAll('button')];
    if (element.tagName === 'BUTTON') buttons.push(element);
    const enabled = buttons.filter((button) => !button.disabled);
    enabled.forEach((button) => { button.disabled = true; });
    try { await operation(); }
    catch (error) { if ($(errorTarget)) formError(errorTarget, error.message); else toast(error.message); }
    finally { state.busy = false; enabled.forEach((button) => { button.disabled = false; }); }
  }

  async function submitAuth(form) {
    await withBusy(form, async () => {
      const values = Object.fromEntries(new FormData(form));
      if (page === 'register') {
        if (values.password !== values.confirmPassword) throw new Error('The passwords do not match. Please check both fields.');
        if (new TextEncoder().encode(values.password).length > 72) throw new Error('Use a password of up to 72 UTF-8 bytes. This matters for non-Latin characters.');
      }
      await session();
      if (page === 'register') await api('/api/auth/register', { method: 'POST', body: { name: values.name.trim(), email: values.email.trim(), password: values.password } });
      try {
        await api('/api/auth/login', { method: 'POST', form: true, body: { username: values.email.trim(), password: values.password } });
        await session();
        if (!state.user) throw new Error('Sign-in could not be completed. Please try signing in again.');
        location.replace(rolePages[state.user.role]);
      } catch (error) {
        if (page === 'register') throw new Error('Your account was created. Open the Sign in page to continue.');
        throw error;
      }
    }, '#auth-error');
  }

  async function submitRecord(form) {
    await withBusy(form, async () => {
      const { kind, id } = state.modal;
      const values = Object.fromEntries(new FormData(form));
      const body = {};
      for (const field of window.CampusData.schemas[kind]) {
        if (field.key === 'id') continue;
        body[field.key] = field.type === 'number' ? Number(values[field.key]) : values[field.key].trim();
      }
      if (kind === 'professors' && body.experience > body.age - 18) throw new Error('Experience cannot exceed the number of years since age 18.');
      await api(`/${kind}${id === undefined ? '' : '/' + id}`, { method: id === undefined ? 'POST' : 'PUT', body });
      $('#portal-dialog').close();
      toast(id === undefined ? 'New record saved.' : 'Record updated.');
      await loadWorkspace();
    });
  }

  async function bookmark(button) {
    await withBusy(button, async () => {
      const id = Number(button.dataset.bookmark);
      const saved = state.data.bookmarks.some((row) => row.id === id);
      await api(`/api/bookmarks/${id}`, { method: saved ? 'DELETE' : 'POST' });
      state.data.bookmarks = await api('/api/bookmarks');
      if (state.section === 'saved' && state.city && !state.data.bookmarks.some((row) => row.location === state.city)) state.city = '';
      renderWorkspace();
      const replacement = $(`[data-bookmark="${id}"]`);
      if (replacement) replacement.focus(); else $('#main').focus();
      toast(saved ? 'University removed from your collection.' : 'University saved to your collection.');
    }, '#bookmark-error');
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.id === 'auth-form') { event.preventDefault(); submitAuth(form); }
    if (form.id === 'record-form') { event.preventDefault(); submitRecord(form); }
    if (form.id === 'role-form') {
      event.preventDefault();
      withBusy(form, async () => {
        const role = new FormData(form).get('role');
        await api(`/api/users/${state.modal.id}/role`, { method: 'PATCH', body: { role } });
        $('#portal-dialog').close(); toast('Account access updated.'); await loadWorkspace();
      });
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'directory-search') { state.query = event.target.value; state.page = 1; renderResults(); }
    if (event.target.closest('#auth-form') && $('#auth-error')) $('#auth-error').hidden = true;
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'directory-city') { state.city = event.target.value; state.page = 1; renderResults(); }
    if (event.target.id === 'directory-sort') { state.sort = event.target.value; state.page = 1; renderResults(); }
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); return; }
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'reconnect') boot();
    else if (action === 'toggle-password') {
      const input = $('#password-input'); const visible = input.type === 'password'; input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(visible)); button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    } else if (action === 'logout') withBusy(button, async () => { await api('/api/auth/logout', { method: 'POST' }); state.user = null; location.replace('login.html'); }, '#logout-error');
    else if (action === 'reload') loadWorkspace();
    else if (action === 'create-university') editRecord('universities');
    else if (action === 'create-professor') editRecord('professors');
    else if (action === 'close-dialog') { if (!state.busy) $('#portal-dialog').close(); }
    else if (action === 'confirm-delete') withBusy(button, async () => { await api(`/${state.modal.kind}/${state.modal.id}`, { method: 'DELETE' }); $('#portal-dialog').close(); toast('Record deleted.'); await loadWorkspace(); });
    else if (action === 'clear-filters') { state.query = ''; state.city = ''; state.page = 1; renderWorkspace(); $('#directory-search').focus(); }
    else if (button.dataset.details) showDetails(button.dataset.kind, Number(button.dataset.details));
    else if (button.dataset.edit) editRecord(button.dataset.kind, Number(button.dataset.edit));
    else if (button.dataset.delete) confirmDelete(button.dataset.kind, Number(button.dataset.delete));
    else if (button.dataset.userRole) changeRole(Number(button.dataset.userRole));
    else if (button.dataset.bookmark) bookmark(button);
    else if (button.dataset.page) { state.page += button.dataset.page === 'next' ? 1 : -1; renderResults(); ($(`[data-page="${button.dataset.page}"]:not(:disabled)`) || $('[data-page]:not(:disabled)'))?.focus(); }
    else if (button.dataset.demoRole) {
      if (page === 'register') { location.href = `login.html?demoRole=${button.dataset.demoRole}`; return; }
      const form = $('#auth-form');
      form.elements.email.value = `${button.dataset.demoRole.toLowerCase()}@campus.local`;
      form.elements.password.value = 'CampusDemo2026!';
      $('#auth-error').hidden = true;
      form.querySelector('[type="submit"]').focus();
    }
  });

  window.addEventListener('hashchange', () => { if (expectedRole && state.user) route(true); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) boot(); });

  async function boot() {
    try { await session(); } catch (error) { state.connected = false; state.session = null; state.user = null; state.demo = false; }
    if (page === 'home') { home(); return; }
    if (page === 'login' || page === 'register') {
      if (state.user) { location.replace(rolePages[state.user.role]); return; }
      authPage();
      const role = new URLSearchParams(location.search).get('demoRole');
      if (state.demo && page === 'login' && Object.hasOwn(roleLabels, role)) $(`[data-demo-role="${role}"]`).click();
      return;
    }
    if (!state.connected) {
      $('#portal-root').innerHTML = `<main id="main" class="connection-page" tabindex="-1">${brand()}<h1>Your workspace needs a connection.</h1>${connectionNotice()}<a href="login.html" class="button secondary">Back to sign in</a></main>`;
      return;
    }
    if (!state.user) { location.replace('login.html'); return; }
    if (state.user.role !== expectedRole) { location.replace(rolePages[state.user.role]); return; }
    shell();
    $('#portal-dialog').addEventListener('cancel', (event) => { if (state.busy) event.preventDefault(); });
    route();
    await loadWorkspace();
  }

  boot();
})();
