console.log('WRC Analyst Extension loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    if (window.wrcExtractor && window.wrcExtractor.sidebar) {
      window.wrcExtractor.sidebar.classList.remove('hidden');
      const openBtn = document.getElementById('wrc-open-sidebar-btn');
      if (openBtn) openBtn.remove();
    }
    sendResponse({ status: 'sidebar opened' });
  }
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

class WRCDataExtractor {
  constructor() {
    this.isWRCPage = false;
    this.stages = [];
    this.currentStage = null;
    this.extractedData = {};
    this.isExtracting = false;
    this.sidebar = null;
    this.analysisPanel = null;
    this.csvPanel = null;
    this.logs = [];
    this.observer = null;
    this.currentRally = null;
    this.currentLang = getLanguage();
    this.analysisInitialized = false;
    this.csvInitialized = false;

    this.VIEW_TYPES = {
      STAGE: 'stage',
      OVERALL: 'overall'
    };
    this.currentView = this.VIEW_TYPES.STAGE;

    this.debouncedUpdateStatus = debounce((status) => this._updateStatus(status), 100);
    this.debouncedUpdatePageInfo = debounce(() => this._updatePageInfo(), 500);

    this.performanceMonitor = {
      startTime: performance.now(),
      lastUpdate: performance.now(),
      updateCount: 0,
      warningThreshold: 2000,
      checkPerformance: () => {
        const now = performance.now();
        const timeSinceLastUpdate = now - this.performanceMonitor.lastUpdate;
        this.performanceMonitor.lastUpdate = now;
        this.performanceMonitor.updateCount++;
        
        if (timeSinceLastUpdate > this.performanceMonitor.warningThreshold) {
          console.warn(`Slow update: ${(timeSinceLastUpdate / 1000).toFixed(1)}s`);
        }
        
        if (this.performanceMonitor.updateCount % 100 === 0) {
          const totalTime = now - this.performanceMonitor.startTime;
          const avgTime = totalTime / this.performanceMonitor.updateCount;
          console.log(`Performance: avg ${avgTime.toFixed(0)}ms/update, ${this.performanceMonitor.updateCount} updates`);
        }
      }
    };

    this.init();
  }

  init() {
    try {
      this.checkWRCPage();
      if (this.isWRCPage) {
        console.log(t('log_wrc_page_detected'));
        setTimeout(() => {
          try {
            this.createSidebar();
            this.detectStages();
            this.setupMutationObserver();
            this.setupRallyNavigationObserver();
            this.log(t('log_init_complete'));
          } catch (error) {
            console.error(t('log_init_error'), error);
            this.log(`${t('log_initialization_error')}: ${error.message}`, 'error');
          }
        }, 2000);
      } else {
        console.log(t('log_not_wrc_page'));
      }
    } catch (error) {
      console.error(t('log_init_error'), error);
    }
  }

  checkWRCPage() {
    const url = window.location.href;
    const isWRCUrl = url.includes('racenet.com/ea_sports_wrc/clubs/');
    const hasWRCElements = document.querySelector('[class*="wrc"], [class*="stage"], [class*="racenet"]');
    this.isWRCPage = isWRCUrl || hasWRCElements;
    if (this.isWRCPage) {
      console.log(`${t('log_wrc_page_identified')} ${url}`);
    }
  }

  createSidebar() {
    try {
      if (!document.body) {
        this.log(t('log_document_body_unavailable_retry'), 'warning');
        setTimeout(() => this.createSidebar(), 500);
        return;
      }
      if (document.getElementById('wrc-test-sidebar')) {
        this.log(t('log_sidebar_already_exists'), 'info');
        this.sidebar = document.getElementById('wrc-test-sidebar');
        this.forceSidebarRedraw();
        return;
      }

      requestAnimationFrame(() => {
        try {
          this.sidebar = document.createElement('div');
          this.sidebar.id = 'wrc-test-sidebar';
          this.sidebar.className = 'wrc-sidebar-forced';
          this.sidebar.innerHTML = `
            <div class="wrc-sidebar-header">
              <h3>${t('sidebar_title')}</h3>
              <button id="wrc-close-sidebar" class="wrc-close-btn">×</button>
            </div>
            <div class="wrc-sidebar-content">
              <div class="wrc-language-selector">
                <select id="wrc-language-select" class="wrc-language-select" style="
                  width: 100%;
                  padding: 8px 12px;
                  background-color: #333;
                  color: #fff;
                  border: 1px solid #ff4747;
                  border-radius: 4px;
                  font-family: Arial, sans-serif;
                  font-size: 12px;
                  cursor: pointer;
                  margin-bottom: 10px;
                ">
                  <option value="en" ${this.currentLang === 'en' ? 'selected' : ''}>English</option>
                  <option value="hu" ${this.currentLang === 'hu' ? 'selected' : ''}>Magyar</option>
                </select>
              </div>
              <div class="wrc-status">
                <h4>${t('section_status')}</h4>
                <div id="wrc-status-text">${t('status_initializing')}</div>
                <div id="wrc-progress-bar">
                  <div id="wrc-progress-fill"></div>
                </div>
              </div>
              <div class="wrc-info">
                <h4>${t('section_page_info')}</h4>
                <div id="wrc-page-info"></div>
              </div>
              <div class="wrc-data">
                <h4>${t('section_extracted_data')}</h4>
                <div id="wrc-extracted-data"></div>
              </div>
              <div class="wrc-log">
                <h4>${t('section_log')}</h4>
                <div id="wrc-log-content"></div>
              </div>
              <div class="wrc-controls">
                <button id="wrc-start-extraction" class="wrc-btn">${t('btn_start_extraction')}</button>
                <button id="wrc-collect-all-stages" class="wrc-btn">${t('btn_collect_all')}</button>
                <button id="wrc-open-analysis" class="wrc-btn">${t('btn_open_analysis')}</button>
                <button id="wrc-open-csv-analysis" class="wrc-btn">${t('btn_open_csv')}</button>
                <button id="wrc-download-json" class="wrc-btn">${t('btn_download_json')}</button>
                <button id="wrc-clear-data" class="wrc-btn wrc-btn-secondary">${t('btn_clear_data')}</button>
                <button id="wrc-force-redraw" class="wrc-btn">${t('btn_force_redraw')}</button>
                <a href="https://ko-fi.com/stewzero" target="_blank" class="wrc-btn wrc-btn-secondary" style="display: block; text-align: center;">${t('btn_donate')}</a>
              </div>
            </div>
          `;
          document.body.appendChild(this.sidebar);

          this.analysisPanel = document.createElement('div');
          this.analysisPanel.id = 'wrc-analysis-panel';
          this.analysisPanel.innerHTML = `
            <div class="wrc-sidebar-header">
              <h3>${t('analysis_title')}</h3>
            </div>
            <div class="wrc-sidebar-content">
              <div id="wrc-analysis-content"></div>
            </div>
          `;
          document.body.appendChild(this.analysisPanel);

          this.csvPanel = document.createElement('div');
          this.csvPanel.id = 'wrc-csv-panel';
          this.csvPanel.innerHTML = `
            <div class="wrc-sidebar-header">
              <h3>${t('csv_title')}</h3>
            </div>
            <div class="wrc-sidebar-content">
              <div id="wrc-csv-content"></div>
            </div>
          `;
          document.body.appendChild(this.csvPanel);

          this.forceSidebarRedraw();
          setTimeout(() => this.setupEventListeners(), 100);
          this.log(t('log_sidebar_created'));
        } catch (error) {
          console.error(t('log_sidebar_creation_error'), error);
          this.log(`${t('log_sidebar_internal_error')}: ${error.message}`, 'error');
        }
      });
    } catch (error) {
      console.error(t('log_sidebar_creation_error'), error);
      this.log(`${t('log_sidebar_creation_error')}: ${error.message}`, 'error');
    }
  }

  forceSidebarRedraw() {
    if (!this.sidebar) return;
    try {
      const originalDisplay = this.sidebar.style.display;
      this.sidebar.style.display = 'none';
      this.sidebar.offsetHeight;
      this.sidebar.style.display = originalDisplay || 'block';
      this.sidebar.classList.add('wrc-sidebar-forced');
      this.log(t('log_sidebar_redrawn'));
    } catch (error) {
      console.error(t('log_sidebar_redraw_error'), error);
    }
  }

  setupEventListeners() {
    try {
      const languageSelect = document.getElementById('wrc-language-select');
      if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
          this.currentLang = e.target.value;
          setLanguage(this.currentLang);
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'setLanguage', language: this.currentLang }).catch(() => {});
          }
          this.updateUI();
        });
      }

      const closeBtn = document.getElementById('wrc-close-sidebar');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          console.log(t('log_close_button_clicked'));
          if (this.sidebar) {
            this.sidebar.classList.add('hidden');
          }

          if (this.analysisPanel?.classList.contains('open')) {
            this.analysisPanel.classList.remove('open');
            document.body.classList.remove('analysis-panel-open');
            const openAnalysisBtn = document.getElementById('wrc-open-analysis');
            if (openAnalysisBtn) openAnalysisBtn.textContent = t('btn_open_analysis');
          }

          if (this.csvPanel?.classList.contains('open')) {
            this.csvPanel.classList.remove('open');
            document.body.classList.remove('csv-panel-open');
            const openCsvBtn = document.getElementById('wrc-open-csv-analysis');
            if (openCsvBtn) openCsvBtn.textContent = t('btn_open_csv');
          }

          this.ensureOpenButtonExists();
        });
      }

      const extractBtn = document.getElementById('wrc-start-extraction');
      if (extractBtn) {
        extractBtn.addEventListener('click', () => {
          this.refreshAndExtractData();
        });
      }

      const openAnalysisBtn = document.getElementById('wrc-open-analysis');
      if (openAnalysisBtn && this.analysisPanel) {
        const updateButtonText = () => {
          const isOpen = this.analysisPanel.classList.contains('open');
          openAnalysisBtn.textContent = isOpen ? t('btn_close_analysis') : t('btn_open_analysis');
        };

        openAnalysisBtn.addEventListener('click', () => {
          const isOpen = this.analysisPanel.classList.contains('open');
          if (isOpen) {
            this.analysisPanel.classList.remove('open');
            document.body.classList.remove('analysis-panel-open');
          } else {
            if (this.csvPanel?.classList.contains('open')) {
              this.csvPanel.classList.remove('open');
              document.body.classList.remove('csv-panel-open');
              const openCsvBtn = document.getElementById('wrc-open-csv-analysis');
              if (openCsvBtn) openCsvBtn.textContent = t('btn_open_csv');
            }

            this.analysisPanel.classList.add('open');
            document.body.classList.add('analysis-panel-open');
            
            if (!this.analysisInitialized) {
              if (typeof initializeAnalysisPanel === 'function') {
                initializeAnalysisPanel(this);
                this.analysisInitialized = true;
              }
            }
          }
          updateButtonText();
        });

        updateButtonText();
      }

      const openCsvBtn = document.getElementById('wrc-open-csv-analysis');
      if (openCsvBtn && this.csvPanel) {
        const updateCsvButtonText = () => {
          const isOpen = this.csvPanel.classList.contains('open');
          openCsvBtn.textContent = isOpen ? t('btn_close_csv') : t('btn_open_csv');
        };

        openCsvBtn.addEventListener('click', () => {
          const isOpen = this.csvPanel.classList.contains('open');
          if (isOpen) {
            this.csvPanel.classList.remove('open');
            document.body.classList.remove('csv-panel-open');
          } else {
            if (this.analysisPanel?.classList.contains('open')) {
              this.analysisPanel.classList.remove('open');
              document.body.classList.remove('analysis-panel-open');
              const openAnalysisBtn = document.getElementById('wrc-open-analysis');
              if (openAnalysisBtn) {
                openAnalysisBtn.textContent = t('btn_open_analysis');
              }
            }

            this.csvPanel.classList.add('open');
            document.body.classList.add('csv-panel-open');
            
            if (!this.csvInitialized) {
              if (typeof initializeCsvAnalysisPanel === 'function') {
                initializeCsvAnalysisPanel(this);
                this.csvInitialized = true;
              } else {
                document.getElementById('wrc-csv-content').innerHTML = `
                  <p style="color: #ff6b6b; text-align: center;">
                    ${t('csv_unavailable')}
                  </p>
                `;
              }
            }
          }
          updateCsvButtonText();
        });

        updateCsvButtonText();
      }

      const collectAllBtn = document.getElementById('wrc-collect-all-stages');
      if (collectAllBtn) {
        collectAllBtn.addEventListener('click', () => {
          this.collectAllStagesData();
        });
      }

      const downloadBtn = document.getElementById('wrc-download-json');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          this.downloadJSON();
        });
      }

      const clearBtn = document.getElementById('wrc-clear-data');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.clearData();
        });
      }

      const redrawBtn = document.getElementById('wrc-force-redraw');
      if (redrawBtn) {
        redrawBtn.addEventListener('click', () => {
          this.forceSidebarRedraw();
        });
      }

      window.addEventListener('wrc-language-changed', (e) => {
        this.currentLang = e.detail.language;
        this.updateUI();
      });

      this.log(t('log_listeners_set'));
    } catch (error) {
      this.log(`${t('log_listeners_setup_error')}: ${error.message}`, 'error');
    }
  }

  updateUI() {
    try {
      if (this.sidebar) {
        const header = this.sidebar.querySelector('.wrc-sidebar-header h3');
        if (header) header.textContent = t('sidebar_title');
        
        const statusTitle = this.sidebar.querySelector('.wrc-status h4');
        if (statusTitle) statusTitle.textContent = t('section_status');
        
        const infoTitle = this.sidebar.querySelector('.wrc-info h4');
        if (infoTitle) infoTitle.textContent = t('section_page_info');
        
        const dataTitle = this.sidebar.querySelector('.wrc-data h4');
        if (dataTitle) dataTitle.textContent = t('section_extracted_data');
        
        const logTitle = this.sidebar.querySelector('.wrc-log h4');
        if (logTitle) logTitle.textContent = t('section_log');
        
        const startExtraction = document.getElementById('wrc-start-extraction');
        if (startExtraction) startExtraction.textContent = t('btn_start_extraction');
        
        const collectAll = document.getElementById('wrc-collect-all-stages');
        if (collectAll) collectAll.textContent = t('btn_collect_all');
        
        const downloadJson = document.getElementById('wrc-download-json');
        if (downloadJson) downloadJson.textContent = t('btn_download_json');
        
        const clearData = document.getElementById('wrc-clear-data');
        if (clearData) clearData.textContent = t('btn_clear_data');
        
        const forceRedraw = document.getElementById('wrc-force-redraw');
        if (forceRedraw) forceRedraw.textContent = t('btn_force_redraw');
        
        const donateBtn = this.sidebar.querySelector('a[href*="donate"]');
        if (donateBtn) donateBtn.textContent = t('btn_donate');
        
        const languageSelect = document.getElementById('wrc-language-select');
        if (languageSelect) {
          languageSelect.value = this.currentLang;
        }
        
        const openAnalysisBtn = document.getElementById('wrc-open-analysis');
        if (openAnalysisBtn) {
          const isOpen = this.analysisPanel?.classList.contains('open');
          openAnalysisBtn.textContent = isOpen ? t('btn_close_analysis') : t('btn_open_analysis');
        }
        
        const openCsvBtn = document.getElementById('wrc-open-csv-analysis');
        if (openCsvBtn) {
          const isOpen = this.csvPanel?.classList.contains('open');
          openCsvBtn.textContent = isOpen ? t('btn_close_csv') : t('btn_open_csv');
        }
      }
      
      if (this.analysisPanel) {
        const header = this.analysisPanel.querySelector('.wrc-sidebar-header h3');
        if (header) header.textContent = t('analysis_title');
      }
      
      if (this.csvPanel) {
        const header = this.csvPanel.querySelector('.wrc-sidebar-header h3');
        if (header) header.textContent = t('csv_title');
      }
      
      this.updatePageInfo();
      this.updateExtractedDataDisplay();
    } catch (error) {
      console.debug('UI update error:', error);
    }
  }

  setupRallyNavigationObserver() {
    let currentUrl = window.location.href;
    
    let urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.log(t('log_url_changed'));
        setTimeout(() => {
          this.detectRallyChange();
        }, 2000);
      }
    }, 2000);
    
    this._urlCheckInterval = urlCheckInterval;
    
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (window.wrcExtractor) {
          window.wrcExtractor.log(t('log_popstate'));
          window.wrcExtractor.detectRallyChange();
        }
      }, 2000);
    });
  }

  detectRallyChange() {
    const newRallyName = this.extractEventName();
    
    if (this.currentRally !== newRallyName) {
      this.log(`${t('log_rally_changed')} ${newRallyName}`);
      this.currentRally = newRallyName;
      this.stages = [];
      this.detectStages();
      this.updatePageInfo();
    }
  }

  async refreshAndExtractData() {
    this.log(t('log_data_refresh'));
    this.updateStatus(t('status_data_refresh'));
    
    this.extractedData = {};
    this.stages = [];
    
    this.currentRally = this.extractEventName();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.detectStages();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.startDataExtraction();
  }

  detectStages() {
    this.log(t('log_stage_detection_start'), 'info');
    setTimeout(() => {
      try {
        const swiperSlides = document.querySelectorAll('.swiper-slide');
        this.log(`${t('log_swiper_slides_count')} ${swiperSlides.length}`, 'info');
        let foundStages = [];
        this.processStagesInBatches(swiperSlides, foundStages, () => {
          this.finalizeStageDetection(foundStages);
        });
      } catch (error) {
        console.error(t('log_stage_detection_error'), error);
        this.log(`${t('log_stage_detection_error')}: ${error.message}`, 'error');
      }
    }, 100);
  }

  processStagesInBatches(slides, foundStages, callback) {
    const batchSize = 5;
    let currentIndex = 0;
    const processBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, slides.length);
      for (let i = currentIndex; i < endIndex; i++) {
        const slide = slides[i];
        const text = slide.textContent.trim();
        if (text.match(/^S\d+$/)) {
          const stageNumber = this.extractStageNumber(text);
          foundStages.push({
            element: slide,
            text: text,
            href: null,
            stageNumber: stageNumber,
            type: 'swiper'
          });
          this.log(`${t('log_stage_detected')} ${text} (${t('log_stage_number')}: ${stageNumber})`, 'success');
        }
      }
      currentIndex = endIndex;
      if (currentIndex < slides.length) {
        setTimeout(processBatch, 10);
      } else {
        callback();
      }
    };
    processBatch();
  }

  extractStageNumber(text) {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  finalizeStageDetection(foundStages) {
    this.stages = foundStages;
    this.log(t('log_stages_found', { count: foundStages.length }), 'success');
    this.updateStatus(t('status_stages_detected'), 'success');
  }

  selectStage(stage) {
    try {
      this.currentStage = stage;
      this.log(`${t('log_stage_selected')} ${stage.text}`, 'info');
      if (stage.element && stage.element.click) {
        stage.element.click();
        
        return new Promise((resolve) => {
          const observer = new MutationObserver((mutations) => {
            const table = document.querySelector('table');
            if (table) {
              const rows = table.querySelectorAll('tr');
              if (rows.length > 1) {
                observer.disconnect();
                setTimeout(() => {
                  resolve();
                }, 1000);
              }
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 5000);
        });
      }
      return Promise.resolve();
    } catch (error) {
      console.error(t('log_stage_selection_error'), error);
      this.log(`${t('log_stage_selection_error')}: ${error.message}`, 'error');
      return Promise.resolve();
    }
  }

  async switchView(viewType) {
    if (!this.isWRCPage) return;

    const toggleContainer = document.querySelector('div[style*="flex; position: relative;"] > div:first-child');
    if (!toggleContainer) {
      this.log(t('log_view_toggle_container_not_found'), 'error');
      return;
    }

    const toggleButtons = toggleContainer.querySelectorAll('div[style*="cursor: pointer"]');
    let targetButton = null;

    if (viewType === this.VIEW_TYPES.STAGE) {
      targetButton = Array.from(toggleButtons).find(btn =>
        btn.querySelector('p')?.textContent?.trim().toLowerCase() === 'stage'
      );
    } else if (viewType === this.VIEW_TYPES.OVERALL) {
      targetButton = Array.from(toggleButtons).find(btn =>
        btn.querySelector('p')?.textContent?.trim().toLowerCase() === 'overall'
      );
    }

    if (targetButton) {
      const isActive = targetButton.style.backgroundColor === 'rgb(52, 113, 233)';
      if (!isActive) {
        targetButton.click();
        this.log(t('log_click_view_button', { viewType }));
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        this.log(t('log_view_already_active', { viewType }));
      }
      this.currentView = viewType;
    } else {
      this.log(`${t('log_view_button_not_found')} ${viewType}`, 'warning');
    }
  }

  async startDataExtraction() {
    if (this.isExtracting) {
      this.log(t('log_extraction_in_progress'), 'warning');
      return;
    }
    this.isExtracting = true;
    this.updateStatus(t('status_extraction_start'));
    try {
      await this.extractCurrentStageData();
      this.updateStatus(t('status_extraction_complete'));
      this.log(t('log_extraction_success'), 'success');
    } catch (error) {
      this.log(`${t('log_extraction_error')}: ${error.message}`, 'error');
      this.updateStatus(t('status_extraction_error'));
    } finally {
      this.isExtracting = false;
    }
  }

  async extractCurrentStageData() {
    const currentStageNumber = this.getCurrentStageNumber();
    const rallyInfo = this.extractRallyInfo();
    const totalEntries = this.extractTotalEntries();
    const tableData = this.extractTableData();
    const isOverall = this.detectIfOverallView();

    const key = `S${currentStageNumber}_${isOverall ? this.VIEW_TYPES.OVERALL : this.VIEW_TYPES.STAGE}`;

    this.extractedData[key] = {
      rallyInfo: rallyInfo,
      totalEntries: totalEntries,
      stageData: tableData,
      isOverall: isOverall,
      viewType: isOverall ? this.VIEW_TYPES.OVERALL : this.VIEW_TYPES.STAGE,
      timestamp: new Date().toISOString(),
      stageNumber: currentStageNumber,
      playerCount: tableData.length
    };

    this.updateExtractedDataDisplay();
    this.log(`${key} ${t('log_data_extracted')} (${tableData.length})`);
  }

  extractRallyInfo() {
    try {
      const championshipElement = document.querySelector('.MuiTypography-root.MuiTypography-body1[style*="font-size: 24px"]');
      const championship = championshipElement ? championshipElement.textContent.trim() : '';
      const rallyNameElement = document.querySelector('.MuiTypography-root.MuiTypography-body1[style*="font-size: 20px"]');
      const rallyName = rallyNameElement ? rallyNameElement.textContent.trim() : '';

      let stageName = '';
      const stageNameElements = document.querySelectorAll('.MuiTypography-root.MuiTypography-body1');
      stageNameElements.forEach(element => {
        const text = element.textContent.trim();
        if (text.match(/^\d+ -/)) {
          stageName = text;
        }
      });

      const stageDetails = {
        length: '',
        weather: '',
        timeOfDay: '',
        serviceArea: ''
      };

      const possibleContainers = [
        'div[style*="flex-wrap: wrap"]',
        'div[class*="jss"]'
      ];
      let foundDetails = false;
      for (const selector of possibleContainers) {
        const containers = document.querySelectorAll(selector);
        for (const container of containers) {
          if (container.textContent.includes('Length:') || container.textContent.includes('Weather:')) {
            const detailRows = Array.from(container.children).filter(child =>
              child.tagName === 'DIV' &&
              child.style.display === 'flex' &&
              child.style.flexDirection === 'row'
            );
            detailRows.forEach(row => {
              const paragraphs = row.querySelectorAll('p.MuiTypography-body1');
              if (paragraphs.length >= 2) {
                const label = paragraphs[0].textContent.trim().replace(':', '');
                const value = paragraphs[1].textContent.trim();
                switch (label.toLowerCase()) {
                  case 'length':
                    stageDetails.length = value;
                    break;
                  case 'weather':
                    stageDetails.weather = value;
                    break;
                  case 'time of day':
                    stageDetails.timeOfDay = value;
                    break;
                  case 'service area':
                    stageDetails.serviceArea = value;
                    break;
                }
              }
            });
            foundDetails = true;
            break;
          }
        }
        if (foundDetails) break;
      }

      return {
        championship,
        rallyName,
        stageName,
        ...stageDetails
      };
    } catch (error) {
      this.log(`${t('log_rally_info_extraction_error')}: ${error.message}`, 'error');
      return {
        length: '',
        weather: '',
        timeOfDay: '',
        serviceArea: ''
      };
    }
  }

  extractTotalEntries() {
    try {
      const allText = document.body.textContent;
      const totalEntriesMatch = allText.match(/Total entries[:\s]*(\d+)/i);
      if (totalEntriesMatch) {
        return parseInt(totalEntriesMatch[1]);
      }
      const pageInfoElements = document.querySelectorAll('.MuiTypography-root');
      for (const element of pageInfoElements) {
        const text = element.textContent.trim();
        if (text.includes('Total entries')) {
          const match = text.match(/(\d+)/);
          if (match) {
            return parseInt(match[1]);
          }
        }
      }
      return 0;
    } catch (error) {
      this.log(`${t('log_total_entries_extraction_error')}: ${error.message}`, 'error');
      return 0;
    }
  }

  detectIfOverallView() {
    const overallButton = Array.from(document.querySelectorAll('div[style*="cursor: pointer"]'))
      .find(btn => btn.querySelector('p')?.textContent?.trim().toLowerCase() === 'overall');
    
    if (overallButton) {
      return overallButton.style.backgroundColor === 'rgb(52, 113, 233)';
    }
    return false;
  }

  extractTableData() {
    const tableSelectors = [
      'table',
      '[class*="table"]',
      '[class*="results"]',
      '[class*="standings"]'
    ];
    let table = null;
    for (const selector of tableSelectors) {
      table = document.querySelector(selector);
      if (table) break;
    }
    if (!table) {
      const tbody = document.querySelector('tbody');
      if (tbody) table = tbody.parentElement;
    }
    if (!table) throw new Error(t('log_table_not_found'));

    const data = this.extractTableDataFromElement(table);
    if (data.length === 0) throw new Error(t('log_empty_table'));
    return data;
  }

  extractTableDataFromElement(table) {
    const rows = table.querySelectorAll('tr');
    const data = [];
    let startRow = 0;
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('th, td');
      const firstCellText = cells[0]?.textContent?.trim().toLowerCase();
      if (firstCellText && ['pos', 'position', 'player'].includes(firstCellText)) {
        startRow = i + 1;
        break;
      }
    }
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 6) {
        const rowData = {
          position: this.cleanText(cells[0]?.textContent || ''),
          player: this.cleanText(cells[1]?.textContent || ''),
          vehicle: this.cleanText(cells[2]?.textContent || ''),
          assists: this.cleanText(cells[3]?.textContent || ''),
          penalty: this.cleanText(cells[4]?.textContent || ''),
          time: this.cleanText(cells[5]?.textContent || ''),
          diffFirst: this.cleanText(cells[6]?.textContent || '')
        };
        if (!isNaN(parseInt(rowData.position)) && rowData.player) {
          data.push(rowData);
        }
      }
    }
    return data;
  }

  cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  getCurrentStageNumber() {
    if (this.currentStage && this.currentStage.stageNumber) {
      return this.currentStage.stageNumber;
    }
    const activeStage = this.stages.find(stage =>
      stage.element.classList.contains('active') ||
      stage.element.classList.contains('selected') ||
      stage.element.getAttribute('aria-current') === 'page'
    );
    return activeStage ? activeStage.stageNumber : 1;
  }

  async collectAllStagesData() {
    this.log(t('log_stage_extraction_start'));
    this.updateStatus(t('status_collecting_data'));

    if (this.stages.length === 0) {
      this.log(t('log_no_stages'), 'warning');
      this.updateStatus(t('status_no_stages'));
      return;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.log(t('log_mutation_observer_disabled'));
    }

    try {
      this.extractedData = {};
      const total = this.stages.length * 2;
      let processed = 0;

      await this.switchView(this.VIEW_TYPES.STAGE);
      for (const stage of this.stages) {
        this.log(`${t('log_stage_data_collecting')} ${stage.text}`);
        this.updateProgress(processed, total, `${t('analysis_stage')}: ${stage.text}...`);
        await this.selectStage(stage);
        await this.extractCurrentStageData();
        processed++;
        this.updateProgress(processed, total, `${t('analysis_stage')}: ${stage.text} ${t('general_complete')}`);
        await new Promise(r => setTimeout(r, 800));
      }

      await this.switchView(this.VIEW_TYPES.OVERALL);
      for (const stage of this.stages) {
        this.log(`${t('log_overall_data_collecting')} ${stage.text}`);
        this.updateProgress(processed, total, `${t('analysis_overall')}: ${stage.text}...`);
        await this.selectStage(stage);
        await this.extractCurrentStageData();
        processed++;
        this.updateProgress(processed, total, `${t('analysis_overall')}: ${stage.text} ${t('general_complete')}`);
        await new Promise(r => setTimeout(r, 800));
      }

      this.updateStatus(t('status_extraction_complete'));
      this.log(t('log_stage_extraction_complete'), 'success');
    } catch (error) {
      this.log(`${t('log_collecting_error')}: ${error.message}`, 'error');
      this.updateStatus(t('status_extraction_error'));
    } finally {
      this.setupMutationObserver();
      this.log(t('log_mutation_observer_enabled'));
    }
  }

  updateProgress(current, total, message = '') {
    const progressFill = document.getElementById('wrc-progress-fill');
    const statusText = document.getElementById('wrc-status-text');
    if (progressFill) {
      const percentage = total > 0 ? (current / total) * 100 : 0;
      progressFill.style.width = `${percentage}%`;
    }
    if (statusText && message) {
      statusText.textContent = message;
    }
  }

  updateStatus(status) {
    this.debouncedUpdateStatus(status);
  }

  _updateStatus(status) {
    this.performanceMonitor.checkPerformance();
    const statusText = document.getElementById('wrc-status-text');
    if (statusText) {
      statusText.textContent = status;
    }
    this.debouncedUpdatePageInfo();
  }

  updatePageInfo() {
    this.debouncedUpdatePageInfo();
  }

  _updatePageInfo() {
    const pageInfo = document.getElementById('wrc-page-info');
    if (pageInfo) {
      const url = window.location.href;
      const clubIdMatch = url.match(/clubs\/(\d+)/);
      const clubId = clubIdMatch ? clubIdMatch[1] : t('general_na');
      const eventName = this.extractEventName();
      let totalParticipants = 0, finishers = 0;
      for (const key in this.extractedData) {
        if (key.includes('_stage')) {
          totalParticipants = Math.max(totalParticipants, this.extractedData[key].playerCount || 0);
        }
        if (key.includes('_overall')) {
          finishers = Math.max(finishers, this.extractedData[key].playerCount || 0);
        }
      }
      pageInfo.innerHTML = `
        <div><strong>${t('info_club_id')}</strong> ${clubId}</div>
        <div><strong>${t('info_event_name')}</strong> ${eventName}</div>
        <div><strong>${t('info_stages_count')}</strong> ${this.stages.length}</div>
        <div><strong>${t('info_total_participants')}</strong> ${totalParticipants} ${t('general_person')}</div>
        <div><strong>${t('info_finishers_count')}</strong> ${finishers} ${t('general_person')}</div>
      `;
    }
  }

  extractEventName() {
    try {
      const eventNameElement = document.querySelector('p.MuiTypography-body1[style*="font-size: 40px"]');
      return eventNameElement ? eventNameElement.textContent.trim() : t('general_unknown_event');
    } catch (error) {
      this.log(`${t('log_event_name_extraction_error')}: ${error.message}`, 'error');
      return t('general_unknown_event');
    }
  }

  updateExtractedDataDisplay() {
    const dataDisplay = document.getElementById('wrc-extracted-data');
    if (!dataDisplay) return;
    
    if (Object.keys(this.extractedData).length === 0) {
      dataDisplay.innerHTML = `<div class="wrc-info">${t('log_no_data_to_display')}</div>`;
      return;
    }
    let html = '';
    for (const [key, data] of Object.entries(this.extractedData)) {
      const playerCount = data.playerCount || 0;
      const totalEntries = data.totalEntries || 0;
      const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : t('general_unknown');
      const rallyName = data.rallyInfo?.rallyName || t('general_unknown');
      const stageName = data.rallyInfo?.stageName || t('general_unknown');
      html += `
        <div class="wrc-data-item-content">
          <div class="wrc-data-item-title">${key}</div>
          <div class="wrc-data-item-details">
            ${playerCount} / ${totalEntries} total | ${timestamp}
          </div>
          <div class="wrc-data-item-info">
            Rally: ${rallyName} | Stage: ${stageName}
          </div>
        </div>
      `;
    }
    dataDisplay.innerHTML = html;
  }

  downloadJSON() {
    try {
      if (Object.keys(this.extractedData).length === 0) {
        this.log(t('log_no_data_for_download'), 'warning');
        return;
      }
      const jsonData = JSON.stringify(this.extractedData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrc_data_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.log(t('log_json_download_success'), 'success');
    } catch (error) {
      this.log(`${t('log_json_download_error')}: ${error.message}`, 'error');
    }
  }

  clearData() {
    this.extractedData = {};
    this.updateExtractedDataDisplay();
    this.updatePageInfo();
    this.log(t('log_data_cleared'), 'info');
  }

  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    const debouncedCheck = debounce(() => {}, 1000);
    
    this.observer = new MutationObserver((mutations) => {
      let hasRelevantChange = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.target === document.body) {
          hasRelevantChange = true;
          break;
        }
      }
      
      if (hasRelevantChange) {
        debouncedCheck();
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: false
    });
    
    this.log(t('log_mutation_observer_set'));
  }

  log(message, type = 'info') {
    try {
      const logContent = document.getElementById('wrc-log-content');
      if (logContent) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        let logClass = 'wrc-log-entry-custom';
        if (type === 'error') logClass += ' wrc-log-entry-error';
        else if (type === 'warning') logClass += ' wrc-log-entry-warning';
        else logClass += ' wrc-log-entry-info';

        logEntry.className = logClass;
        logEntry.innerHTML = `<span class="wrc-log-timestamp">[${timestamp}]</span> ${message}`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
        
        while (logContent.children.length > 50) {
          logContent.removeChild(logContent.firstChild);
        }
      }
    } catch (error) {}
    console.log(`[WRC] ${message}`);
  }

  ensureOpenButtonExists() {
    if (document.getElementById('wrc-open-sidebar-btn')) return;

    const openBtn = document.createElement('button');
    openBtn.id = 'wrc-open-sidebar-btn';
    openBtn.textContent = t('btn_open_sidebar');
    openBtn.style.position = 'fixed';
    openBtn.style.bottom = '20px';
    openBtn.style.right = '20px';
    openBtn.style.zIndex = '10000';
    openBtn.style.padding = '10px 16px';
    openBtn.style.backgroundColor = '#ff4747';
    openBtn.style.color = 'white';
    openBtn.style.border = 'none';
    openBtn.style.borderRadius = '6px';
    openBtn.style.cursor = 'pointer';
    openBtn.style.fontFamily = 'Arial, sans-serif';
    openBtn.style.fontSize = '14px';
    openBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    openBtn.style.transition = 'background 0.2s';

    openBtn.addEventListener('mouseover', () => {
      openBtn.style.backgroundColor = '#ff6b6b';
    });
    openBtn.addEventListener('mouseout', () => {
      openBtn.style.backgroundColor = '#ff4747';
    });

    openBtn.addEventListener('click', () => {
      if (this.sidebar) {
        this.sidebar.classList.remove('hidden');
      }
      setTimeout(() => {
        if (openBtn.parentNode) openBtn.parentNode.removeChild(openBtn);
      }, 300);
    });

    document.body.appendChild(openBtn);
  }
}

const wrcExtractor = new WRCDataExtractor();
window.wrcExtractor = wrcExtractor;