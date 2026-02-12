document.addEventListener('DOMContentLoaded', () => {
  const isElectronEnv = !!window.isElectron;
  const historyEstEl = document.getElementById('historyEst');
  const historyCliEl = document.getElementById('historyCli');
  const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
  const clearEstHistoryBtn = document.getElementById('clearEstHistoryBtn');
  const clearCliHistoryBtn = document.getElementById('clearCliHistoryBtn');
  const historyStatus = document.getElementById('historyStatus');

  function formatHistoryRows(rows) {
    if (!rows || !rows.length) return 'Sem registros.';
    return rows
      .map((item) => {
        const when = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-';
        return [
          `Data: ${when}`,
          `OS: ${item.osNumber || '-'}`,
          `Cliente: ${item.cliente || '-'}`,
          `Telefone: ${item.telefone || '-'}`,
          `Equipamento: ${item.equipamento || '-'}`,
          `Valor: R$ ${Number(item.valor || 0).toFixed(2)}`,
          `Previsão: ${item.previsao || '-'}`,
          `Serviço: ${item.nota || '-'}`
        ].join('\n');
      })
      .join('\n\n------------------------------\n\n');
  }

  async function loadHistory() {
    if (!isElectronEnv || !window.electronAPI?.readHistory) {
      historyStatus.textContent = 'Histórico disponível apenas no app Electron.';
      return;
    }

    const [estRows, cliRows] = await Promise.all([
      window.electronAPI.readHistory('Estabelecimento'),
      window.electronAPI.readHistory('Cliente')
    ]);

    if (historyEstEl) historyEstEl.textContent = formatHistoryRows(estRows);
    if (historyCliEl) historyCliEl.textContent = formatHistoryRows(cliRows);
    historyStatus.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR')}.`;
  }

  async function clearHistory(copy) {
    if (!isElectronEnv || !window.electronAPI?.clearHistory) return;

    const result = await window.electronAPI.clearHistory(copy);
    if (!result?.ok) {
      historyStatus.textContent = `Falha ao limpar (${copy}): ${result?.message || 'desconhecida'}`;
      historyStatus.className = 'print-error';
      return;
    }

    historyStatus.className = 'muted';
    historyStatus.textContent = `Arquivo da via ${copy} limpo com sucesso.`;
    await loadHistory();
  }

  if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', () => loadHistory().catch(console.warn));
  if (clearEstHistoryBtn) clearEstHistoryBtn.addEventListener('click', () => clearHistory('Estabelecimento').catch(console.warn));
  if (clearCliHistoryBtn) clearCliHistoryBtn.addEventListener('click', () => clearHistory('Cliente').catch(console.warn));

  loadHistory().catch((err) => {
    historyStatus.textContent = 'Não foi possível carregar o histórico.';
    historyStatus.className = 'print-error';
    console.warn(err);
  });
});
