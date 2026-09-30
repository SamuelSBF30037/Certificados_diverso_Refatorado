document.addEventListener('DOMContentLoaded', function() {
  // Elementos da interface
  const steps = document.querySelectorAll('.step');
  const sections = document.querySelectorAll('.section-panel');
  
  // Elementos da etapa de upload
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const recordCount = document.getElementById('recordCount');
  const loadFileBtn = document.getElementById('loadFileBtn');
  const viewDataBtn = document.getElementById('viewDataBtn');
  const cancelFileBtn = document.getElementById('cancelFileBtn');
  
  // Elementos da etapa de configuração
  const waitTimeSearch = document.getElementById('waitTimeSearch');
  const waitTimeSearchValue = document.getElementById('waitTimeSearchValue');
  const waitTimeAfterSubmit = document.getElementById('waitTimeAfterSubmit');
  const waitTimeAfterSubmitValue = document.getElementById('waitTimeAfterSubmitValue');
  const autoClick = document.getElementById('autoClick');
  const continueOnError = document.getElementById('continueOnError');
  const camposOpcionais = document.getElementById('camposOpcionais');
  const comandante = document.getElementById('comandante');
  const comandanteCargo = document.getElementById('comandanteCargo');
  const processoSEI = document.getElementById('processoSEI');
  const iniciais = document.getElementById('iniciais');
  const previewTextoComplementar = document.getElementById('previewTextoComplementar');
  const testarTextoBtn = document.getElementById('testarTextoBtn');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const continueToRunBtn = document.getElementById('continueToRunBtn');
  const backToUploadBtn = document.getElementById('backToUploadBtn');
  
  // NOVOS ELEMENTOS: Intervalo de registros
  const linhaInicial = document.getElementById('linhaInicial');
  const linhaFinal = document.getElementById('linhaFinal');
  const totalProcessar = document.getElementById('totalProcessar');
  
  // NOVOS ELEMENTOS: Modo de teste e debug
  const modoTeste = document.getElementById('modoTeste');
  const debugDetalhado = document.getElementById('debugDetalhado');
  
  // Elementos da etapa de execução
  const totalRecordsElem = document.getElementById('totalRecords');
  const successRecordsElem = document.getElementById('successRecords');
  const failedRecordsElem = document.getElementById('failedRecords');
  const pendingRecordsElem = document.getElementById('pendingRecords');
  const currentRecordIndexElem = document.getElementById('currentRecordIndex');
  const totalRecordCountElem = document.getElementById('totalRecordCount');
  const currentRGElem = document.getElementById('currentRG');
  const currentCourseElem = document.getElementById('currentCourse');
  const progressBar = document.getElementById('progressBar');
  const logsContainer = document.getElementById('logs');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const exportLogBtn = document.getElementById('exportLogBtn');
  const backToConfigBtn = document.getElementById('backToConfigBtn');
  
  // NOVOS ELEMENTOS: Etapas detalhadas de progresso
  const progressSteps = document.getElementById('progressSteps');
  
  // NOVOS ELEMENTOS: Modal de confirmação após modo de teste
  const testeModoModal = document.getElementById('testeModoModal');
  const continueProcessingBtn = document.getElementById('continueProcessingBtn');
  const stopTestModeBtn = document.getElementById('stopTestModeBtn');
  
  // Elementos do modal de visualização
  const dataPreviewModal = document.getElementById('dataPreviewModal');
  const dataPreviewTable = document.getElementById('dataPreviewTable');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const confirmDataBtn = document.getElementById('confirmDataBtn');
  
  // Estado da aplicação
  let registros = [];
  let registrosFiltrados = []; // NOVA VARIÁVEL: registros filtrados pelo intervalo definido
  let logs = [];
  let estado = {
    emProcessamento: false,
    pausado: false,
    indiceAtual: 0,
    totalProcessados: 0,
    sucessos: 0,
    falhas: 0,
    modoTesteAtivo: false, // NOVA PROPRIEDADE: controle do modo de teste
    passoAtual: null, // NOVA PROPRIEDADE: controle do passo atual para debug detalhado
    ultimoRegistroProcessado: -1 // NOVA PROPRIEDADE: para controle de persistência
  };
  
  // Configurações padrão
  let config = {
    waitTimeSearch: 5,
    waitTimeAfterSubmit: 3,
    autoClick: true,
    continueOnError: true,
    camposOpcionais: true,
    comandante: "",
    comandanteCargo: "Comandante da Academia de Polícia Militar", 
    processoSEI: "",
    iniciais: "",
    // NOVAS PROPRIEDADES DE CONFIGURAÇÃO
    linhaInicial: 1,
    linhaFinal: 0, // 0 = sem limite
    modoTeste: true,
    debugDetalhado: true
  };
  
  // === INICIALIZAÇÃO ===
  
  // Carrega configurações salvas
  carregarConfiguracoes();
  
  // Carrega estado salvo - NOVA FUNÇÃO
  carregarEstadoSalvo();
  
  // Limpa a área de logs
  logsContainer.innerHTML = '';
  
  // === NAVEGAÇÃO ENTRE ETAPAS ===
  
  // Função para mudar de etapa
  function mudarEtapa(etapa) {
    // Salva o estado atual antes de mudar de etapa - NOVA FUNCIONALIDADE
    salvarEstadoAtual();
    
    // Atualiza as classes dos steps
    steps.forEach(step => {
      const stepEtapa = step.getAttribute('data-step');
      
      if (stepEtapa === etapa) {
        step.classList.add('active');
      } else if (
        (etapa === 'config' && stepEtapa === 'upload') ||
        (etapa === 'run' && (stepEtapa === 'upload' || stepEtapa === 'config'))
      ) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
    
    // Atualiza a seção visível
    sections.forEach(section => {
      if (section.id === etapa) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  }
  
  // Eventos de clique nos steps
  steps.forEach(step => {
    step.addEventListener('click', function() {
      const etapa = this.getAttribute('data-step');
      
      // Só permite voltar para etapas anteriores ou avançar se tiver registros
      if (etapa === 'upload' || 
          (etapa === 'config' && registros.length > 0) ||
          (etapa === 'run' && registros.length > 0)) {
        mudarEtapa(etapa);
      }
    });
  });
  
  // Botões de navegação
  backToUploadBtn.addEventListener('click', () => mudarEtapa('upload'));
  continueToRunBtn.addEventListener('click', () => {
    // Atualiza os registros filtrados antes de ir para a execução - NOVA FUNCIONALIDADE
    atualizarRegistrosFiltrados();
    mudarEtapa('run');
  });
  backToConfigBtn.addEventListener('click', () => mudarEtapa('config'));
  
  // === ETAPA 1: UPLOAD DO ARQUIVO ===
  
  // Drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('dragover');
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('dragover');
    });
  });
  
  dropArea.addEventListener('drop', handleDrop);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelected(files[0]);
    }
  }
  
  // Seleção de arquivo via input
  dropArea.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });
  
  // Processar arquivo selecionado - FUNÇÃO MELHORADA
  function handleFileSelected(file) {
    if (!file) return;
    
    console.log("Arquivo selecionado:", file.name);
    
    // Atualiza a visualização de arquivo
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    dropArea.classList.add('hidden');
    filePreview.classList.remove('hidden');
    
    // Habilita o botão de carregar
    loadFileBtn.disabled = false;
    
    // NOVO: Processar automaticamente o arquivo quando selecionado
    // Isto evita ter que selecionar o arquivo duas vezes
    loadFileBtn.click();
  }
  
  // Formatar tamanho do arquivo
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Cancelar seleção de arquivo
  cancelFileBtn.addEventListener('click', () => {
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropArea.classList.remove('hidden');
    loadFileBtn.disabled = true;
  });
  
  // Carregar arquivo - FUNÇÃO MELHORADA
  loadFileBtn.addEventListener('click', () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      mostrarNotificacao('Selecione um arquivo Excel ou CSV primeiro.', 'error');
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    loadFileBtn.disabled = true;
    loadFileBtn.textContent = 'Processando...';
    
    // Adicionar log para debugging
    console.log("Iniciando processamento do arquivo:", file.name);
    
    reader.onload = function(e) {
      try {
        let data;
        if (file.name.endsWith('.csv')) {
          // Processar CSV
          const csvText = e.target.result;
          data = processarCSV(csvText);
          console.log("Dados CSV processados:", data.length, "registros");
        } else {
          // Processar Excel com SheetJS
          const arrayBuffer = e.target.result;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(worksheet);
          console.log("Dados Excel processados:", data.length, "registros");
        }
        
        // Formata os registros no padrão esperado
        registros = formatarRegistros(data);
        console.log("Registros formatados:", registros.length, "registros válidos");
        
        // CORREÇÃO: Garantir que registrosFiltrados seja inicializado corretamente
        registrosFiltrados = [...registros];
        
        // Atualiza a interface
        recordCount.textContent = registros.length + ' registros';
        totalRecordsElem.textContent = registros.length;
        pendingRecordsElem.textContent = registros.length;
        currentRecordIndexElem.textContent = '0';
        totalRecordCountElem.textContent = registros.length;
        
        // Atualiza os campos de intervalo com valores padrão
        linhaInicial.value = "1";
        linhaFinal.value = "0"; // 0 = todos
        atualizarTotalProcessar(); // Nova função
        
        // Salva os registros para uso posterior
        chrome.storage.local.set({ 
          registros: registros,
          registrosFiltrados: registrosFiltrados 
        }, function() {
          loadFileBtn.textContent = 'Continuar';
          loadFileBtn.disabled = false;
          
          // Preenche a tabela de visualização
          preencherTabelaVisualizacao();
          
          // Exibe notificação
          mostrarNotificacao(`Arquivo processado com sucesso! ${registros.length} registros encontrados.`, 'success');
          
          // Avança para a próxima etapa
          mudarEtapa('config');
        });
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        loadFileBtn.textContent = 'Continuar';
        loadFileBtn.disabled = true;
        mostrarNotificacao(`Erro ao processar o arquivo: ${error.message}`, 'error');
      }
    };
    
    reader.onerror = function(e) {
      console.error('Erro na leitura do arquivo:', e);
      loadFileBtn.textContent = 'Continuar';
      loadFileBtn.disabled = true;
      mostrarNotificacao(`Erro na leitura do arquivo: ${e.target.error}`, 'error');
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
  
  // Visualizar dados - FUNÇÃO MELHORADA
  viewDataBtn.addEventListener('click', () => {
    if (registros.length > 0) {
      abrirModal();
    } else {
      mostrarNotificacao('Carregue o arquivo primeiro para visualizar os dados.', 'warning');
    }
  });
  
  // Preenche a tabela de visualização
  function preencherTabelaVisualizacao() {
    console.log("Preenchendo tabela de visualização com", registros.length, "registros");
    
    const tbody = dataPreviewTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Limita a visualização a 100 registros para performance
    const registrosParaMostrar = registros.slice(0, 100);
    
    registrosParaMostrar.forEach((registro, index) => {
      const tr = document.createElement('tr');
      
      // Texto complementar truncado para exibição na tabela
      let textoComplementarExibicao = registro.textoComplementar || '';
      if (textoComplementarExibicao.length > 50) {
        textoComplementarExibicao = textoComplementarExibicao.substring(0, 47) + '...';
      }
      
      tr.innerHTML = `
        <td>${registro.rg}</td>
        <td>${registro.tipoCurso}</td>
        <td>${registro.nomeCurso}</td>
        <td>${registro.local}</td>
        <td>${registro.cargaHoraria}</td>
        <td>${registro.mencao}</td>
        <td>${registro.nota}</td>
        <td>${registro.classificacao}</td>
        <td title="${registro.textoComplementar}">${textoComplementarExibicao}</td>
      `;
      
      tbody.appendChild(tr);
    });
    
    if (registros.length > 100) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="9" style="text-align: center; font-style: italic;">Mostrando 100 de ${registros.length} registros...</td>`;
      tbody.appendChild(tr);
    }
  }
  
  // === ETAPA 2: CONFIGURAÇÕES ===
  
  // NOVA FUNÇÃO: Atualizar cálculo de registros a processar
  function atualizarTotalProcessar() {
    const inicio = parseInt(linhaInicial.value) || 1;
    const fim = parseInt(linhaFinal.value) || 0;
    
    if (registros.length === 0) {
      totalProcessar.textContent = "Nenhum registro carregado";
      return;
    }
    
    if (inicio < 1) {
      totalProcessar.textContent = "Linha inicial inválida";
      return;
    }
    
    if (inicio > registros.length) {
      totalProcessar.textContent = "Linha inicial maior que o total de registros";
      return;
    }
    
    if (fim === 0) {
      const total = registros.length - inicio + 1;
      totalProcessar.textContent = `${total} registro${total !== 1 ? 's' : ''} (até o final)`;
    } else if (fim < inicio) {
      totalProcessar.textContent = "Linha final deve ser maior que a linha inicial";
    } else {
      const total = Math.min(fim, registros.length) - inicio + 1;
      totalProcessar.textContent = `${total} registro${total !== 1 ? 's' : ''}`;
    }
  }
  
  // NOVA FUNÇÃO: Atualizar registros filtrados pelo intervalo selecionado
  function atualizarRegistrosFiltrados() {
    const inicio = Math.max(1, parseInt(linhaInicial.value) || 1);
    const fim = parseInt(linhaFinal.value) || 0;
    
    // Ajusta o índice para base 0
    const indiceInicio = inicio - 1;
    const indiceFim = fim > 0 ? Math.min(fim - 1, registros.length - 1) : registros.length - 1;
    
    if (indiceInicio <= indiceFim) {
      registrosFiltrados = registros.slice(indiceInicio, indiceFim + 1);
    } else {
      registrosFiltrados = [];
    }
    
    // Atualiza contadores na interface
    totalRecordsElem.textContent = registrosFiltrados.length;
    pendingRecordsElem.textContent = registrosFiltrados.length;
    totalRecordCountElem.textContent = registrosFiltrados.length;
    
    console.log("Registros filtrados atualizados:", registrosFiltrados.length, "registros");
  }
  
  // Adiciona event listeners para os campos de intervalo
  linhaInicial.addEventListener('input', atualizarTotalProcessar);
  linhaFinal.addEventListener('input', atualizarTotalProcessar);
  
  // Formatação de texto complementar
  function formatarTextoComplementar(textoOriginal = "") {
    let texto = textoOriginal.trim();
    
    // Adiciona o nome do comandante se existir
    if (config.comandante) {
      // Adiciona ponto final se não tiver
      if (texto && !texto.endsWith(".")) {
        texto += ".";
      }
      
      texto += ` ${config.comandante}`;
      
      // Adiciona cargo do comandante se existir
      if (config.comandanteCargo) {
        texto += `, ${config.comandanteCargo}`;
      }
      
      // Adiciona ponto final
      if (!texto.endsWith(".")) {
        texto += ".";
      }
    }
    
    // Adiciona processo SEI se existir
    if (config.processoSEI) {
      texto += ` Processo SEI nº ${config.processoSEI}.`;
    }
    
    // Adiciona iniciais se existir
    if (config.iniciais) {
      texto += ` ${config.iniciais}`;
    }
    
    return texto;
  }
  
  // Preview do texto complementar
  function atualizarPreviewTexto() {
    const textoExemplo = "O(A) 1º TENENTE *102* ABRAÃO FERREIRA BARROS JUNIOR, concluiu o curso de INTELIGÊNCIA DE SEGURANÇA ORGÂNICA - ISO realizado pela plataforma EAD GEAD, no Ciclo 02/2024 com carga horária de 60 hr/a e nota final 98";
    
    // Atualiza config com os valores atuais dos campos
    config.comandante = comandante.value.trim();
    config.comandanteCargo = comandanteCargo.value.trim();
    config.processoSEI = processoSEI.value.trim();
    config.iniciais = iniciais.value.trim().toUpperCase();
    
    const textoFormatado = formatarTextoComplementar(textoExemplo);
    previewTextoComplementar.querySelector('.text-preview-content').textContent = textoFormatado;
  }
  
  // Eventos para atualizar preview
  [comandante, comandanteCargo, processoSEI, iniciais].forEach(campo => {
    campo.addEventListener('input', atualizarPreviewTexto);
  });
  
  // Botão de testar texto
  testarTextoBtn.addEventListener('click', atualizarPreviewTexto);
  
  // Atualiza os valores dos sliders
  waitTimeSearch.addEventListener('input', () => {
    waitTimeSearchValue.textContent = waitTimeSearch.value;
  });
  
  waitTimeAfterSubmit.addEventListener('input', () => {
    waitTimeAfterSubmitValue.textContent = waitTimeAfterSubmit.value;
  });
  
  // Salva configurações
  saveConfigBtn.addEventListener('click', () => {
    config.waitTimeSearch = parseInt(waitTimeSearch.value) || 5;
    config.waitTimeAfterSubmit = parseInt(waitTimeAfterSubmit.value) || 3;
    config.autoClick = autoClick.checked;
    config.continueOnError = continueOnError.checked;
    config.camposOpcionais = camposOpcionais.checked;
    config.comandante = comandante.value.trim();
    config.comandanteCargo = comandanteCargo.value.trim();
    config.processoSEI = processoSEI.value.trim();
    config.iniciais = iniciais.value.trim().toUpperCase();
    
    // NOVOS PARÂMETROS DE CONFIGURAÇÃO
    config.linhaInicial = Math.max(1, parseInt(linhaInicial.value) || 1);
    config.linhaFinal = parseInt(linhaFinal.value) || 0;
    config.modoTeste = modoTeste.checked;
    config.debugDetalhado = debugDetalhado.checked;
    
    chrome.storage.local.set({ config: config }, function() {
      mostrarNotificacao('Configurações salvas com sucesso!', 'success');
      
      // Atualiza o preview para refletir as configurações salvas
      atualizarPreviewTexto();
      // Atualiza contagem de registros a processar
      atualizarTotalProcessar();
    });
  });
  
  // Carrega configurações
  function carregarConfiguracoes() {
    chrome.storage.local.get('config', function(result) {
      if (result.config) {
        config = result.config;
        
        // Atualiza a interface com as configurações
        atualizarInterfaceComConfiguracoes();
      }
    });
  }
  
  // NOVA FUNÇÃO: Atualiza a interface com as configurações carregadas
  function atualizarInterfaceComConfiguracoes() {
    waitTimeSearch.value = config.waitTimeSearch;
    waitTimeSearchValue.textContent = config.waitTimeSearch;
    
    waitTimeAfterSubmit.value = config.waitTimeAfterSubmit;
    waitTimeAfterSubmitValue.textContent = config.waitTimeAfterSubmit;
    
    autoClick.checked = config.autoClick;
    continueOnError.checked = config.continueOnError !== undefined ? config.continueOnError : true;
    camposOpcionais.checked = config.camposOpcionais !== undefined ? config.camposOpcionais : true;
    
    // Campos do texto complementar
    if (config.comandante !== undefined) comandante.value = config.comandante;
    if (config.comandanteCargo !== undefined) comandanteCargo.value = config.comandanteCargo;
    if (config.processoSEI !== undefined) processoSEI.value = config.processoSEI;
    if (config.iniciais !== undefined) iniciais.value = config.iniciais;
    
    // NOVOS CAMPOS
    if (config.linhaInicial !== undefined) linhaInicial.value = config.linhaInicial;
    if (config.linhaFinal !== undefined) linhaFinal.value = config.linhaFinal;
    if (config.modoTeste !== undefined) modoTeste.checked = config.modoTeste;
    if (config.debugDetalhado !== undefined) debugDetalhado.checked = config.debugDetalhado;
    
    // Atualiza o preview
    atualizarPreviewTexto();
    // Atualiza contagem de registros a processar
    atualizarTotalProcessar();
  }
  
  // NOVA FUNÇÃO: Carregar estado salvo
  function carregarEstadoSalvo() {
    console.log("Tentando carregar estado salvo...");
    
    chrome.storage.local.get(['estado', 'registros', 'registrosFiltrados', 'logs', 'config'], function(result) {
      console.log("Dados recuperados do storage:", result);
      
      // Primeiro carregamos as configurações, pois o estado pode depender delas
      if (result.config) {
        config = result.config;
        // Atualiza a interface com as configurações
        atualizarInterfaceComConfiguracoes();
      }
      
      // Restaura registros se existirem
      if (result.registros && result.registros.length > 0) {
        registros = result.registros;
        
        // Se tivermos registrosFiltrados salvos, usamos eles também
        if (result.registrosFiltrados && result.registrosFiltrados.length > 0) {
          registrosFiltrados = result.registrosFiltrados;
        } else {
          registrosFiltrados = [...registros]; // Copia todos os registros para filtrados
        }
        
        recordCount.textContent = registros.length + ' registros';
        
        // CORREÇÃO: Atualiza a visualização de arquivo na interface
        if (filePreview && dropArea) {
          dropArea.classList.add('hidden');
          filePreview.classList.remove('hidden');
          fileName.textContent = "Arquivo restaurado";
          fileSize.textContent = formatFileSize(JSON.stringify(registros).length);
        }
        
        console.log("Registros restaurados:", registros.length);
        console.log("Registros filtrados restaurados:", registrosFiltrados.length);
      }
      
      if (result.estado) {
        // Restaura valores salvos, mas reinicia flags de controle
        estado = {
          ...result.estado,
          emProcessamento: false,
          pausado: true // Pausado por padrão ao restaurar
        };
        
        console.log("Estado restaurado:", estado);
        
        // Se temos um progresso salvo, atualizamos a interface
        if (estado.indiceAtual > 0 || estado.totalProcessados > 0) {
          // Atualiza a interface de progresso
          updateProgressoComEstadoSalvo();
          
          // Mostrar mensagem de restauração
          mostrarNotificacao('Estado anterior restaurado. Você pode continuar de onde parou.', 'info');
          
          // CORREÇÃO: Se já carregamos registros, vamos direto para a tela de configuração ou execução
          if (registros.length > 0) {
            // Se já processou algum registro, vai para a tela de execução
            if (estado.totalProcessados > 0) {
              mudarEtapa('run');
            } else {
              mudarEtapa('config'); // Caso contrário, vai para a tela de configuração
            }
          }
        }
      }
      
      // Restaura logs
      if (result.logs && result.logs.length > 0) {
        logs = result.logs;
        // Limpa log container
        logsContainer.innerHTML = '';
        // Adiciona logs salvos à interface
        logs.forEach(log => {
          const logEntry = document.createElement('div');
          logEntry.className = `log-entry ${log.type}`;
          logEntry.innerHTML = `
            <div class="log-time">${log.time}</div>
            <div class="log-message">${log.message}</div>
          `;
          logsContainer.appendChild(logEntry);
        });
        
        // Rola para o final
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    });
  }
  
  // NOVA FUNÇÃO: Atualiza interface de progresso com estado restaurado
  function updateProgressoComEstadoSalvo() {
    successRecordsElem.textContent = estado.sucessos;
    failedRecordsElem.textContent = estado.falhas;
    pendingRecordsElem.textContent = registrosFiltrados.length - estado.totalProcessados;
    currentRecordIndexElem.textContent = estado.indiceAtual;
    totalRecordCountElem.textContent = registrosFiltrados.length;
    
    const percentual = Math.round((estado.totalProcessados / registrosFiltrados.length) * 100);
    progressBar.style.width = `${percentual}%`;
  }
  
  // NOVA FUNÇÃO: Salvar estado atual
  function salvarEstadoAtual() {
    chrome.storage.local.set({ 
      estado: estado,
      logs: logs,
      registrosFiltrados: registrosFiltrados
    }, function() {
      console.log('Estado salvo:', estado);
    });
  }
  
  // === ETAPA 3: EXECUÇÃO ===
  
  // NOVA FUNÇÃO: Atualizar etapa no debug detalhado
  function atualizarEtapaDebug(passo, status = 'processing') {
    if (!config.debugDetalhado) return;
    
    // Limpa o estado anterior
    const steps = progressSteps.querySelectorAll('.progress-step');
    steps.forEach(step => {
      step.classList.remove('active', 'success', 'error', 'waiting');
      step.classList.add('waiting');
    });
    
    // Atualiza o passo atual
    const currentStep = progressSteps.querySelector(`[data-step="${passo}"]`);
    if (currentStep) {
      currentStep.classList.remove('waiting');
      currentStep.classList.add(status);
      
      // Marca os passos anteriores como concluídos
      let marcarAnteriores = true;
      steps.forEach(step => {
        if (step === currentStep) {
          marcarAnteriores = false;
        } else if (marcarAnteriores) {
          step.classList.remove('waiting', 'active', 'error');
          step.classList.add('success');
        }
      });
    }
    
    estado.passoAtual = passo;
  }
  
  // NOVA FUNÇÃO: Mostrar modal de continuação após modo de teste
  function mostrarModalContinuacao() {
    testeModoModal.classList.add('show');
  }
  
  // NOVA FUNÇÃO: Fechar modal de continuação
  function fecharModalContinuacao() {
    testeModoModal.classList.remove('show');
  }
  
  // Adiciona event listeners para o modal de continuação
  continueProcessingBtn.addEventListener('click', function() {
    fecharModalContinuacao();
    estado.modoTesteAtivo = false;
    estado.pausado = false; // CORREÇÃO: Reseta o status de pausa
    
    // Atualiza a interface do botão de pausa para refletir que não está mais pausado
    pauseBtn.innerHTML = '<svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pausar';
    
    adicionarLog('Continuando processamento após modo de teste', 'info');
    processarProximoRegistro();
  });
  
  stopTestModeBtn.addEventListener('click', function() {
    fecharModalContinuacao();
    estado.modoTesteAtivo = false;
    mudarEtapa('config');
    adicionarLog('Modo de teste finalizado. Voltando às configurações.', 'info');
  });
  
  // Inicia o processamento
  startBtn.addEventListener('click', function() {
    if (registrosFiltrados.length === 0) {
      mostrarNotificacao('Não há registros para processar. Verifique o intervalo selecionado.', 'warning');
      return;
    }
    
    if (estado.emProcessamento && estado.pausado) {
      // Continuar de onde parou
      estado.pausado = false;
      pauseBtn.textContent = 'Pausar';
      pauseBtn.querySelector('.button-icon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      adicionarLog('Processamento continuado.', 'info');
      processarProximoRegistro();
      return;
    }
    
    if (!estado.emProcessamento) {
      // Iniciar novo processamento
      resetarEstado();
      estado.emProcessamento = true;
      estado.modoTesteAtivo = config.modoTeste;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      
      // Resetar as etapas de debug detalhado
      atualizarEtapaDebug('prepare');
      
      // Verifica se a página está aberta
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
          mostrarNotificacao('Abra a página do formulário primeiro!', 'error');
          resetarEstado();
          return;
        }
        
        const tabId = tabs[0].id;
        
        // CORREÇÃO: Verifica se o content script está carregado
        verificarContentScriptCarregado(tabId, function(carregado) {
          if (!carregado) {
            mostrarNotificacao('O script de conteúdo não está carregado. Atualizando página...', 'warning');
            
            // Tenta injetar o script manualmente
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            }, function() {
              // Espera um pouco para o script ser carregado
              setTimeout(function() {
                verificarPaginaEIniciar(tabId);
              }, 2000);
            });
          } else {
            verificarPaginaEIniciar(tabId);
          }
        });
      });
    }
  });
  
  // NOVA FUNÇÃO: Verifica se o content script está carregado
  function verificarContentScriptCarregado(tabId, callback) {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, function(response) {
        if (chrome.runtime.lastError) {
          console.warn("Content script não está carregado:", chrome.runtime.lastError);
          callback(false);
        } else {
          console.log("Content script está carregado:", response);
          callback(true);
        }
      });
    } catch (e) {
      console.error("Erro ao verificar content script:", e);
      callback(false);
    }
  }
  
  // NOVA FUNÇÃO: Verifica a página e inicia o processamento
  function verificarPaginaEIniciar(tabId) {
    // Primeiro verifica se a página está pronta
    adicionarLog('Verificando se a página está pronta para processamento...', 'info');
    
    chrome.tabs.sendMessage(tabId, { action: 'verificarPagina' }, function(response) {
      if (chrome.runtime.lastError) {
        mostrarNotificacao('Erro ao comunicar com a página. Verifique se está na página correta.', 'error');
        adicionarLog('Erro de comunicação: ' + chrome.runtime.lastError.message, 'error');
        resetarEstado();
        return;
      }
      
      if (!response || !response.paginaPronta) {
        mostrarNotificacao('A página não está pronta ou não é a página correta do formulário.', 'error');
        adicionarLog('Página não está pronta. Navegue até a página do formulário.', 'error');
        resetarEstado();
        return;
      }
    
      adicionarLog('Página verificada. Iniciando processamento...', 'success');
      atualizarEtapaDebug('prepare', 'success');
    
      // Inicia o processamento
      chrome.tabs.sendMessage(tabId, { 
        action: 'iniciar',
        registros: registrosFiltrados,
        config: config
      }, function(response) {
        if (chrome.runtime.lastError) {
          mostrarNotificacao('Erro ao comunicar com a página. Verifique se está na página correta.', 'error');
          adicionarLog('Erro de comunicação: ' + chrome.runtime.lastError.message, 'error');
          resetarEstado();
          return;
        }
        
        if (response && response.status === 'pronto') {
          processarProximoRegistro();
        } else if (response && response.status === 'erro') {
          mostrarNotificacao(`Erro ao iniciar: ${response.mensagem}`, 'error');
          adicionarLog(`Erro ao iniciar: ${response.mensagem}`, 'error');
          resetarEstado();
        } else {
          mostrarNotificacao('Erro ao iniciar o processamento na página.', 'error');
          resetarEstado();
        }
      });
    });
  }
  
  // Pausa o processamento
  pauseBtn.addEventListener('click', function() {
    if (estado.emProcessamento) {
      estado.pausado = !estado.pausado;
      if (estado.pausado) {
        pauseBtn.innerHTML = '<svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg> Continuar';
        adicionarLog('Processamento pausado.', 'warning');
        salvarEstadoAtual(); // Salva o estado ao pausar
      } else {
        pauseBtn.innerHTML = '<svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pausar';
        adicionarLog('Processamento continuado.', 'info');
        processarProximoRegistro();
      }
    }
  });
  
  // Para o processamento
  stopBtn.addEventListener('click', function() {
    if (confirm('Tem certeza que deseja parar o processamento? O progresso atual será perdido.')) {
      // Envia mensagem para o script de conteúdo para interromper processamento
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'parar' });
        }
      });
      
      resetarEstado();
      adicionarLog('Processamento interrompido pelo usuário.', 'warning');
      salvarEstadoAtual(); // Salva o estado final
    }
  });
  
  // Exporta o log
  exportLogBtn.addEventListener('click', function() {
    if (logs.length === 0) {
      mostrarNotificacao('Não há logs para exportar.', 'warning');
      return;
    }
    
    // Cria um arquivo de texto com os logs
    const logsTexto = logs.map(log => `[${log.time}] ${log.message}`).join('\n');
    const blob = new Blob([logsTexto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Cria um link para download e clica nele
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_cadastramento_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Limpa
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });
  
  // Processa o próximo registro
  function processarProximoRegistro(tentativas = 0) {
    if (!estado.emProcessamento || estado.pausado) {
      return;
    }
    
    if (estado.indiceAtual >= registrosFiltrados.length) {
      // Processamento concluído
      finalizarProcessamento();
      return;
    }
    
    // Número máximo de tentativas para processar um registro
    const MAX_TENTATIVAS = 3;
    
    // Atualiza o status
    const registro = registrosFiltrados[estado.indiceAtual];
    atualizarProgresso();
    
    // Atualiza o registro atual na UI
    currentRecordIndexElem.textContent = estado.indiceAtual + 1;
    currentRGElem.textContent = registro.rg;
    currentCourseElem.textContent = registro.nomeCurso;
    
    // Se é uma nova tentativa, indica isso no log
    const tentativaMsg = tentativas > 0 ? ` (tentativa ${tentativas + 1})` : '';
    adicionarLog(`Processando: RG ${registro.rg} - ${registro.nomeCurso}${tentativaMsg}`, 'info');
    
    // Reseta etapas de debug
    atualizarEtapaDebug('insertRG', 'active');
    
    // Envia o registro atual para o script de conteúdo
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        mostrarNotificacao('A página do formulário não está mais acessível!', 'error');
        resetarEstado();
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'processar',
        registro: registro,
        indice: estado.indiceAtual,
        tentativa: tentativas,
        debugDetalhado: config.debugDetalhado
      }, function(response) {
        if (chrome.runtime.lastError) {
          // Erro de comunicação com a página
          console.error("Erro ao enviar mensagem para a página:", chrome.runtime.lastError);
          atualizarEtapaDebug(estado.passoAtual || 'insertRG', 'error');
          
          if (tentativas < MAX_TENTATIVAS) {
            // Tenta novamente após um atraso
            adicionarLog(`Erro de comunicação. Tentando novamente em 3 segundos...`, 'warning');
            setTimeout(() => processarProximoRegistro(tentativas + 1), 3000);
          } else {
            // Falha definitiva após várias tentativas
            adicionarLog(`Falha na comunicação após ${MAX_TENTATIVAS} tentativas.`, 'error');
            estado.falhas++;
            estado.indiceAtual++;
            estado.totalProcessados++;
            estado.ultimoRegistroProcessado = estado.indiceAtual - 1;
            atualizarProgresso();
            salvarEstadoAtual();
            
            // Continua para o próximo registro se configurado para isso
            if (config.continueOnError) {
              setTimeout(processarProximoRegistro, 1000);
            } else {
              mostrarNotificacao('Processamento interrompido devido a erros consecutivos.', 'error');
              resetarEstado();
            }
          }
        }
        // O processamento continua na resposta do content script via evento
      });
    });
  }
  
  // Atualiza o progresso na UI
  function atualizarProgresso() {
    const percentual = registrosFiltrados.length > 0 ? 
      Math.round((estado.totalProcessados / registrosFiltrados.length) * 100) : 0;
    progressBar.style.width = `${percentual}%`;
    
    successRecordsElem.textContent = estado.sucessos;
    failedRecordsElem.textContent = estado.falhas;
    pendingRecordsElem.textContent = registrosFiltrados.length - estado.totalProcessados;
    
    // Salva o estado para persistência
    salvarEstadoAtual();
  }
  
  // Finaliza o processamento
  function finalizarProcessamento() {
    estado.emProcessamento = false;
    estado.pausado = false;
    estado.modoTesteAtivo = false;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    // Reset das etapas de debug
    atualizarEtapaDebug('check', 'success');
    
    atualizarProgresso();
    adicionarLog(`Processamento concluído! ${estado.sucessos} registros com sucesso, ${estado.falhas} falhas.`, estado.falhas > 0 ? 'warning' : 'success');
    mostrarNotificacao(`Processamento concluído! ${estado.sucessos} registros com sucesso, ${estado.falhas} falhas.`, estado.falhas > 0 ? 'warning' : 'success');
    
    // Salva o estado final
    salvarEstadoAtual();
  }
  
  // Reseta o estado do processamento
  function resetarEstado() {
    estado = {
      emProcessamento: false,
      pausado: false,
      indiceAtual: 0,
      totalProcessados: 0,
      sucessos: 0,
      falhas: 0,
      modoTesteAtivo: false,
      passoAtual: null,
      ultimoRegistroProcessado: -1
    };
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    progressBar.style.width = '0%';
    
    successRecordsElem.textContent = '0';
    failedRecordsElem.textContent = '0';
    pendingRecordsElem.textContent = registrosFiltrados.length.toString();
    currentRecordIndexElem.textContent = '0';
    currentRGElem.textContent = '-';
    currentCourseElem.textContent = '-';
    
    // Reset das etapas de debug
    const steps = progressSteps.querySelectorAll('.progress-step');
    steps.forEach(step => {
      step.classList.remove('active', 'success', 'error');
      step.classList.add('waiting');
    });
  }
  
  // === MODAL DE VISUALIZAÇÃO ===
  
  // Abrir modal - FUNÇÃO MELHORADA
  function abrirModal() {
    // Certifique-se de que a tabela está preenchida antes de abrir
    preencherTabelaVisualizacao();
    
    // Log para verificar se o modal está sendo acionado
    console.log("Abrindo modal de visualização de dados");
    
    // Adiciona a classe para mostrar o modal
    dataPreviewModal.classList.add('show');
    
    // Garantir que o modal esteja visível
    dataPreviewModal.style.opacity = "1";
    dataPreviewModal.style.visibility = "visible";
  }
  
  // Fechar modal
  function fecharModal() {
    dataPreviewModal.classList.remove('show');
  }
  
  closeModalBtn.addEventListener('click', fecharModal);
  confirmDataBtn.addEventListener('click', fecharModal);
  
  // Fechar modal clicando fora
  dataPreviewModal.addEventListener('click', function(e) {
    if (e.target === dataPreviewModal) {
      fecharModal();
    }
  });
  
  // === FUNÇÕES DE PROCESSAMENTO ===
  
  // Processa dados de um CSV
  function processarCSV(csvText) {
    const linhas = csvText.split('\n');
    if (linhas.length < 2) {
      throw new Error('O arquivo CSV não contém dados suficientes.');
    }
    
    const cabecalho = linhas[0].split(',').map(h => h.trim());
    const registros = [];
    
    for (let i = 1; i < linhas.length; i++) {
      if (!linhas[i].trim()) continue;
      
      const valores = parseCSVLine(linhas[i]);
      const registro = {};
      
      cabecalho.forEach((campo, index) => {
        if (index < valores.length) {
          registro[campo] = valores[index];
        }
      });
      
      registros.push(registro);
    }
    
    return registros;
  }
  
  // Processa uma linha de CSV lidando com campos entre aspas
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      result.push(current.trim());
    }
    
    return result;
  }
  
  // Formata os registros no padrão esperado pelo script
 // Modificações na função formatarRegistros() em popup.js

// Formata os registros no padrão esperado pelo script
function formatarRegistros(dados) {
  return dados.map(item => {
    // Mapeia os campos com nomes variados para o padrão esperado
    const rg = item.RG || item.rg || item.Rg || '';
    const tipoCurso = item['Tipo Curso'] || item.tipoCurso || item.TipoCurso || '249';
    const nomeCurso = item['Nome Curso'] || item.nomeCurso || item.NomeCurso || '';
    const local = item.Local || item.local || '';
    const cargaHoraria = item['Carga Horária'] || item.cargaHoraria || item.CargaHoraria || '';
    // Removidos os valores padrão '1' que estavam aqui
    const mencao = item.Menção || item.mencao || item.Mencao || '';
    const nota = item.Nota || item.nota || '';
    const classificacao = item.Classificação || item.classificacao || item.Classificacao || '';
    
    // Obter o texto complementar original sem aplicar formatação ainda
    let textoComplementarOriginal = item['Texto Complementar'] || item.textoComplementar || item.TextoComplementar || '';
    
    // Formata os dados conforme necessário
    let notaFormatada = nota;
    if (notaFormatada && parseFloat(notaFormatada.replace(',', '.')) > 10) {
      // Converte escala de 0-100 para 0-10
      notaFormatada = (parseFloat(notaFormatada.replace(',', '.')) / 10).toFixed(2);
    }
    
    // NÃO aplicamos a formatação agora, apenas guardamos o texto original
    // A formatação será aplicada no momento do processamento para garantir
    // que usa as configurações mais recentes
    
    const registro = {
      rg: String(rg).trim(),
      tipoCurso: String(tipoCurso).trim(),
      nomeCurso: String(nomeCurso).trim(),
      local: String(local).trim(),
      cargaHoraria: String(cargaHoraria).trim(),
      textoComplementarOriginal: textoComplementarOriginal, // Guardamos o texto original
      textoComplementar: textoComplementarOriginal, // Inicializado com o texto original
      // Valores vazios para campos opcionais
      mencao: '',
      nota: '',
      classificacao: ''
    };
    
    // Adiciona campos opcionais apenas se não estiver configurado para tratá-los como opcionais
    // ou se tiverem valores válidos
    if (!config.camposOpcionais || mencao) {
      registro.mencao = String(mencao).trim();
    }
    
    if (!config.camposOpcionais || notaFormatada) {
      registro.nota = String(notaFormatada).replace(',', '.').trim();
    }
    
    if (!config.camposOpcionais || classificacao) {
      registro.classificacao = String(classificacao).trim();
    }
    
    return registro;
  }).filter(registro => registro.rg && registro.nomeCurso);
}

// NOVA FUNÇÃO em popup.js: Atualiza o texto complementar com as configurações atuais
function atualizarTextoComplementarRegistros() {
  // Aplica a formatação atual a todos os registros
  registros.forEach(registro => {
    registro.textoComplementar = formatarTextoComplementar(registro.textoComplementarOriginal);
  });
  
  // Também atualiza os registros filtrados
  registrosFiltrados.forEach(registro => {
    registro.textoComplementar = formatarTextoComplementar(registro.textoComplementarOriginal);
  });
  
  // Salva os registros atualizados
  chrome.storage.local.set({ 
    registros: registros,
    registrosFiltrados: registrosFiltrados 
  });
  
  console.log("Texto complementar atualizado em todos os registros com as configurações atuais");
}

// Modificar a função saveConfigBtn.addEventListener em popup.js
// Adicionar após salvar as configurações:

saveConfigBtn.addEventListener('click', () => {
  config.waitTimeSearch = parseInt(waitTimeSearch.value) || 5;
  config.waitTimeAfterSubmit = parseInt(waitTimeAfterSubmit.value) || 3;
  config.autoClick = autoClick.checked;
  config.continueOnError = continueOnError.checked;
  config.camposOpcionais = camposOpcionais.checked;
  config.comandante = comandante.value.trim();
  config.comandanteCargo = comandanteCargo.value.trim();
  config.processoSEI = processoSEI.value.trim();
  config.iniciais = iniciais.value.trim().toUpperCase();
  
  // NOVOS PARÂMETROS DE CONFIGURAÇÃO
  config.linhaInicial = Math.max(1, parseInt(linhaInicial.value) || 1);
  config.linhaFinal = parseInt(linhaFinal.value) || 0;
  config.modoTeste = modoTeste.checked;
  config.debugDetalhado = debugDetalhado.checked;
  
  chrome.storage.local.set({ config: config }, function() {
    // ATUALIZAR AQUI: Aplicar as novas configurações do texto complementar aos registros
    atualizarTextoComplementarRegistros();
    
    mostrarNotificacao('Configurações salvas com sucesso!', 'success');
    
    // Atualiza o preview para refletir as configurações salvas
    atualizarPreviewTexto();
    // Atualiza contagem de registros a processar
    atualizarTotalProcessar();
  });
});

// Modificar a função continueToRunBtn.addEventListener em popup.js
// Antes de mudar para a etapa 'run':

continueToRunBtn.addEventListener('click', () => {
  // Atualiza os textos complementares com as configurações atuais
  atualizarTextoComplementarRegistros();
  
  // Atualiza os registros filtrados antes de ir para a execução
  atualizarRegistrosFiltrados();
  mudarEtapa('run');
});

// Função modificada para verificar e exibir o texto complementar na tabela (popup.js)
function preencherTabelaVisualizacao() {
  console.log("Preenchendo tabela de visualização com", registros.length, "registros");
  
  const tbody = dataPreviewTable.querySelector('tbody');
  tbody.innerHTML = '';
  
  // Limita a visualização a 100 registros para performance
  const registrosParaMostrar = registros.slice(0, 100);
  
  // Atualiza o texto complementar antes de exibir
  registrosParaMostrar.forEach(registro => {
    if (!registro.textoComplementar && registro.textoComplementarOriginal) {
      registro.textoComplementar = formatarTextoComplementar(registro.textoComplementarOriginal);
    }
  });
  
  registrosParaMostrar.forEach((registro, index) => {
    const tr = document.createElement('tr');
    
    // Texto complementar truncado para exibição na tabela
    let textoComplementarExibicao = registro.textoComplementar || '';
    if (textoComplementarExibicao.length > 50) {
      textoComplementarExibicao = textoComplementarExibicao.substring(0, 47) + '...';
    }
    
    tr.innerHTML = `
      <td>${registro.rg}</td>
      <td>${registro.tipoCurso}</td>
      <td>${registro.nomeCurso}</td>
      <td>${registro.local}</td>
      <td>${registro.cargaHoraria}</td>
      <td>${registro.mencao}</td>
      <td>${registro.nota}</td>
      <td>${registro.classificacao}</td>
      <td title="${registro.textoComplementar}">${textoComplementarExibicao}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  if (registros.length > 100) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="9" style="text-align: center; font-style: italic;">Mostrando 100 de ${registros.length} registros...</td>`;
    tbody.appendChild(tr);
  }
}
  
  // === FUNÇÕES DE UTILIDADE ===
  
  // Adiciona um log
  function adicionarLog(mensagem, tipo = 'info') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    const log = {
      time: timeStr,
      message: mensagem,
      type: tipo
    };
    
    logs.push(log);
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${tipo}`;
    logEntry.innerHTML = `
      <div class="log-time">${timeStr}</div>
      <div class="log-message">${mensagem}</div>
    `;
    
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    // Salvar logs para persistência
    salvarEstadoAtual();
  }
  
  // Mostra uma notificação
  function mostrarNotificacao(mensagem, tipo = 'info') {
    // Implementação de notificação toast (poderia ser adicionada ao HTML/CSS)
    console.log(`[${tipo}] ${mensagem}`);
    
    // Por enquanto, apenas registra no log
    adicionarLog(mensagem, tipo);
  }
  
  // === COMUNICAÇÃO COM CONTENT SCRIPT ===
  
  // Recebe mensagens do script de conteúdo
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'registroProcessado') {
      // Atualiza status com resultado do processamento
      if (message.sucesso) {
        estado.sucessos++;
        adicionarLog(`RG ${message.registro?.rg || 'desconhecido'}: Cadastrado com sucesso`, 'success');
        atualizarEtapaDebug('check', 'success');
      } else {
        estado.falhas++;
        adicionarLog(`RG ${message.registro?.rg || 'desconhecido'}: ${message.mensagem || 'Erro no processamento'}`, 'error');
        atualizarEtapaDebug(estado.passoAtual || 'check', 'error');
        
        // Se configurado para parar em caso de erro
        if (!config.continueOnError) {
          adicionarLog('Processamento interrompido devido a erro.', 'warning');
          finalizarProcessamento();
          return;
        }
      }
      
      estado.indiceAtual++;
      estado.totalProcessados++;
      estado.ultimoRegistroProcessado = message.indice;
      atualizarProgresso();
      
      // Verificar se estamos no modo de teste e já processamos 1 registro
      if (estado.modoTesteAtivo && estado.totalProcessados === 1) {
        estado.pausado = true;
        adicionarLog('Modo de teste: pausa após o primeiro registro.', 'info');
        
        // Mostra o modal de confirmação para continuar
        setTimeout(mostrarModalContinuacao, 500);
        return;
      }
      
      // Processa o próximo registro após um curto intervalo
      setTimeout(processarProximoRegistro, 500);
    }
    
    // NOVA AÇÃO: Atualização de debug de etapas
    if (message.action === 'atualizarEtapaDebug' && config.debugDetalhado) {
      atualizarEtapaDebug(message.etapa, message.status);
      if (message.mensagem) {
        adicionarLog(message.mensagem, message.tipo || 'info');
      }
    }
    
    return true;
  });
  
  // Event listener para detectar quando a popup é fechada
  window.addEventListener('beforeunload', function(e) {
    salvarEstadoAtual();
  });
});