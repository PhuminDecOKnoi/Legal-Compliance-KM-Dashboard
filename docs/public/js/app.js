(function () {
  const appData = window.__APP_DATA__ || {};
  const appConfig = window.__APP_CONFIG__ || {};
  const locale = document.body.dataset.locale || 'en';

  function updateQuery(params) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    window.location.href = url.toString();
  }

  function initLanguageSwitch() {
    const select = document.getElementById('lang-switch');
    if (!select) return;
    select.addEventListener('change', () => {
      localStorage.setItem('dashboard-lang', select.value);
      if (appConfig.staticMode && appConfig.langSwitch && appConfig.langSwitch[select.value]) {
        window.location.href = appConfig.langSwitch[select.value];
        return;
      }
      updateQuery({ lang: select.value });
    });
  }

  async function initRefresh() {
    const button = document.getElementById('refresh-data');
    if (!button) return;
    const originalText = button.textContent;
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = locale === 'th' ? 'กำลังรีเฟรช...' : 'Refreshing...';
      try {
        const response = await fetch('/api/refresh', { method: 'POST' });
        if (!response.ok) throw new Error('Refresh failed');
        window.location.reload();
      } catch (error) {
        alert(error.message);
        button.textContent = originalText;
      } finally {
        button.disabled = false;
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function wrapLabel(label, maxLineLength, maxLines) {
    const text = String(label || '').trim();
    if (!text) return [''];
    if (text.includes(' ')) {
      const words = text.split(/\s+/);
      const lines = [];
      let current = '';
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxLineLength || !current) current = next;
        else {
          lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      return lines.slice(0, maxLines);
    }
    const chunks = [];
    for (let index = 0; index < text.length; index += maxLineLength) {
      chunks.push(text.slice(index, index + maxLineLength));
    }
    return chunks.slice(0, maxLines);
  }

  function drawBarChart(container, data) {
    if (!data.length) {
      container.innerHTML = `<p>${locale === 'th' ? 'ไม่มีข้อมูล' : 'No data available.'}</p>`;
      return;
    }

    const width = 640;
    const height = 320;
    const padding = { top: 24, right: 20, bottom: 96, left: 32 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const max = Math.max(...data.map((item) => item.count), 1);
    const barWidth = innerWidth / data.length;

    const baseline = `<line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#d8e1ea" />`;
    const bars = data.map((item, index) => {
      const barHeight = (innerHeight * item.count) / max;
      const x = padding.left + index * barWidth + 8;
      const y = height - padding.bottom - barHeight;
      const widthValue = Math.max(barWidth - 16, 18);
      const labelLines = wrapLabel(item.shortLabel || item.label, 12, 3);
      return `
        <rect x="${x}" y="${y}" width="${widthValue}" height="${barHeight}" rx="8" fill="#1e5a96"></rect>
        <text class="value-label" x="${x + widthValue / 2}" y="${y - 8}" text-anchor="middle">${item.count}</text>
        <text class="axis-label" x="${x + widthValue / 2}" y="${height - padding.bottom + 18}" text-anchor="middle">
          ${labelLines.map((line, lineIndex) => `<tspan x="${x + widthValue / 2}" dy="${lineIndex === 0 ? 0 : 14}">${escapeHtml(line)}</tspan>`).join('')}
        </text>
      `;
    }).join('');

    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Bar chart">${baseline}${bars}</svg>`;
  }

  function drawLineChart(container, data) {
    if (!data.length) {
      container.innerHTML = `<p>${locale === 'th' ? 'ไม่มีข้อมูล' : 'No data available.'}</p>`;
      return;
    }

    const width = 640;
    const height = 320;
    const padding = { top: 18, right: 18, bottom: 56, left: 36 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const max = Math.max(...data.map((item) => item.count), 1);
    const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
    const yTickCount = Math.min(max + 1, 5);
    const yTicks = Array.from({ length: yTickCount }, (_, index) =>
      Math.round((max / Math.max(yTickCount - 1, 1)) * index)
    ).reverse();

    const points = data.map((item, index) => ({
      x: padding.left + index * stepX,
      y: height - padding.bottom - (innerHeight * item.count) / max,
      count: item.count,
      shortLabel: item.shortLabel || item.label
    }));

    const labelStep = Math.max(Math.ceil(data.length / 8), 1);
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const grid = yTicks.map((tick) => {
      const y = height - padding.bottom - (innerHeight * tick) / max;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e7edf3"></line>
        <text class="axis-label" x="${padding.left - 8}" y="${y + 4}" text-anchor="end">${tick}</text>
      `;
    }).join('');

    const markers = points.map((point, index) => `
      <circle cx="${point.x}" cy="${point.y}" r="4" fill="#1e5a96"></circle>
      ${index % labelStep === 0 || index === points.length - 1
        ? `<text class="axis-label" x="${point.x}" y="${height - 14}" text-anchor="middle">${escapeHtml(point.shortLabel)}</text>`
        : ''}
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Line chart">
        ${grid}
        <path d="${path}" fill="none" stroke="#1e5a96" stroke-width="3"></path>
        ${markers}
      </svg>
    `;
  }

  function initCharts() {
    document.querySelectorAll('.chart').forEach((container) => {
      const data = JSON.parse(container.getAttribute('data-chart') || '[]');
      const type = container.getAttribute('data-chart-type');
      if (type === 'line') drawLineChart(container, data);
      else drawBarChart(container, data);
    });
  }

  function renderRecordDetail(record) {
    const panel = document.getElementById('record-detail');
    if (!panel || !record) return;

    const labels = locale === 'th'
      ? {
          title: 'รายละเอียดรายการ',
          legalTitle: 'ชื่อกฎหมาย/ข้อกำหนด',
          category: 'หมวด',
          reference: 'เลขอ้างอิง',
          status: 'สถานะ',
          validity: 'สถานะการบังคับใช้',
          effectiveDate: 'วันที่มีผล',
          requirements: 'สาระสำคัญ',
          guidance: 'แนวทางดำเนินการ',
          requiredAction: 'สิ่งที่ต้องดำเนินการ',
          link: 'ลิงก์อ้างอิง',
          flags: 'ประเด็นคุณภาพข้อมูล',
          none: 'ไม่มี'
        }
      : {
          title: 'Record Details',
          legalTitle: 'Title',
          category: 'Category',
          reference: 'Reference',
          status: 'Status',
          validity: 'Validity',
          effectiveDate: 'Effective Date',
          requirements: 'Requirements',
          guidance: 'Implementation Guidance',
          requiredAction: 'Required Action',
          link: 'Legal Reference Link',
          flags: 'Data Quality Flags',
          none: 'None'
        };

    panel.innerHTML = `
      <div class="panel-header"><h2>${labels.title}</h2></div>
      <div class="detail-section">
        <div class="detail-row"><span>${labels.legalTitle}</span><strong>${record.legalTitle || '-'}</strong></div>
        <div class="detail-row"><span>${labels.category}</span><strong>${record.category || '-'}</strong></div>
        <div class="detail-row"><span>${labels.reference}</span><strong>${record.referenceNo || '-'}</strong></div>
        <div class="detail-row"><span>${labels.status}</span><strong>${record.statusNorm}</strong></div>
        <div class="detail-row"><span>${labels.validity}</span><strong>${record.validityNorm}</strong></div>
        <div class="detail-row"><span>${labels.effectiveDate}</span><strong>${record.effectiveDateDisplay || '-'}</strong></div>
        <div class="detail-row"><span>${labels.requirements}</span><div>${record.requirements || '-'}</div></div>
        <div class="detail-row"><span>${labels.guidance}</span><div>${record.guidanceEvidence || '-'}</div></div>
        <div class="detail-row"><span>${labels.requiredAction}</span><div>${record.requiredAction || '-'}</div></div>
        <div class="detail-row"><span>${labels.link}</span><div>${record.legalReferenceLink ? `<a href="${record.legalReferenceLink}" target="_blank" rel="noreferrer">${record.legalReferenceLink}</a>` : '-'}</div></div>
        <div class="detail-row"><span>${labels.flags}</span><div>${record.dataQualityFlags.length ? record.dataQualityFlags.join(', ') : labels.none}</div></div>
      </div>
    `;
  }

  function initRecordTable() {
    const table = document.getElementById('records-table');
    const form = document.getElementById('record-filters');
    if (!table || !form) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const recordsById = new Map((appData.records || []).map((record) => [record.id, record]));

    function applyFilters() {
      const formData = new FormData(form);
      const search = String(formData.get('search') || '').trim().toLowerCase();
      const category = formData.get('category');
      const status = formData.get('status');
      const validity = formData.get('validity');
      const year = formData.get('year');
      const month = formData.get('month');

      rows.forEach((row) => {
        const matches =
          (!search || row.dataset.search.includes(search)) &&
          (!category || row.dataset.category === category) &&
          (!status || row.dataset.status === status) &&
          (!validity || row.dataset.validity === validity) &&
          (!year || row.dataset.year === year) &&
          (!month || row.dataset.month === month);
        row.style.display = matches ? '' : 'none';
      });
    }

    form.addEventListener('input', applyFilters);
    form.addEventListener('change', applyFilters);
    form.addEventListener('reset', () => {
      setTimeout(applyFilters, 0);
    });

    table.addEventListener('click', (event) => {
      const trigger = event.target.closest('.record-trigger');
      if (!trigger) return;
      const row = trigger.closest('tr');
      renderRecordDetail(recordsById.get(row.dataset.recordId));
    });

    const firstRecord = appData.records && appData.records[0];
    if (firstRecord) renderRecordDetail(firstRecord);
  }

  initLanguageSwitch();
  initRefresh();
  initCharts();
  initRecordTable();
})();
