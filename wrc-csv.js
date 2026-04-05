console.log('wrc-csv.js loaded!');

let csvFiles = [];
let lastCsvResults = null;

function parseTime(timeStr) {
  if (!timeStr || timeStr === "Nincs" || timeStr === "None") return null;
  try {
    timeStr = timeStr.replace(/(\.\d{3})\d+/g, '$1');
    const parts = timeStr.split(":");
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const secondsParts = parts[2].split(".");
      const seconds = parseInt(secondsParts[0]);
      const milliseconds = parseInt((secondsParts[1] || "0").padEnd(3, '0').substring(0, 3));
      return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const secondsParts = parts[1].split(".");
      const seconds = parseInt(secondsParts[0]);
      const milliseconds = parseInt((secondsParts[1] || "0").padEnd(3, '0').substring(0, 3));
      return minutes * 60000 + seconds * 1000 + milliseconds;
    }
  } catch (e) {
    console.debug('Time parse error:', e);
  }
  return null;
}

function formatTime(ms) {
  if (!ms) return t('csv_none');
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}

function formatTimeDifference(ms) {
  if (!ms) return "";
  const sign = ms >= 0 ? "+" : "-";
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const milliseconds = absMs % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  } else {
    return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}

function analyzeCSVData(csvData) {
  if (!csvData || csvData.length === 0) return [];
  const allNames = new Set();
  csvData.forEach(file => file.data.forEach(row => { if (row.DisplayName) allNames.add(row.DisplayName); }));
  const result = [];
  allNames.forEach(name => {
    const row = { name: name, vehicle: "", stages: {}, totalStages: 0, totalTime: 0, hasMissingStages: false };
    csvData.forEach(file => {
      const playerData = file.data.find(r => r.DisplayName === name);
      if (playerData) {
        const rawTime = playerData.Time;
        const parsedTimeMs = parseTime(rawTime);
        row.stages[file.filename] = parsedTimeMs ? formatTime(parsedTimeMs) : t('csv_none');
        row.totalStages++;
        if (!row.vehicle && playerData.Vehicle) row.vehicle = playerData.Vehicle;
        if (parsedTimeMs) {
          row.totalTime += parsedTimeMs;
        } else {
          row.hasMissingStages = true;
        }
      } else {
        row.hasMissingStages = true;
      }
    });
    result.push(row);
  });
  result.sort((a, b) => {
    if (a.hasMissingStages !== b.hasMissingStages) return a.hasMissingStages ? 1 : -1;
    if (a.totalStages !== b.totalStages) return b.totalStages - a.totalStages;
    return a.totalTime - b.totalTime;
  });
  if (result.length > 0) {
    const firstValidTime = result.find(r => !r.hasMissingStages)?.totalTime;
    result.forEach((row, index) => {
      row.position = index + 1;
      row.totalTimeFormatted = row.hasMissingStages ? "DNF" : formatTime(row.totalTime);
      if (firstValidTime && !row.hasMissingStages) row.diffToFirst = formatTimeDifference(row.totalTime - firstValidTime);
      else row.diffToFirst = "";
      if (index > 0) {
        const prevRow = result[index - 1];
        if (!row.hasMissingStages && !prevRow.hasMissingStages) row.diffToPrevious = formatTimeDifference(row.totalTime - prevRow.totalTime);
        else row.diffToPrevious = "";
      } else {
        row.diffToPrevious = "";
      }
      row.medal = "";
    });
  }
  return result;
}

function loadCSVFiles() {
  const fileInput = document.getElementById('csv-file-input');
  const fileList = document.getElementById('csv-file-list');
  const analyzeBtn = document.getElementById('csv-analyze-btn');
  if (!fileInput || !fileList || !analyzeBtn) return;

  if (fileInput.files.length === 0) {
    fileList.innerHTML = `<p style="color: #ff6b6b;">${t('csv_no_files_selected')}</p>`;
    analyzeBtn.style.display = 'none';
    return;
  }

  csvFiles = [];
  fileList.innerHTML = `<h5>${t('csv_selected_files')}</h5><ul>`;
  Array.from(fileInput.files).forEach((file, index) => {
    if (file.name.endsWith('.csv')) {
      const label = `CSV ${String(index + 1).padStart(2, '0')}`;
      csvFiles.push({ file, label, originalName: file.name });
      fileList.innerHTML += `<li>${label}: ${file.name}</li>`;
    }
  });
  fileList.innerHTML += '</ul>';

  if (csvFiles.length > 0) {
    analyzeBtn.style.display = 'block';
  } else {
    fileList.innerHTML += `<p style="color: #ff6b6b;">${t('csv_no_csv_files')}</p>`;
    analyzeBtn.style.display = 'none';
  }
}

function analyzeCSVFiles() {
  const resultsContainer = document.getElementById('csv-results-container');
  const tableContainer = resultsContainer?.querySelector('.csv-results-table');
  if (!resultsContainer || !tableContainer) return;

  if (csvFiles.length === 0) {
    tableContainer.innerHTML = `<p style="color: #ff6b6b; text-align: center;">${t('csv_no_files_selected')}</p>`;
    resultsContainer.style.display = 'block';
    return;
  }

  const promises = csvFiles.map(({ file, label }) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] ? values[index].trim() : '';
            });
            data.push(row);
          }
          resolve({ filename: label, data: data });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error(t('csv_file_read_error', { filename: file.name })));
      reader.readAsText(file);
    });
  });

  Promise.all(promises)
    .then(csvData => {
      lastCsvResults = analyzeCSVData(csvData);
      displayCSVResults(lastCsvResults);
      resultsContainer.style.display = 'block';
    })
    .catch(error => {
      console.error(t('csv_processing_error'), error);
      tableContainer.innerHTML = `<p style="color: #ff6b6b; text-align: center;">${t('csv_processing_error')} ${error.message}</p>`;
      resultsContainer.style.display = 'block';
    });
}

function displayCSVResults(results) {
  const tableContainer = document.querySelector('.csv-results-table');
  if (!tableContainer) return;

  if (results.length === 0) {
    tableContainer.innerHTML = `<p style="color: #ff6b6b; text-align: center;">${t('csv_no_results')}</p>`;
    return;
  }

  const stageNames = Object.keys(results[0].stages);
  let tableHTML = `
    <div class="csv-table-wrapper">
      <table class="csv-results-table">
        <thead>
          <tr>
            <th>${t('csv_position')}</th>
            <th>${t('csv_medal')}</th>
            <th>${t('csv_name')}</th>
            <th>${t('csv_vehicle')}</th>
            ${stageNames.map(stage => `<th>${stage}</th>`).join('')}
            <th>${t('csv_completed')}</th>
            <th>${t('csv_incomplete')}</th>
            <th>${t('csv_total_time')}</th>
            <th>${t('csv_diff_to_first')}</th>
            <th>${t('csv_diff_to_previous')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  results.forEach((row, index) => {
    const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
    const dnfClass = row.hasMissingStages ? 'dnf-row' : '';
    tableHTML += `
      <tr class="${rowClass} ${dnfClass}">
        <td>${row.position}</td>
        <td>${row.medal}</td>
        <td>${row.name}</td>
        <td>${row.vehicle}</td>
        ${stageNames.map(stage => `<td>${row.stages[stage] || t('csv_none')}</td>`).join('')}
        <td>${row.totalStages}</td>
        <td>${row.hasMissingStages ? t('csv_yes') : t('csv_no')}</td>
        <td>${row.totalTimeFormatted}</td>
        <td>${row.diffToFirst}</td>
        <td>${row.diffToPrevious}</td>
      </tr>
    `;
  });

  tableHTML += `</tbody></table></div>`;
  tableContainer.innerHTML = tableHTML;
}

function initializeCsvAnalysisPanel(extractorInstance) {
  const container = document.getElementById('wrc-csv-content');
  if (!container) {
    return false;
  }

  container.innerHTML = `
    <h4 style="color: #ff4747; margin-bottom: 15px;">${t('csv_title')}</h4>
    <div class="csv-controls">
      <div class="csv-upload-section">
        <p>${t('csv_upload_section')}</p>
        <input type="file" id="csv-file-input" accept=".csv" multiple>
        <button id="csv-load-btn" class="wrc-btn">${t('csv_load_files')}</button>
      </div>
      <div id="csv-file-list" class="csv-file-list"></div>
      <button id="csv-analyze-btn" class="wrc-btn" style="display: none;">${t('csv_analyze')}</button>
    </div>
    <div id="csv-results-container" style="margin-top: 20px; display: none;">
      <div class="csv-results-table"></div>
    </div>
  `;

  document.getElementById('csv-load-btn')?.addEventListener('click', loadCSVFiles);
  document.getElementById('csv-analyze-btn')?.addEventListener('click', analyzeCSVFiles);
  
  return true;
}

window.addEventListener('wrc-language-changed', () => {
  const resultsContainer = document.getElementById('csv-results-container');
  if (resultsContainer && resultsContainer.style.display === 'block') {
    const tableContainer = resultsContainer.querySelector('.csv-results-table');
    if (tableContainer && tableContainer.innerHTML.includes('<table')) {
      if (lastCsvResults) {
        displayCSVResults(lastCsvResults);
      }
    }
  }
});

window.initializeCsvAnalysisPanel = initializeCsvAnalysisPanel;