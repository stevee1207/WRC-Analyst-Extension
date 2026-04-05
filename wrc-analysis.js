let mainExtractor = null;

function timeStringToMs(timeStr) {
  if (!timeStr || timeStr === '--') return Infinity;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return (parseInt(parts[0]) * 60 * 1000) + (parseFloat(parts[1]) * 1000);
  }
  return parseFloat(parts[0]) * 1000;
}

function naturalStageSort(a, b) {
  const numA = parseInt(a.match(/S(\d+)/)?.[1]) || 0;
  const numB = parseInt(b.match(/S(\d+)/)?.[1]) || 0;
  return numA - numB;
}

function getSortedStageKeys(data) {
  return Object.keys(data)
    .filter(k => k.includes('_stage'))
    .sort(naturalStageSort);
}

function msToTimeString(ms) {
  if (!isFinite(ms)) return '--';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.round(ms % 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function createLineChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth;
  if (width === 0) return;
  const height = 300;
  const margin = { top: 20, right: 150, bottom: 40, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const allValues = data.datasets.flatMap(ds => ds.data.filter(v => v !== null));
  if (allValues.length === 0) return;
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue;
  if (range === 0) return;
  const xStep = chartWidth / (data.labels.length - 1 || 1);
  const yScale = chartHeight / (range * 1.1);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.overflow = 'visible';
  const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axesGroup.innerHTML = `
    <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#444" />
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#444" />
  `;
  svg.appendChild(axesGroup);
  const fontSize = data.labels.length > 15 ? '10px' : '12px';
  const labelRotation = data.labels.length > 15 ? -45 : 0;
  data.labels.forEach((label, i) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left + i * xStep);
    text.setAttribute('y', height - 10);
    text.setAttribute('text-anchor', labelRotation ? 'end' : 'middle');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', fontSize);
    if (labelRotation) {
      text.setAttribute('transform', `rotate(${labelRotation} ${margin.left + i * xStep} ${height - 15})`);
    }
    text.textContent = label.split('_')[0];
    svg.appendChild(text);
  });
  for (let i = 0; i <= 5; i++) {
    const value = minValue - (range * 0.05) + (range * 1.1 / 5) * i;
    const y = margin.top + chartHeight - ((value - minValue + range * 0.05) * yScale);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '12px');
    text.textContent = value.toFixed(1);
    svg.appendChild(text);
  }
  data.datasets.forEach(dataset => {
    const pathData = dataset.data.map((value, i) => {
      if (value === null) return '';
      const x = margin.left + i * xStep;
      const y = margin.top + chartHeight - ((value - minValue + range * 0.05) * yScale);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', dataset.color);
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);
    dataset.data.forEach((value, i) => {
      if (value === null) return;
      const x = margin.left + i * xStep;
      const y = margin.top + chartHeight - ((value - minValue + range * 0.05) * yScale);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', dataset.color);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${dataset.label}: ${msToTimeString(value * 1000)}`;
      circle.appendChild(title);
      svg.appendChild(circle);
    });
  });
  const legendY = margin.top + 20;
  data.datasets.forEach((dataset, i) => {
    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legendGroup.innerHTML = `
      <rect x="${width - margin.right + 10}" y="${legendY + i * 20}" width="15" height="3" fill="${dataset.color}"></rect>
      <text x="${width - margin.right + 30}" y="${legendY + i * 20 + 5}" fill="#ccc" font-size="12px">${dataset.label}</text>
    `;
    svg.appendChild(legendGroup);
  });
  container.appendChild(svg);
}

function createBarChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth;
  if (width === 0) return;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...data.datasets[0].data, 1);
  const barWidth = chartWidth / data.labels.length * 0.6;
  const xStep = chartWidth / data.labels.length;
  const yScale = chartHeight / (maxValue * 1.1);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.overflow = 'visible';
  const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axesGroup.innerHTML = `
    <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#444" />
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#444" />
  `;
  svg.appendChild(axesGroup);
  data.datasets[0].data.forEach((value, i) => {
    const barHeight = value * yScale;
    const x = margin.left + i * xStep + (xStep - barWidth) / 2;
    const y = margin.top + chartHeight - barHeight;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', data.datasets[0].color);
    svg.appendChild(rect);
  });
  const fontSize = data.labels.length > 15 ? '10px' : '12px';
  const labelRotation = data.labels.length > 15 ? -45 : 0;
  data.labels.forEach((label, i) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left + i * xStep + xStep/2);
    text.setAttribute('y', height - 10);
    text.setAttribute('text-anchor', labelRotation ? 'end' : 'middle');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', fontSize);
    if (labelRotation) {
      text.setAttribute('transform', `rotate(${labelRotation} ${margin.left + i * xStep + xStep/2} ${height - 15})`);
    }
    text.textContent = label.split('_')[0];
    svg.appendChild(text);
  });
  for (let i = 0; i <= 5; i++) {
    const value = (maxValue * 1.1 / 5) * i;
    const y = margin.top + chartHeight - (value * yScale);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '12px');
    text.textContent = value.toFixed(1);
    svg.appendChild(text);
  }
  container.appendChild(svg);
}

function createHorizontalBarChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth;
  if (width === 0) return;
  const itemHeight = 28;
  const minHeight = 250;
  const calculatedHeight = data.labels.length * itemHeight;
  const height = Math.max(minHeight, calculatedHeight);
  const margin = { top: 20, right: 60, bottom: 20, left: 150 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...data.datasets[0].data, 1);
  const barHeight = Math.min(itemHeight * 0.8, (chartHeight / data.labels.length) * 0.8);
  const yStep = chartHeight / data.labels.length;
  const xScale = chartWidth / (maxValue * 1.1);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.overflow = 'visible';
  const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axesGroup.innerHTML = `
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#444" />
    <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#444" />
  `;
  svg.appendChild(axesGroup);
  data.labels.forEach((label, i) => {
    const barWidth = data.datasets[0].data[i] * xScale;
    const y = margin.top + i * yStep + (yStep - barHeight) / 2;
    const x = margin.left;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', y + barHeight / 2 + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '11px');
    text.textContent = label;
    svg.appendChild(text);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', data.datasets[0].color);
    svg.appendChild(rect);
  });
  for (let i = 0; i <= 5; i++) {
    const value = (maxValue * 1.1 / 5) * i;
    const x = margin.left + value * xScale;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', height - 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '12px');
    text.textContent = value.toFixed(1);
    svg.appendChild(text);
  }
  container.appendChild(svg);
}

function createBoxPlotChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth;
  if (width === 0) return;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const allTimes = data.datasets.flatMap(ds => ds.data.flat()).filter(t => isFinite(t));
  if (allTimes.length === 0) return;
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const range = maxTime - minTime;
  if (range === 0) return;
  const yScale = chartHeight / (range * 1.1);
  const barWidth = chartWidth / data.labels.length * 0.6;
  const xStep = chartWidth / data.labels.length;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.overflow = 'visible';
  const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axesGroup.innerHTML = `
    <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#444" />
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#444" />
  `;
  svg.appendChild(axesGroup);
  data.labels.forEach((label, i) => {
    const [min, avg, max] = data.datasets[0].data[i];
    if (!isFinite(min) || !isFinite(avg) || !isFinite(max)) return;
    const x = margin.left + i * xStep + xStep / 2;
    const minY = margin.top + chartHeight - (min - minTime + range * 0.05) * yScale;
    const minLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    minLine.setAttribute('x1', x - barWidth / 4);
    minLine.setAttribute('y1', minY);
    minLine.setAttribute('x2', x + barWidth / 4);
    minLine.setAttribute('y2', minY);
    minLine.setAttribute('stroke', data.datasets[0].color);
    svg.appendChild(minLine);
    const maxY = margin.top + chartHeight - (max - minTime + range * 0.05) * yScale;
    const maxLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    maxLine.setAttribute('x1', x - barWidth / 4);
    maxLine.setAttribute('y1', maxY);
    maxLine.setAttribute('x2', x + barWidth / 4);
    maxLine.setAttribute('y2', maxY);
    maxLine.setAttribute('stroke', data.datasets[0].color);
    svg.appendChild(maxLine);
    const avgY = margin.top + chartHeight - (avg - minTime + range * 0.05) * yScale;
    const avgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    avgRect.setAttribute('x', x - barWidth / 2);
    avgRect.setAttribute('y', avgY - 2);
    avgRect.setAttribute('width', barWidth);
    avgRect.setAttribute('height', 4);
    avgRect.setAttribute('fill', data.datasets[0].color);
    svg.appendChild(avgRect);
    const connector1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connector1.setAttribute('x1', x);
    connector1.setAttribute('y1', minY);
    connector1.setAttribute('x2', x);
    connector1.setAttribute('y2', avgY);
    connector1.setAttribute('stroke', data.datasets[0].color);
    svg.appendChild(connector1);
    const connector2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connector2.setAttribute('x1', x);
    connector2.setAttribute('y1', avgY);
    connector2.setAttribute('x2', x);
    connector2.setAttribute('y2', maxY);
    connector2.setAttribute('stroke', data.datasets[0].color);
    svg.appendChild(connector2);
  });
  const fontSize = data.labels.length > 15 ? '10px' : '12px';
  const labelRotation = data.labels.length > 15 ? -45 : 0;
  data.labels.forEach((label, i) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left + i * xStep + xStep / 2);
    text.setAttribute('y', height - 10);
    text.setAttribute('text-anchor', labelRotation ? 'end' : 'middle');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', fontSize);
    if (labelRotation) {
      text.setAttribute('transform', `rotate(${labelRotation} ${margin.left + i * xStep + xStep / 2} ${height - 15})`);
    }
    text.textContent = label;
    svg.appendChild(text);
  });
  for (let i = 0; i <= 5; i++) {
    const value = minTime - range * 0.05 + (range * 1.1 / 5) * i;
    const y = margin.top + chartHeight - (value - minTime + range * 0.05) * yScale;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '12px');
    text.textContent = msToTimeString(value);
    svg.appendChild(text);
  }
  container.appendChild(svg);
}

function createDeltaChart(containerId, user1, user2, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const width = container.clientWidth;
  if (width === 0) return;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const stageKeys = getSortedStageKeys(data);
  const deltas = stageKeys.map(key => {
    const stageData = data[key].stageData;
    const res1 = stageData?.find(r => r.player === user1);
    const res2 = stageData?.find(r => r.player === user2);
    if (res1 && res2 && isFinite(timeStringToMs(res1.time)) && isFinite(timeStringToMs(res2.time))) {
      return (timeStringToMs(res1.time) - timeStringToMs(res2.time)) / 1000;
    }
    return null;
  }).filter(d => d !== null);
  if (deltas.length === 0) {
    container.innerHTML = `<p style="color: #ccc; text-align: center;">${t('analysis_no_data_for_delta')}</p>`;
    return;
  }
  const maxDelta = Math.max(...deltas.map(Math.abs), 1);
  const barWidth = chartWidth / deltas.length * 0.6;
  const xStep = chartWidth / deltas.length;
  const yScale = chartHeight / (maxDelta * 2.2);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.overflow = 'visible';
  const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  zeroLine.setAttribute('x1', margin.left);
  zeroLine.setAttribute('y1', margin.top + chartHeight / 2);
  zeroLine.setAttribute('x2', margin.left + chartWidth);
  zeroLine.setAttribute('y2', margin.top + chartHeight / 2);
  zeroLine.setAttribute('stroke', '#888');
  zeroLine.setAttribute('stroke-dasharray', '5,5');
  svg.appendChild(zeroLine);
  deltas.forEach((delta, i) => {
    const barHeight = Math.abs(delta) * yScale;
    const x = margin.left + i * xStep + (xStep - barWidth) / 2;
    let y;
    if (delta > 0) {
      y = margin.top + chartHeight / 2 - barHeight;
    } else {
      y = margin.top + chartHeight / 2;
    }
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', delta > 0 ? '#ff4747' : '#4776ff');
    svg.appendChild(rect);
  });
  const fontSize = deltas.length > 15 ? '10px' : '12px';
  const labelRotation = deltas.length > 15 ? -45 : 0;
  deltas.forEach((_, i) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left + i * xStep + xStep / 2);
    text.setAttribute('y', height - 10);
    text.setAttribute('text-anchor', labelRotation ? 'end' : 'middle');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', fontSize);
    if (labelRotation) {
      text.setAttribute('transform', `rotate(${labelRotation} ${margin.left + i * xStep + xStep / 2} ${height - 15})`);
    }
    text.textContent = stageKeys[i].split('_')[0];
    svg.appendChild(text);
  });
  for (let i = 0; i <= 4; i++) {
    const value = (maxDelta * 2.2 / 4) * (i - 2);
    const y = margin.top + chartHeight / 2 - (value * yScale);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '12px');
    text.textContent = `${value.toFixed(1)}s`;
    svg.appendChild(text);
  }
  container.appendChild(svg);
}

function initializeAnalysisPanel(extractorInstance) {
  const analysisContent = document.getElementById('wrc-analysis-content');
  if (!analysisContent) {
    return false;
  }
  
  console.log('WRC Analysis Panel initialized successfully.');
  mainExtractor = extractorInstance;
  
  analysisContent.innerHTML = `
    <h4 style="color: #ff4747; margin-bottom: 15px;">${t('analysis_title')}</h4>
    <button id="wrc-start-analysis-btn" class="wrc-btn">${t('analysis_start_button')}</button>
    <div id="wrc-analysis-results-container" style="margin-top: 20px;"></div>
  `;

  document.getElementById('wrc-start-analysis-btn')?.addEventListener('click', startAnalysis);
  return true;
}

function startAnalysis() {
  const resultsContainer = document.getElementById('wrc-analysis-results-container');
  if (!resultsContainer) return;
  
  const extractedData = mainExtractor?.extractedData;
  if (!extractedData || Object.keys(extractedData).length === 0) {
    resultsContainer.innerHTML = `<p style="color: #ff6b6b; text-align: center;">${t('analysis_no_data')}</p>`;
    return;
  }
  renderAnalysis(resultsContainer, extractedData);
}

function renderAnalysis(container, data) {
  if (!container) return;
  
  const generalStats = calculateGeneralStats(data);
  const podiumFinishers = findPodiumFinishers(data);
  const bestCarResults = calculateBestCarResults(data);
  const allPlayers = getAllPlayers(data);
  const stageWins = calculateAllStageWins(data);
  const consistencyRatings = calculateConsistencyRatings(data);
  const carPerformance = calculateCarPerformance(data);
  
  container.innerHTML = `
    <div class="analysis-top-section">
      <div class="analysis-column">
        <h5>${t('analysis_location_general_data')}</h5>
        <div class="analysis-column-content">
          <p><strong>${t('analysis_event')}:</strong> ${generalStats.eventName}</p>
          <p><strong>${t('analysis_rally')}:</strong> ${generalStats.rallyName}</p>
          <p><strong>${t('analysis_total_distance')}:</strong> ${generalStats.totalDistance.toFixed(2)} km</p>
          <p><strong>${t('analysis_general_weather')}:</strong> ${generalStats.weather}</p>
          <p><strong>${t('analysis_starters')}:</strong> ${generalStats.starters} ${t('general_person')}</p>
          <p><strong>${t('analysis_finishers')}:</strong> ${generalStats.finishers} ${t('general_person')}</p>
        </div>
      </div>
      <div class="analysis-column">
        <h5>${t('analysis_biggest_wins')}</h5>
        <div class="analysis-column-content">
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${calculateStageWins(data).slice(0, 3).map(win => `<li><strong>${win.player}:</strong> +${win.margin}s (${win.stage})</li>`).join('')}
          </ul>
        </div>
      </div>
      <div class="analysis-column">
        <h5>${t('analysis_biggest_losses')}</h5>
        <div class="analysis-column-content">
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${calculateStageLosses(data).slice(0, 3).map(loss => `<li><strong>${loss.player}:</strong> -${loss.margin}s (${loss.stage})</li>`).join('')}
          </ul>
        </div>
      </div>
      <div class="analysis-column">
        <h5>${t('analysis_podium_finishers')}</h5>
        <div class="analysis-column-content">
          <ul class="podium-list">${podiumFinishers.map((p, i) => `<li><span class="podium-icon">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>${p.player || t('general_na')}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="analysis-column">
        <h5>${t('analysis_best_car_results')}</h5>
        <div class="analysis-column-content">
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${bestCarResults.slice(0, 5).map(car => `<li><strong>${car.vehicle}:</strong> ${car.player}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_performance_trend')}</h4>
      <div class="analysis-controls">
        <label>${t('analysis_player')}:</label>
        <select id="trend-user-selector"><option value="">${t('analysis_select_player')}</option>${allPlayers.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
      </div>
      <div id="trendChartContainer" class="analysis-chart-container" style="height: 250px;"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_win_distribution')}</h4>
      <div id="winDistributionChartContainer" class="analysis-chart-container" style="height: 300px;"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_consistency_rating')}</h4>
      <div id="consistencyChartContainer" class="analysis-chart-container consistency-chart"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_time_lost')}</h4>
      <div class="analysis-controls">
        <label>${t('analysis_player')}:</label>
        <select id="timeLost-user-selector"><option value="">${t('analysis_select_player')}</option>${allPlayers.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
      </div>
      <div id="timeLostChartContainer" class="analysis-chart-container" style="height: 300px;"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_pace_evolution')}</h4>
      <div class="analysis-controls">
        <label>${t('analysis_player')}:</label>
        <select id="pace-user-selector"><option value="">${t('analysis_select_player')}</option>${allPlayers.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
      </div>
      <div id="paceChartContainer" class="analysis-chart-container" style="height: 300px;"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_car_comparison')}</h4>
      <div id="carPerformanceChartContainer" class="analysis-chart-container" style="height: 300px;"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_consistency_comparison')}</h4>
      <div class="analysis-controls">
        <label>${t('analysis_player1')}:</label>
        <select id="user-selector-1"><option value="">${t('analysis_select_player')}</option>${allPlayers.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
        <label>${t('analysis_player2')}:</label>
        <select id="user-selector-2"><option value="">${t('analysis_select_player')}</option>${allPlayers.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
        <label style="margin-left: 15px;">${t('analysis_view_type')}:</label>
        <select id="chart-type-selector">
          <option value="line">${t('analysis_line_chart')}</option>
          <option value="delta">${t('analysis_delta')}</option>
        </select>
      </div>
      <div id="comparisonChartContainer" class="analysis-chart-container" style="height: 300px;"></div>
    </div>
    <div class="analysis-section">
      <h4>${t('analysis_global_performance')}</h4>
      <div id="globalChartContainer" class="analysis-chart-container" style="height: 400px;"></div>
    </div>
  `;

  setupTrendListener(data);
  setupTimeLostListener(data);
  setupPaceListener(data);
  setupComparisonListeners(data);
  createBarChart('winDistributionChartContainer', { labels: stageWins.map(w => w.player), datasets: [{ data: stageWins.map(w => w.wins), color: '#47ff76' }] });
  createHorizontalBarChart('consistencyChartContainer', { labels: consistencyRatings.map(r => r.player), datasets: [{ data: consistencyRatings.map(r => r.deviation), color: '#ffcc47' }] });
  createBoxPlotChart('carPerformanceChartContainer', { labels: carPerformance.map(c => c.vehicle), datasets: [{ data: carPerformance.map(c => [c.min, c.avg, c.max]), color: '#47ffff' }] });
  renderGlobalChart(data, allPlayers);
}

function setupTrendListener(data) {
  const selector = document.getElementById('trend-user-selector');
  if(selector) selector.addEventListener('change', () => renderPerformanceTrend(selector.value, data));
}

function setupTimeLostListener(data) {
  const selector = document.getElementById('timeLost-user-selector');
  if(selector) selector.addEventListener('change', () => renderTimeLostVsWinner(selector.value, data));
}

function setupPaceListener(data) {
  const selector = document.getElementById('pace-user-selector');
  if(selector) selector.addEventListener('change', () => renderPaceEvolution(selector.value, data));
}

function setupComparisonListeners(data) {
  const sel1 = document.getElementById('user-selector-1');
  const sel2 = document.getElementById('user-selector-2');
  const typeSel = document.getElementById('chart-type-selector');
  const updateChart = () => {
    const user1 = sel1?.value;
    const user2 = sel2?.value;
    const chartType = typeSel?.value;
    renderComparisonChart(user1, user2, data, chartType);
  };
  if(sel1) sel1.addEventListener('change', updateChart);
  if(sel2) sel2.addEventListener('change', updateChart);
  if(typeSel) typeSel.addEventListener('change', updateChart);
}

function renderPerformanceTrend(userName, data) {
  const container = document.getElementById('trendChartContainer');
  if (!userName) { if(container) container.innerHTML = `<p style="color: #ccc; text-align: center;">${t('analysis_select_player_for_trend')}</p>`; return; }
  const stageKeys = getSortedStageKeys(data);
  const times = getStageTimesForUser(userName, data).map(p => p.timeMs);
  const deltas = times.map((time, i) => { if (i === 0) return 0; return (time - times[i-1]) / 1000; });
  createLineChart('trendChartContainer', { labels: stageKeys, datasets: [{ label: t('analysis_time_difference'), data: deltas, color: '#ff4747' }] });
}

function renderTimeLostVsWinner(userName, data) {
  const container = document.getElementById('timeLostChartContainer');
  if (!userName) { if(container) container.innerHTML = `<p style="color: #ccc; text-align: center;">${t('analysis_select_player_for_time_lost')}</p>`; return; }
  const stageKeys = getSortedStageKeys(data);
  const losses = stageKeys.map(key => {
    const stageData = data[key].stageData;
    const userResult = stageData.find(r => r.player === userName);
    const winnerResult = stageData.sort((a, b) => timeStringToMs(a.time) - timeStringToMs(b.time))[0];
    if (userResult && winnerResult && userResult.time !== winnerResult.time) { return (timeStringToMs(userResult.time) - timeStringToMs(winnerResult.time)) / 1000; }
    return null;
  }).filter(l => l !== null);
  createBarChart('timeLostChartContainer', { labels: stageKeys, datasets: [{ data: losses, color: '#ff6b6b' }] });
}

function renderPaceEvolution(userName, data) {
  const container = document.getElementById('paceChartContainer');
  if (!userName) { if(container) container.innerHTML = `<p style="color: #ccc; text-align: center;">${t('analysis_select_player_for_pace')}</p>`; return; }
  const stageKeys = getSortedStageKeys(data);
  const paces = stageKeys.map(key => {
    const stageData = data[key].stageData;
    const userResult = stageData.find(r => r.player === userName);
    if (!userResult) return null;
    const userTime = timeStringToMs(userResult.time);
    const avgTime = stageData.reduce((sum, r) => sum + timeStringToMs(r.time), 0) / stageData.length;
    return userTime / avgTime;
  });
  createLineChart('paceChartContainer', { labels: stageKeys, datasets: [{ label: t('analysis_relative_pace'), data: paces, color: '#4776ff' }] });
}

function renderComparisonChart(user1, user2, data, chartType = 'line') {
  const container = document.getElementById('comparisonChartContainer');
  if (!user1 || !user2) { if(container) container.innerHTML = `<p style="color: #ccc; text-align: center;">${t('analysis_select_two_players')}</p>`; return; }
  if (chartType === 'delta') { createDeltaChart('comparisonChartContainer', user1, user2, data); } else {
    const stageKeys = getSortedStageKeys(data);
    const labels = stageKeys;
    const datasets = [];
    datasets.push({ label: user1, data: getStageTimesForUser(user1, data).map(p => p.timeMs / 1000), color: '#ff4747' });
    datasets.push({ label: user2, data: getStageTimesForUser(user2, data).map(p => p.timeMs / 1000), color: '#4776ff' });
    createLineChart('comparisonChartContainer', { labels, datasets });
  }
}

function renderGlobalChart(data, allPlayers) {
  const stageKeys = getSortedStageKeys(data);
  const labels = stageKeys;
  const colors = ['#ff4747', '#4776ff', '#47ff76', '#ffcc47', '#ff47cc', '#47ffff', '#ff4776', '#7647ff', '#ccff47', '#47ccff'];
  const datasets = allPlayers.slice(0, 10).map((player, idx) => ({
    label: player,
    data: stageKeys.map(key => { const res = data[key]?.stageData?.find(r => r.player === player); return res ? timeStringToMs(res.time) / 1000 : null; }),
    color: colors[idx % colors.length]
  }));
  createLineChart('globalChartContainer', { labels, datasets });
}

function calculateGeneralStats(data) {
  const stageKeys = Object.keys(data).filter(k => k.includes('_stage'));
  const overallKeys = Object.keys(data).filter(k => k.includes('_overall'));
  const firstStage = data[stageKeys[0]] || data[Object.keys(data)[0]];
  const eventName = firstStage?.rallyInfo?.championship || t('general_na');
  const rallyName = firstStage?.rallyInfo?.rallyName || t('general_na');
  let totalDistance = 0;
  const seenStages = new Set();
  for (const key of stageKeys) { const stageNum = key.split('_')[0]; if (seenStages.has(stageNum)) continue; seenStages.add(stageNum); const lengthStr = data[key].rallyInfo.length; if (lengthStr) { totalDistance += parseFloat(lengthStr.replace(',', '.').replace(' km', '')); } }
  const weatherCounts = {};
  for (const key of stageKeys) { const w = data[key].rallyInfo.weather; if (w && w !== 'N/A') { weatherCounts[w] = (weatherCounts[w] || 0) + 1; } }
  const weather = Object.entries(weatherCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || t('general_na');
  const starters = firstStage?.totalEntries || 0;
  const lastOverallKey = overallKeys.sort().pop();
  const finishers = lastOverallKey ? data[lastOverallKey]?.playerCount || 0 : 0;
  return { eventName, rallyName, totalDistance, weather, starters, finishers };
}

function findPodiumFinishers(data) {
  const overallKeys = Object.keys(data).filter(k => k.includes('_overall')).sort();
  const lastOverallKey = overallKeys.pop();
  const lastOverall = lastOverallKey ? data[lastOverallKey] : null;
  if (!lastOverall || !lastOverall.stageData) { return [{ player: t('general_na') }, { player: t('general_na') }, { player: t('general_na') }]; }
  return lastOverall.stageData.slice(0, 3);
}

function calculateBestCarResults(data) {
  const carTimes = {};
  for (const stageKey in data) { const stageData = data[stageKey].stageData; if (!stageData) continue; for (const result of stageData) { if (!result.vehicle || !result.time) continue; const timeMs = timeStringToMs(result.time); if (timeMs === Infinity) continue; if (!carTimes[result.vehicle] || timeMs < timeStringToMs(carTimes[result.vehicle].time)) { carTimes[result.vehicle] = { time: result.time, player: result.player }; } } }
  return Object.entries(carTimes).sort((a, b) => timeStringToMs(a[1].time) - timeStringToMs(b[1].time)).map(([vehicle, info]) => ({ vehicle, ...info }));
}

function getAllPlayers(data) {
  const players = new Set();
  for (const stageKey in data) { const stageData = data[stageKey].stageData; if (!stageData) continue; stageData.forEach(r => players.add(r.player)); }
  return Array.from(players).sort();
}

function getStageTimesForUser(userName, data) {
  const results = [];
  const stageKeys = getSortedStageKeys(data);
  for (const key of stageKeys) { const stageData = data[key].stageData; const userResult = stageData.find(r => r.player === userName); if (userResult && userResult.time) { const timeMs = timeStringToMs(userResult.time); if (isFinite(timeMs)) { results.push({ stageKey: key, timeMs }); } } }
  return results;
}

function calculateStageWins(data) {
  const wins = [];
  const stageKeys = getSortedStageKeys(data);
  for (const key of stageKeys) {
    const stageData = data[key].stageData;
    if (!stageData || stageData.length < 2) continue;
    const sortedTimes = stageData.filter(r => r.time && !r.time.includes('DNF')).map(r => ({ player: r.player, timeMs: timeStringToMs(r.time) })).sort((a, b) => a.timeMs - b.timeMs);
    if (sortedTimes.length > 1) { const winner = sortedTimes[0]; const second = sortedTimes[1]; const margin = (second.timeMs - winner.timeMs) / 1000; wins.push({ player: winner.player, margin: margin.toFixed(2), stage: key.split('_')[0] }); }
  }
  return wins.sort((a, b) => b.margin - a.margin);
}

function calculateStageLosses(data) {
  const losses = [];
  const stageKeys = getSortedStageKeys(data);
  for (const key of stageKeys) {
    const stageData = data[key].stageData;
    if (!stageData || stageData.length < 2) continue;
    const sortedTimes = stageData.filter(r => r.time && !r.time.includes('DNF')).map(r => ({ player: r.player, timeMs: timeStringToMs(r.time) })).sort((a, b) => a.timeMs - b.timeMs);
    if (sortedTimes.length > 1) { const last = sortedTimes[sortedTimes.length - 1]; const secondLast = sortedTimes[sortedTimes.length - 2]; const margin = (last.timeMs - secondLast.timeMs) / 1000; losses.push({ player: last.player, margin: margin.toFixed(2), stage: key.split('_')[0] }); }
  }
  return losses.sort((a, b) => b.margin - a.margin);
}

function calculateAllStageWins(data) {
  const winCounts = {};
  const stageKeys = getSortedStageKeys(data);
  for (const key of stageKeys) { const stageData = data[key].stageData; if (!stageData || stageData.length === 0) continue; const winner = stageData.sort((a, b) => timeStringToMs(a.time) - timeStringToMs(b.time))[0]; if (winner) { winCounts[winner.player] = (winCounts[winner.player] || 0) + 1; } }
  return Object.entries(winCounts).map(([player, wins]) => ({ player, wins })).sort((a, b) => b.wins - a.wins);
}

function calculateConsistencyRatings(data) {
  const ratings = {};
  const stageKeys = getSortedStageKeys(data);
  for (const player of getAllPlayers(data)) {
    const times = [];
    for (const key of stageKeys) { const stageData = data[key].stageData; const userResult = stageData.find(r => r.player === player); if (userResult && userResult.time) { const timeMs = timeStringToMs(userResult.time); if (isFinite(timeMs)) { times.push(timeMs); } } }
    if (times.length > 1) { const avg = times.reduce((a, b) => a + b, 0) / times.length; const squareDiffs = times.map(value => Math.pow(value - avg, 2)); const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length; ratings[player] = { deviation: Math.sqrt(avgSquareDiff) / 1000 }; }
  }
  return Object.entries(ratings).map(([player, rating]) => ({ player, ...rating })).sort((a, b) => a.deviation - b.deviation);
}

function calculateCarPerformance(data) {
  const carStats = {};
  const stageKeys = getSortedStageKeys(data);
  for (const key of stageKeys) { const stageData = data[key].stageData; for (const result of stageData) { if (!result.vehicle || !result.time) continue; const timeMs = timeStringToMs(result.time); if (!isFinite(timeMs)) continue; if (!carStats[result.vehicle]) { carStats[result.vehicle] = { times: [], bestDriver: '', bestTime: Infinity }; } carStats[result.vehicle].times.push(timeMs); if (timeMs < carStats[result.vehicle].bestTime) { carStats[result.vehicle].bestTime = timeMs; carStats[result.vehicle].bestDriver = result.player; } } }
  return Object.entries(carStats).map(([vehicle, stats]) => { const avg = stats.times.reduce((a, b) => a + b, 0) / stats.times.length; return { vehicle, min: Math.min(...stats.times) / 1000, avg: avg / 1000, max: Math.max(...stats.times) / 1000, bestDriver: stats.bestDriver }; }).sort((a, b) => a.avg - b.avg);
}

window.addEventListener('wrc-language-changed', () => {
  const resultsContainer = document.getElementById('wrc-analysis-results-container');
  if (resultsContainer?.innerHTML) {
    const extractedData = mainExtractor?.extractedData;
    if (extractedData && Object.keys(extractedData).length > 0) {
      renderAnalysis(resultsContainer, extractedData);
    }
  }
});

window.initializeAnalysisPanel = initializeAnalysisPanel;