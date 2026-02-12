function formatPhone(v) {
  if (!v) return '';
  const d = String(v).replace(/\D/g, '');
  const dd = d.replace(/^55/, ''); // remove DDI do Brasil se colado
  const n = dd.slice(0, 11); // máximo 11 dígitos
  if (n.length === 0) return '';
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0,2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7,11)}`;
}

// Contato da empresa a ser exibido na Via Cliente
const COMPANY_CONTACT = '(13) 9818-56723';

document.addEventListener('DOMContentLoaded', () => {
  const isElectronEnv = !!window.isElectron;
  const printStatus = document.getElementById('printStatus');
  const osContatoCli = document.getElementById('osContatoCli');
  const osFooterCli = document.getElementById('osFooterCli');
  const osContatoEst = document.getElementById('osContatoEst');
  const osFooterEst = document.getElementById('osFooterEst');
  const previsaoInput = document.getElementById('previsao');
  const tefInput = document.getElementById('tef');
  let currentPrintPayload = null;

  // Helper para alternar a classe de impressão no body
  function setPrintingClass(copy) {
    document.body.classList.remove('printing-estabelecimento', 'printing-cliente');
    if (copy === 'Estabelecimento') {
      document.body.classList.add('printing-estabelecimento');
    } else if (copy === 'Cliente') {
      document.body.classList.add('printing-cliente');
    }
  }

  // Funções de Impressão Segura (separadas e claras)
  function printEstabelecimento() {
    printStatus.textContent = 'Imprimindo: Via Estabelecimento (1/2)...';
    printStatus.className = '';
    setPrintingClass('Estabelecimento');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.electronAPI.print('Estabelecimento', currentPrintPayload);
      });
    });
  }

  function printCliente() {
    printStatus.textContent = 'Imprimindo: Via Cliente (2/2)...';
    printStatus.className = '';

    // Prepara o DOM para a via do cliente
    if (osContatoCli) {
      osContatoCli.style.display = 'block';
      osContatoCli.textContent = 'Contato: ' + COMPANY_CONTACT;
    }
    if (osFooterCli) {
      osFooterCli.style.display = 'block';
      osFooterCli.textContent = 'Contato: ' + COMPANY_CONTACT;
    }
    setPrintingClass('Cliente');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.electronAPI.print('Cliente', currentPrintPayload);
      });
    });
  }

  // --- PONTO CENTRAL DE CONTROLE DE IMPRESSÃO ---
  if (isElectronEnv && window.electronAPI?.onPrintResult) {
    window.electronAPI.onPrintResult(({ copy, success, failureReason }) => {
      if (!success) {
        printStatus.textContent = `Falha na impressão (${copy}): ${failureReason || 'desconhecida'} ⚠️`;
        printStatus.className = 'print-error';
        // A lógica de retry foi removida para garantir um fluxo linear.
        // O usuário pode tentar imprimir novamente se desejar.
        return;
      }

      printStatus.className = 'print-success';

      if (copy === 'Estabelecimento') {
        printStatus.textContent = '1/2 - Via Estabelecimento impressa ✅';
        // 🔥 ESTE É O ÚNICO LUGAR QUE CHAMA A SEGUNDA VIA
        setTimeout(printCliente, 700); // Delay para transição visual
      }


      if (copy === 'Cliente') {
        printStatus.textContent = '2/2 - Via Cliente impressa ✅';
        // Limpeza final após a conclusão
        setTimeout(() => {
          printStatus.textContent = '';
          printStatus.className = '';
          document.body.classList.remove('printing-estabelecimento', 'printing-cliente');
          if (osContatoCli) osContatoCli.style.display = 'none';
          if (osFooterCli) osFooterCli.style.display = 'none';
        }, 4000);
      }
    });
  }


  function generateOSNumber() {
    try {
      let last = parseInt(localStorage.getItem('lastOSNumber') || '0', 10);
      if (isNaN(last)) last = 0;
      if (last >= 999999) last = 0;
      last += 1;
      localStorage.setItem('lastOSNumber', String(last));
      return String(last).padStart(6, '0');
    } catch (e) {
      return 'TS' + Date.now();
    }
  }

  function gerarOS() {
    // Preenche os dados nos elementos HTML
    const newOsNumber = generateOSNumber();
    const clienteVal = (document.getElementById("cliente") || {}).value || '';
    const rawTef = (document.getElementById("tef") || {}).value || '';
    const formattedTef = formatPhone(rawTef) || '-';
    const equipamentoVal = (document.getElementById("equipamento") || {}).value || '';
    const rawValor = Number((document.getElementById("valor") || {}).value) || 0;
    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR");
    const previsaoVal = document.getElementById('previsao') ? document.getElementById('previsao').value : '';
    const notaVal = document.getElementById('nota') ? document.getElementById('nota').value : '';
    const m = previsaoVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const previsaoText = m ? `${m[3]}/${m[2]}/${m[1]}` : (previsaoVal || '-');

    const setIf = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

    currentPrintPayload = {
      osNumber: newOsNumber,
      cliente: clienteVal,
      telefone: formattedTef,
      equipamento: equipamentoVal,
      valor: rawValor,
      previsao: previsaoText,
      nota: notaVal.trim() || '-'
    };

    
    // Preenche Via do Estabelecimento
    setIf('osIdEst', newOsNumber);
    setIf('osClienteEst', clienteVal);
    setIf('osTefEst', formattedTef);
    setIf('osEquipamentoEst', equipamentoVal);
    setIf('osValorEst', 'R$ ' + rawValor.toFixed(2));
    setIf('osDataHoraEst', dataHora);
    setIf('osPrevisaoEst', previsaoText);
    const osNotaEl = document.getElementById('osNotaEst');
    const osNotaTextoEl = document.getElementById('osNotaTextoEst');
    if (osNotaEl && osNotaTextoEl) {
      if (notaVal.trim()) { osNotaTextoEl.textContent = notaVal; osNotaEl.style.display = 'block'; } else { osNotaEl.style.display = 'none'; }
    }
    if (osContatoEst) osContatoEst.style.display = 'none';
    if (osFooterEst) osFooterEst.style.display = 'none';

    // Preenche Via do Cliente
    setIf('osIdCli', newOsNumber);
    setIf('osClienteCli', clienteVal);
    setIf('osTefCli', formattedTef);
    setIf('osEquipamentoCli', equipamentoVal);
    setIf('osValorCli', 'R$ ' + rawValor.toFixed(2));
    setIf('osDataHoraCli', dataHora);
    setIf('osPrevisaoCli', previsaoText);
    const osNotaElCli = document.getElementById('osNotaCli');
    const osNotaTextoElCli = document.getElementById('osNotaTextoCli');
    if (osNotaElCli && osNotaTextoElCli) {
      if (notaVal.trim()) { osNotaTextoElCli.textContent = notaVal; osNotaElCli.style.display = 'block'; } else { osNotaElCli.style.display = 'none'; }
    }
    if (osContatoCli) osContatoCli.style.display = 'none';
    if (osFooterCli) osFooterCli.style.display = 'none';

    // Inicia o fluxo de impressão APENAS se estiver no Electron
    if (isElectronEnv) {
      printEstabelecimento();
    } else {
      // Fallback para navegador (comportamento original)
      printStatus.textContent = 'Abra o diálogo de impressão e imprima 2 vias manualmente.';
      window.print();
    }
  }

  // --- Event Listeners e Configurações Iniciais ---

  const printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', gerarOS);

  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  if (toggleHistoryBtn) toggleHistoryBtn.addEventListener('click', () => {
    if (isElectronEnv && window.electronAPI?.openHistoryWindow) {
      window.electronAPI.openHistoryWindow();
      return;
    }

    window.open('history.html', '_blank');
  });
  
  if (tefInput) {
    tefInput.addEventListener('input', () => {
      tefInput.value = formatPhone(tefInput.value);
      tefInput.selectionStart = tefInput.selectionEnd = tefInput.value.length;
    });
    tefInput.addEventListener('keydown', (e) => {
      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab','Enter'];
      if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
      if (/^\d$/.test(e.key)) return;
      e.preventDefault();
    });
    tefInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = text.replace(/\D/g, '').slice(0, 11);
      const start = tefInput.selectionStart || 0;
      const end = tefInput.selectionEnd || 0;
      const currentDigits = (tefInput.value || '').replace(/\D/g, '');
      const before = currentDigits.slice(0, start ? start : 0);
      const after = currentDigits.slice(end ? end : 0);
      const newDigits = (before + digits + after).slice(0, 11);
      tefInput.value = formatPhone(newDigits);
      tefInput.selectionStart = tefInput.selectionEnd = tefInput.value.length;
    });
  }

  try {
    const saved = localStorage.getItem('previsaoEntrega');
    if (previsaoInput && saved) previsaoInput.value = saved;
  } catch (e) { console.warn('localStorage indisponível', e); }

  if (previsaoInput) {
    previsaoInput.addEventListener('change', () => {
      try { localStorage.setItem('previsaoEntrega', previsaoInput.value); } catch (e) { /* ignore */ }
    });
  }
});