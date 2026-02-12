function gerarOS() {
    const clienteVal = (document.getElementById("cliente") || {}).value || '';
    const tefVal = (document.getElementById("tef") || {}).value || '';
    const equipamentoVal = (document.getElementById("equipamento") || {}).value || '';
    const descricaoVal = (document.getElementById("descricao") || {}).value || '';
    const valorVal = Number((document.getElementById("valor") || {}).value) || 0;
    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR");

    // Preenche ambas as vias (Estabelecimento e Cliente)
    const setIf = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setIf('osClienteEst', clienteVal); setIf('osClienteCli', clienteVal);
    setIf('osTefEst', tefVal); setIf('osTefCli', tefVal);
    setIf('osEquipamentoEst', equipamentoVal); setIf('osEquipamentoCli', equipamentoVal);
    setIf('osNotaTextoEst', descricaoVal); setIf('osNotaTextoCli', descricaoVal);
    setIf('osValorEst', Number(valorVal).toFixed(2)); setIf('osValorCli', Number(valorVal).toFixed(2));
    setIf('osDataHoraEst', dataHora); setIf('osDataHoraCli', dataHora);

    window.print();
}
