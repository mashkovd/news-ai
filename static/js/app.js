/* ===================================
   AI News Generator - Main JavaScript
   =================================== */

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    loadTheme();
    initScheduleButtons();
    loadSchedules();
});

// ===================================
// News Functions
// ===================================
async function loadNews(asset = '', source = '') {
    try {
        let url = '/news';
        const params = new URLSearchParams();
        if (asset) params.append('asset', asset);
        if (source) params.append('source', source);
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url);
        const newsItems = await response.json();
        renderNews(newsItems);
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

function applyFilters() {
    const asset = document.getElementById('filterAsset').value.trim();
    loadNews(asset, '');
}

function renderNews(newsItems) {
    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '';

    if (newsItems.length === 0) {
        newsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No news yet. Generate your first news!</p>
            </div>`;
        return;
    }

    newsItems.forEach(item => {
        const newsItemDiv = document.createElement('div');
        const itemSource = item.source || 'manual';
        newsItemDiv.className = `news-item ${itemSource}`;
        newsItemDiv.dataset.id = item.id;

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'news-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = item.published ? '' : 'editable-title';
        titleSpan.contentEditable = 'false';
        titleSpan.textContent = item.title || 'No Title';
        titleSpan.dataset.field = 'title';
        titleSpan.dataset.id = item.id;
        titleSpan.dataset.published = item.published ? 'true' : 'false';
        if (!item.published) {
            titleSpan.onblur = handleInlineEdit;
            titleSpan.onkeydown = handleEditKeydown;
        }

        const saveIndicator = document.createElement('span');
        saveIndicator.className = 'save-indicator';
        saveIndicator.id = `save-indicator-title-${item.id}`;
        saveIndicator.innerHTML = '<i class="fas fa-check"></i> Saved';

        const arrowSpan = document.createElement('span');
        arrowSpan.innerHTML = '<i class="fas fa-chevron-down"></i>';
        arrowSpan.onclick = (e) => {
            e.stopPropagation();
            toggleNewsBody(headerDiv);
        };

        titleSpan.onclick = (e) => {
            if (titleSpan.contentEditable === 'true') {
                e.stopPropagation();
                return;
            }
            toggleNewsBody(headerDiv);
        };

        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(saveIndicator);
        headerDiv.appendChild(arrowSpan);

        // Body
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'news-body';

        // Badges
        const badgesDiv = document.createElement('div');
        badgesDiv.style.cssText = 'display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;';

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${item.published ? 'published' : 'draft'}`;
        statusBadge.innerHTML = item.published ?
            '<i class="fas fa-check-circle"></i> Published' :
            '<i class="fas fa-edit"></i> Draft';
        badgesDiv.appendChild(statusBadge);

        const sourceBadge = document.createElement('span');
        sourceBadge.className = `source-badge ${itemSource}`;
        sourceBadge.innerHTML = itemSource === 'scheduled' ?
            '<i class="fas fa-clock"></i> Scheduled' :
            '<i class="fas fa-hand-pointer"></i> Manual';
        badgesDiv.appendChild(sourceBadge);

        bodyDiv.appendChild(badgesDiv);

        // Description - convert \n\n to paragraphs
        const descDiv = document.createElement('div');
        descDiv.className = 'news-description' + (item.published ? '' : ' editable');
        descDiv.contentEditable = item.published ? 'false' : 'true';
        descDiv.style.marginTop = '0.75rem';
        descDiv.dataset.field = 'description';
        descDiv.dataset.id = item.id;

        // Convert \n\n to paragraph breaks, single \n to line breaks
        const description = item.description || '';
        const paragraphs = description.split(/\n\n+/);
        descDiv.innerHTML = paragraphs
            .map(p => `<p style="margin-bottom: 0.75rem;">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');

        if (!item.published) {
            descDiv.onblur = handleInlineEdit;
            descDiv.onkeydown = handleEditKeydown;
        }
        bodyDiv.appendChild(descDiv);

        const descSaveIndicator = document.createElement('span');
        descSaveIndicator.className = 'save-indicator';
        descSaveIndicator.id = `save-indicator-description-${item.id}`;
        descSaveIndicator.innerHTML = '<i class="fas fa-check"></i> Saved';
        bodyDiv.appendChild(descSaveIndicator);

        // Assets
        let assets = [];
        try {
            assets = JSON.parse(item.assets);
        } catch (e) {
            assets = [];
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'news-actions';

        const actionsLeft = document.createElement('div');
        actionsLeft.className = 'news-actions-left';

        const publishBtn = document.createElement('button');
        publishBtn.className = `action-btn btn-publish ${item.published ? 'published' : ''}`;
        publishBtn.innerHTML = item.published ?
            '<i class="fas fa-check"></i> Published' :
            '<i class="fas fa-paper-plane"></i> Publish';
        publishBtn.onclick = () => publishNews(item.id, item.title, item.assets);
        if (item.published) publishBtn.disabled = true;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn btn-delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteBtn.onclick = () => deleteNews(item.id);

        actionsLeft.appendChild(publishBtn);
        actionsLeft.appendChild(deleteBtn);
        actionsDiv.appendChild(actionsLeft);

        if (assets && Array.isArray(assets) && assets.length > 0) {
            const assetsDiv = document.createElement('div');
            assetsDiv.className = 'assets-tag';
            assetsDiv.innerHTML = '<i class="fas fa-coins"></i> ' + assets.join(', ');
            actionsDiv.appendChild(assetsDiv);
        }

        bodyDiv.appendChild(actionsDiv);

        newsItemDiv.appendChild(headerDiv);
        newsItemDiv.appendChild(bodyDiv);
        newsList.appendChild(newsItemDiv);
    });
}

async function deleteNews(id) {
    if (!confirm('Are you sure you want to delete this news?')) return;
    try {
        await fetch(`/news/${id}`, { method: 'DELETE' });
        loadNews();
    } catch (error) {
        console.error('Error deleting news:', error);
    }
}

async function clearAllNews() {
    if (!confirm('Are you sure you want to delete ALL news?')) return;
    try {
        await fetch('/news/all', { method: 'DELETE' });
        loadNews();
    } catch (error) {
        console.error('Error clearing news:', error);
    }
}

// ===================================
// Publish Modal
// ===================================
async function publishNews(id, title, assets) {
    const modal = document.getElementById('publishModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalAssetName = document.getElementById('modalAssetName');
    const modalTerminal = document.getElementById('modalTerminal');
    const modalBtn = document.getElementById('modalBtn');

    let assetsList = [];
    try {
        assetsList = JSON.parse(assets);
    } catch (e) {
        assetsList = [assets];
    }
    const assetName = Array.isArray(assetsList) ? assetsList.join(', ') : assets;

    // Reset modal
    modalIcon.innerHTML = '<i class="fas fa-spinner"></i>';
    modalIcon.classList.add('sending');
    modalTitle.textContent = 'Publishing News';
    modalSubtitle.textContent = 'Sending to terminal...';
    modalAssetName.textContent = assetName;
    modalTerminal.innerHTML = '<div class="modal-terminal-line">Initializing connection...</div>';
    modalBtn.style.display = 'none';

    modal.classList.add('show');

    await delay(500);
    addTerminalLine(modalTerminal, 'Connecting to news terminal...');

    await delay(700);
    addTerminalLine(modalTerminal, `Preparing news: "${title.substring(0, 40)}..."`);

    await delay(600);
    addTerminalLine(modalTerminal, `Asset: ${assetName}`);

    try {
        await delay(500);
        addTerminalLine(modalTerminal, 'Sending to publication queue...');

        const response = await fetch(`/news/${id}/publish`, { method: 'POST' });

        await delay(800);

        if (response.ok) {
            addTerminalLine(modalTerminal, '✓ News published successfully!');
            modalIcon.classList.remove('sending');
            modalIcon.innerHTML = '<i class="fas fa-check"></i>';
            modalTitle.textContent = 'Published!';
            modalSubtitle.textContent = 'News has been sent to terminal';
            modalBtn.style.display = 'block';
            loadNews();
        } else {
            throw new Error('Publication failed');
        }
    } catch (error) {
        addTerminalLine(modalTerminal, '✗ Error: ' + error.message);
        modalIcon.classList.remove('sending');
        modalIcon.innerHTML = '<i class="fas fa-times"></i>';
        modalIcon.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #dc3545 100%)';
        modalTitle.textContent = 'Error';
        modalSubtitle.textContent = 'Failed to publish news';
        modalBtn.style.display = 'block';
        console.error('Error publishing news:', error);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function addTerminalLine(terminal, text) {
    const line = document.createElement('div');
    line.className = 'modal-terminal-line';
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function closeModal() {
    const modal = document.getElementById('publishModal');
    modal.classList.remove('show');
    document.getElementById('modalIcon').style.background = '';
}

// ===================================
// Inline Editing
// ===================================
const originalValues = {};

function handleEditKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey && e.target.dataset.field === 'title') {
        e.preventDefault();
        e.target.blur();
    }
    if (e.key === 'Escape') {
        const id = e.target.dataset.id;
        const field = e.target.dataset.field;
        const key = `${id}-${field}`;
        if (originalValues[key] !== undefined) {
            e.target.textContent = originalValues[key];
        }
        e.target.blur();
    }
}

async function handleInlineEdit(e) {
    const id = e.target.dataset.id;
    const field = e.target.dataset.field;

    // For description, extract text from paragraphs and convert back to newlines
    let newValue;
    if (field === 'description') {
        const paragraphs = e.target.querySelectorAll('p');
        if (paragraphs.length > 0) {
            newValue = Array.from(paragraphs)
                .map(p => p.innerText.trim())
                .join('\n\n');
        } else {
            newValue = e.target.innerText.trim();
        }
    } else {
        newValue = e.target.textContent.trim();
    }

    const key = `${id}-${field}`;

    if (originalValues[key] === undefined) {
        originalValues[key] = newValue;
        return;
    }

    if (originalValues[key] === newValue) {
        return;
    }

    try {
        const updateData = {};
        updateData[field] = newValue;

        const response = await fetch(`/news/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const indicator = document.getElementById(`save-indicator-${field}-${id}`);
            if (indicator) {
                indicator.classList.add('show');
                setTimeout(() => indicator.classList.remove('show'), 2000);
            }
            originalValues[key] = newValue;
        }
    } catch (error) {
        console.error('Error saving:', error);
        e.target.textContent = originalValues[key];
    }
}

document.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('editable')) {
        const id = e.target.dataset.id;
        const field = e.target.dataset.field;
        const key = `${id}-${field}`;

        // For description, extract text from paragraphs
        if (field === 'description') {
            const paragraphs = e.target.querySelectorAll('p');
            if (paragraphs.length > 0) {
                originalValues[key] = Array.from(paragraphs)
                    .map(p => p.innerText.trim())
                    .join('\n\n');
            } else {
                originalValues[key] = e.target.innerText.trim();
            }
        } else {
            originalValues[key] = e.target.textContent.trim();
        }
    }
});

function toggleNewsBody(header) {
    const body = header.nextElementSibling;
    const isOpen = body.classList.toggle('open');
    const arrowIcon = header.querySelector('span:last-child');
    arrowIcon.innerHTML = isOpen ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';

    const titleSpan = header.querySelector('span:first-child');
    if (titleSpan && titleSpan.dataset.published !== 'true') {
        if (isOpen) {
            titleSpan.classList.add('editable');
            titleSpan.contentEditable = 'true';
        } else {
            titleSpan.classList.remove('editable');
            titleSpan.contentEditable = 'false';
        }
    }
}

// ===================================
// Form Submission
// ===================================
async function submitForm() {
    const asset = document.getElementById('asset').value;
    const language = document.getElementById('language').value;
    const resultDiv = document.getElementById('result');
    const btn = document.getElementById('submitBtn');

    if (!asset) {
        alert("Please enter an asset.");
        return;
    }

    resultDiv.style.display = 'none';
    resultDiv.classList.remove('error-box');
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const response = await fetch('/get-asset-value', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asset, language }),
        });
        const data = await response.json();

        btn.disabled = false;
        btn.innerHTML = originalHTML;

        if (data.error) {
            showResult(false, 'Error', data.error);
            return;
        }

        loadNews();
        showResult(true, 'Success!', `News for ${asset.toUpperCase()} has been generated`);
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showResult(false, 'Connection Error', 'Unable to connect to server');
        console.error('Error:', error);
    }
}

function showResult(isSuccess, title, subtitle) {
    const resultDiv = document.getElementById('result');
    const icon = resultDiv.querySelector('.success-icon i');
    const titleEl = resultDiv.querySelector('.success-title');
    const subtitleEl = resultDiv.querySelector('.success-subtitle');

    if (isSuccess) {
        resultDiv.classList.remove('error-box');
        icon.className = 'fas fa-check';
    } else {
        resultDiv.classList.add('error-box');
        icon.className = 'fas fa-times';
    }

    titleEl.textContent = title;
    subtitleEl.textContent = subtitle;
    resultDiv.style.display = 'block';

    resultDiv.style.animation = 'none';
    resultDiv.offsetHeight;
    resultDiv.style.animation = 'slideUp 0.4s ease-out';
}

// ===================================
// Theme Toggle
// ===================================
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const isLight = body.classList.toggle('light-theme');

    themeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeIcon').className = 'fas fa-sun';
    }
}

// ===================================
// Asset Autocomplete
// ===================================
const assetData = [
    { category: 'Crypto', symbol: 'BTCUSDT', name: 'Bitcoin / USDT' },
    { category: 'Crypto', symbol: 'ETHUSDT', name: 'Ethereum / USDT' },
    { category: 'Crypto', symbol: 'BNBUSDT', name: 'Binance Coin / USDT' },
    { category: 'Crypto', symbol: 'XRPUSDT', name: 'Ripple / USDT' },
    { category: 'Crypto', symbol: 'SOLUSDT', name: 'Solana / USDT' },
    { category: 'Crypto', symbol: 'ADAUSDT', name: 'Cardano / USDT' },
    { category: 'Crypto', symbol: 'DOGEUSDT', name: 'Dogecoin / USDT' },
    { category: 'Crypto', symbol: 'LTCUSDT', name: 'Litecoin / USDT' },
    { category: 'Crypto', symbol: 'DOTUSDT', name: 'Polkadot / USDT' },
    { category: 'Crypto', symbol: 'MATICUSDT', name: 'Polygon / USDT' },
    { category: 'Forex', symbol: 'EURUSD', name: 'Euro / US Dollar' },
    { category: 'Forex', symbol: 'GBPUSD', name: 'British Pound / US Dollar' },
    { category: 'Forex', symbol: 'USDJPY', name: 'US Dollar / Japanese Yen' },
    { category: 'Forex', symbol: 'USDCHF', name: 'US Dollar / Swiss Franc' },
    { category: 'Forex', symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar' },
    { category: 'Forex', symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar' },
    { category: 'Commodities', symbol: 'XAUUSD', name: 'Gold / US Dollar' },
    { category: 'Commodities', symbol: 'XAGUSD', name: 'Silver / US Dollar' },
    { category: 'Stocks', symbol: 'AAPL', name: 'Apple Inc.' },
    { category: 'Stocks', symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { category: 'Stocks', symbol: 'MSFT', name: 'Microsoft Corp.' },
    { category: 'Stocks', symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { category: 'Stocks', symbol: 'TSLA', name: 'Tesla Inc.' },
    { category: 'Stocks', symbol: 'META', name: 'Meta Platforms Inc.' },
    { category: 'Stocks', symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { category: 'Indices', symbol: 'SPX500', name: 'S&P 500 Index' },
    { category: 'Indices', symbol: 'NAS100', name: 'Nasdaq 100 Index' },
    { category: 'Indices', symbol: 'US30', name: 'Dow Jones Index' },
];

function showAssetDropdown() {
    const dropdown = document.getElementById('assetDropdown');
    const input = document.getElementById('asset');
    filterAssets(input.value);
    dropdown.classList.add('show');
}

function hideAssetDropdown() {
    const dropdown = document.getElementById('assetDropdown');
    dropdown.classList.remove('show');
}

function filterAssets(query) {
    const dropdown = document.getElementById('assetDropdown');
    const upperQuery = query.toUpperCase();

    const filtered = assetData.filter(item =>
        item.symbol.includes(upperQuery) ||
        item.name.toUpperCase().includes(upperQuery)
    );

    const grouped = {};
    filtered.forEach(item => {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    });

    let html = '';
    for (const category in grouped) {
        html += `<div class="autocomplete-category"><i class="fas fa-folder"></i> ${category}</div>`;
        grouped[category].forEach(item => {
            html += `
                <div class="autocomplete-item" onclick="selectAsset('${item.symbol}')">
                    <span class="autocomplete-item-symbol">${item.symbol}</span>
                    <span class="autocomplete-item-name">${item.name}</span>
                </div>
            `;
        });
    }

    if (filtered.length === 0) {
        html = `<div class="autocomplete-item" style="justify-content: center; color: #666;">
            <span>Type to search assets...</span>
        </div>`;
    }

    dropdown.innerHTML = html;
}

function selectAsset(symbol) {
    document.getElementById('asset').value = symbol;
    hideAssetDropdown();
}

// Schedule Asset Autocomplete
function showScheduleAssetDropdown() {
    const dropdown = document.getElementById('scheduleAssetDropdown');
    const input = document.getElementById('scheduleAsset');
    filterScheduleAssets(input.value);
    dropdown.classList.add('show');
}

function hideScheduleAssetDropdown() {
    const dropdown = document.getElementById('scheduleAssetDropdown');
    dropdown.classList.remove('show');
}

function filterScheduleAssets(query) {
    const dropdown = document.getElementById('scheduleAssetDropdown');
    const upperQuery = query.toUpperCase();

    const filtered = assetData.filter(item =>
        item.symbol.includes(upperQuery) ||
        item.name.toUpperCase().includes(upperQuery)
    );

    const grouped = {};
    filtered.forEach(item => {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    });

    let html = '';
    for (const category in grouped) {
        html += `<div class="autocomplete-category"><i class="fas fa-folder"></i> ${category}</div>`;
        grouped[category].forEach(item => {
            html += `
                <div class="autocomplete-item" onclick="selectScheduleAsset('${item.symbol}')">
                    <span class="autocomplete-item-symbol">${item.symbol}</span>
                    <span class="autocomplete-item-name">${item.name}</span>
                </div>
            `;
        });
    }

    if (filtered.length === 0) {
        html = `<div class="autocomplete-item" style="justify-content: center; color: #666;">
            <span>Type to search assets...</span>
        </div>`;
    }

    dropdown.innerHTML = html;
}

function selectScheduleAsset(symbol) {
    document.getElementById('scheduleAsset').value = symbol;
    hideScheduleAssetDropdown();
}

// ===================================
// Schedule Functions
// ===================================
let selectedDays = [];
let selectedTimes = [];
let selectedImpacts = ['high'];
let scheduleMode = 'calendar'; // 'calendar' or 'asset'

function initScheduleButtons() {
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = btn.dataset.day;
            btn.classList.toggle('active');
            if (selectedDays.includes(day)) {
                selectedDays = selectedDays.filter(d => d !== day);
            } else {
                selectedDays.push(day);
            }
        });
    });

    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const time = btn.dataset.time;
            btn.classList.toggle('active');
            if (selectedTimes.includes(time)) {
                selectedTimes = selectedTimes.filter(t => t !== time);
            } else {
                selectedTimes.push(time);
            }
        });
    });

    // Impact buttons
    document.querySelectorAll('.impact-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const impact = btn.dataset.impact;
            btn.classList.toggle('active');
            if (selectedImpacts.includes(impact)) {
                selectedImpacts = selectedImpacts.filter(i => i !== impact);
            } else {
                selectedImpacts.push(impact);
            }
        });
    });
}

function setScheduleMode(mode) {
    console.log('setScheduleMode called with:', mode);
    scheduleMode = mode;

    // Update mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show/hide content
    const calendarContent = document.getElementById('calendarModeContent');
    const assetContent = document.getElementById('assetModeContent');

    console.log('calendarContent:', calendarContent);
    console.log('assetContent:', assetContent);

    if (mode === 'calendar') {
        calendarContent.classList.remove('hidden');
        assetContent.classList.add('hidden');
    } else {
        calendarContent.classList.add('hidden');
        assetContent.classList.remove('hidden');
    }
}

function toggleScheduleSection() {
    const body = document.getElementById('scheduleBody');
    const icon = document.getElementById('scheduleToggleIcon');
    body.classList.toggle('open');
    icon.classList.toggle('open');
}

async function loadSchedules() {
    try {
        const response = await fetch('/schedules');
        const schedules = await response.json();
        renderSchedules(schedules);
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
}

function renderSchedules(schedules) {
    const list = document.getElementById('scheduleList');
    if (!schedules || schedules.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #666; font-size: 0.8rem; padding: 1rem;">No schedules yet</div>';
        return;
    }

    list.innerHTML = schedules.map(schedule => {
        let days = [];
        let times = [];
        try {
            days = JSON.parse(schedule.days);
            times = JSON.parse(schedule.times);
        } catch (e) {}

        const isCalendar = schedule.asset === 'ECONOMIC_CALENDAR';
        const displayName = isCalendar ?
            '<i class="fas fa-calendar-alt"></i> Economic Calendar' :
            schedule.asset;
        const badgeClass = isCalendar ? 'schedule-badge-calendar' : 'schedule-badge-asset';

        return `
            <div class="schedule-item">
                <div class="schedule-item-info">
                    <div class="schedule-item-asset ${badgeClass}">${displayName}</div>
                    <div class="schedule-item-details">
                        ${days.join(', ')} • ${times.join(', ')} CET
                    </div>
                </div>
                <div class="schedule-item-actions">
                    <button class="schedule-action-btn schedule-run-btn"
                            onclick="runScheduleNow(${schedule.id})"
                            title="Run Now">
                        <i class="fas fa-play-circle"></i>
                    </button>
                    <button class="schedule-action-btn schedule-toggle-btn ${schedule.is_active ? '' : 'inactive'}"
                            onclick="toggleSchedule(${schedule.id})"
                            title="${schedule.is_active ? 'Active' : 'Paused'}">
                        <i class="fas fa-${schedule.is_active ? 'play' : 'pause'}"></i>
                    </button>
                    <button class="schedule-action-btn schedule-delete-btn" onclick="deleteSchedule(${schedule.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function createSchedule() {
    const language = document.getElementById('language').value;

    let asset = '';
    let mode = scheduleMode;

    if (mode === 'asset') {
        asset = document.getElementById('scheduleAsset').value.trim().toUpperCase();
        if (!asset) {
            alert('Please enter an asset');
            return;
        }
    } else {
        // Calendar mode - use economic calendar
        if (selectedImpacts.length === 0) {
            alert('Please select at least one impact level');
            return;
        }
        asset = 'ECONOMIC_CALENDAR';
    }

    if (selectedDays.length === 0) {
        alert('Please select at least one day');
        return;
    }
    if (selectedTimes.length === 0) {
        alert('Please select at least one time');
        return;
    }

    const btn = document.getElementById('scheduleBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    try {
        const response = await fetch('/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                asset,
                language,
                days: selectedDays,
                times: selectedTimes,
                mode: mode,
                impacts: selectedImpacts
            })
        });

        if (response.ok) {
            // Reset selections
            selectedDays = [];
            selectedTimes = [];
            document.querySelectorAll('.day-btn.active, .time-btn.active').forEach(btn => btn.classList.remove('active'));
            if (mode === 'asset') {
                document.getElementById('scheduleAsset').value = '';
            }
            loadSchedules();
        }
    } catch (error) {
        console.error('Error creating schedule:', error);
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Add Schedule';
}

async function toggleSchedule(id) {
    try {
        await fetch(`/schedules/${id}/toggle`, { method: 'PUT' });
        loadSchedules();
    } catch (error) {
        console.error('Error toggling schedule:', error);
    }
}

async function deleteSchedule(id) {
    if (!confirm('Delete this schedule?')) return;
    try {
        await fetch(`/schedules/${id}`, { method: 'DELETE' });
        loadSchedules();
    } catch (error) {
        console.error('Error deleting schedule:', error);
    }
}

async function runScheduleNow(id) {
    const btn = event.target.closest('.schedule-run-btn');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const response = await fetch(`/schedules/${id}/run`, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            // Reload news list to show the new generated news
            loadNews();

            // Show success feedback
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 2000);
        } else {
            throw new Error(data.detail || 'Failed to run schedule');
        }
    } catch (error) {
        console.error('Error running schedule:', error);
        btn.innerHTML = '<i class="fas fa-times"></i>';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }, 2000);
    }
}

