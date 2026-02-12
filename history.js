document.addEventListener('DOMContentLoaded', () => {
  const isElectronEnv = !!window.isElectron;

  const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
  const historySearchInput = document.getElementById('historySearchInput');
  const historyStatus = document.getElementById('historyStatus');

  const tabActive = document.getElementById('tabActive');
  const tabExpired = document.getElementById('tabExpired');
  const panelActive = document.getElementById('panelActive');
  const panelExpired = document.getElementById('panelExpired');

  const historyEstActiveEl = document.getElementById('historyEstActive');
  const historyCliActiveEl = document.getElementById('historyCliActive');
  const historyEstExpiredEl = document.getElementById('historyEstExpired');
  const historyCliExpiredEl = document.getElementById('historyCliExpired');

  let fullHistory = {
    estActive: [],
    cliActive: [],
    estExpired: [],
    cliExpired: []
  };

  function setTab(tab) {
    const activeMode = tab === 'active';
    tabActive.classList.toggle('active', activeMode);
    tabExpired.classList.toggle('active', !activeMode);
    tabActive.setAttribute('aria-selected', String(activeMode));
    tabExpired.setAttribute('aria-selected', String(!activeMode));
    panelActive.hidden = !activeMode;
    panelExpired.hidden = activeMode;
  }

  function formatHistoryRows(rows, expired = false) {
    if (!rows || !rows.length) return expired ? 'Sem registros vencidos.' : 'Sem registros.';
    return rows
      .map((item) => {
        const when = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-';
        const moved = item.movedToExpiredAt ? new Date(item.movedToExpiredAt).toLocaleString('pt-BR') : '-';
        const base = [
          `Data: ${when}`,
          `OS: ${item.osNumber || '-'}`,
          `Cliente: ${item.cliente || '-'}`,
          `Telefone: ${item.telefone || '-'}`,
          `Equipamento: ${item.equipamento || '-'}`,
          `Valor: R$ ${Number(item.valor || 0).toFixed(2)}`,
          `Previsão: ${item.previsao || '-'}`,
          `Serviço: ${item.nota || '-'}`
        ];

        if (expired) {
          base.push(`Movido para vencidos em: ${moved}`);
        }

        return base.join('\n');
      })
      .join('\n\n------------------------------\n\n');
  }

  function filterRows(rows, query) {
    const normalized = (query || '').trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return rows;

    return rows.filter((item) => {
      const haystack = [
        item?.osNumber,
        item?.cliente,
        item?.telefone,
        item?.equipamento,
        item?.previsao,
        item?.nota,
        item?.valor,
        item?.createdAt,
        item?.movedToExpiredAt
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');

      return haystack.includes(normalized);
    });
  }

  function renderHistory(query = '') {
    historyEstActiveEl.textContent = formatHistoryRows(filterRows(fullHistory.estActive, query));
    historyCliActiveEl.textContent = formatHistoryRows(filterRows(fullHistory.cliActive, query));
    historyEstExpiredEl.textContent = formatHistoryRows(filterRows(fullHistory.estExpired, query), true);
    historyCliExpiredEl.textContent = formatHistoryRows(filterRows(fullHistory.cliExpired, query), true);
  }

  async function loadHistory() {
    if (!isElectronEnv || !window.electronAPI?.readHistory) {
      historyStatus.textContent = 'Histórico disponível apenas no app Electron.';
      return;
    }

    const [estActive, cliActive, estExpired, cliExpired] = await Promise.all([
      window.electronAPI.readHistory('Estabelecimento', 'active'),
      window.electronAPI.readHistory('Cliente', 'active'),
      window.electronAPI.readHistory('Estabelecimento', 'expired'),
      window.electronAPI.readHistory('Cliente', 'expired')
    ]);

    fullHistory = { estActive, cliActive, estExpired, cliExpired };
    renderHistory(historySearchInput?.value || '');
    historyStatus.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR')}.`;
    historyStatus.className = 'muted';
  }

  if (tabActive) tabActive.addEventListener('click', () => setTab('active'));
  if (tabExpired) tabExpired.addEventListener('click', () => setTab('expired'));
  if (historySearchInput) historySearchInput.addEventListener('input', (event) => renderHistory(event.target.value));
  if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', () => loadHistory().catch(console.warn));

  setTab('active');

  loadHistory().catch((err) => {
    historyStatus.textContent = 'Não foi possível carregar o histórico.';
    historyStatus.className = 'print-error';
    console.warn(err);
  });
});
