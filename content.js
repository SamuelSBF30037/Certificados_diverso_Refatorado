(function() {
  let registros = [];
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
    // NOVOS PARÂMETROS
    debugDetalhado: true,
    modoTeste: true
  };
  let emProcessamento = false;
  let registroAtual = null;
  let indiceAtual = -1;
  
  console.log("Content script inicializado e pronto para receber mensagens");
  
  // Escuta mensagens do popup
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // Responde a mensagens de ping para verificar se o script está carregado
    if (message.action === 'ping') {
      console.log("Ping recebido do popup");
      sendResponse({ status: 'ok', message: 'Content script está carregado' });
      return true;
    }
    
    if (message.action === 'iniciar') {
      // Recebe os registros e configurações
      registros = message.registros;
      config = message.config;
      emProcessamento = true;
      
      console.log("Ação iniciar recebida. Registros:", registros.length, "Config:", config);
      
      // Verifica se está na página correta
      if (!validarPaginaAtual()) {
        console.error("Página de formulário não detectada");
        sendResponse({ 
          status: 'erro',
          mensagem: 'Página de formulário não detectada. Verifique se está na página correta.'
        });
        return true;
      }
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('prepare', 'success', 
          'Preparação concluída. Sistema pronto para processar registros.', 'success');
      }
      
      // Confirma que está pronto
      console.log("Respondendo: pronto");
      sendResponse({ status: 'pronto' });
      return true;
    }
    
    if (message.action === 'parar') {
      // Interrompe o processamento
      emProcessamento = false;
      
      console.log("Processamento interrompido manualmente");
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado(null, 'error', 
          'Processamento interrompido manualmente.', 'warning');
      }
      
      sendResponse({ status: 'parado' });
      return true;
    }
    
    if (message.action === 'processar' && emProcessamento) {
      // Processa um registro específico
      registroAtual = message.registro;
      indiceAtual = message.indice;
      
      console.log("Dados do registro recebido:", registroAtual);
      
      // Inicia o processamento deste registro
      try {
        // Envia mensagem de debug detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('insertRG', 'active', 
            `Iniciando processamento do RG ${registroAtual.rg}`, 'info');
        }
        
        processarRegistro();
        
        // Responde que começou o processamento
        sendResponse({ status: 'processando' });
      } catch (error) {
        console.error("Erro ao iniciar processamento:", error);
        
        // Envia mensagem de debug detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('insertRG', 'error', 
            `Erro ao iniciar processamento: ${error.message}`, 'error');
        }
        
        reportarErro(`Erro inesperado: ${error.message}`);
        sendResponse({ status: 'erro', mensagem: error.message });
      }
      return true;
    }
    
    // Nova ação para verificar se a página está pronta
    if (message.action === 'verificarPagina') {
      console.log("Verificando página...");
      const paginaPronta = validarPaginaAtual();
      console.log("Resultado da verificação da página:", paginaPronta);
      sendResponse({ paginaPronta: paginaPronta });
      return true;
    }
    
    // Retorna true para indicar que a resposta pode ser assíncrona
    return true;
  });

  // Envia atualizações de debug detalhado
  function enviarDebugDetalhado(etapa, status, mensagem, tipo = 'info') {
    if (!config.debugDetalhado) return;
    
    console.log(`Debug [${etapa}][${status}]: ${mensagem}`);
    
    try {
      chrome.runtime.sendMessage({
        action: 'atualizarEtapaDebug',
        etapa: etapa,
        status: status,
        mensagem: mensagem,
        tipo: tipo
      });
    } catch (error) {
      console.error("Erro ao enviar atualização de debug:", error);
    }
  }

  // Função para obter o documento do iframe de forma confiável
  function obterDocumentoIframe() {
    const iframe = document.getElementById('iframeItem');
    if (!iframe) {
      console.error("Iframe 'iframeItem' não encontrado! Tentando encontrar via seletor alternativo...");
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado(null, 'error', 
          "Iframe 'iframeItem' não encontrado! Tentando encontrar via seletor alternativo...", 'warning');
      }
      
      // Tenta selecionar por outros critérios
      const iframes = document.querySelectorAll('iframe');
      console.log("Iframes encontrados:", iframes.length);
      
      for (let i = 0; i < iframes.length; i++) {
        console.log(`Verificando iframe ${i}:`, iframes[i].src);
        
        if (iframes[i].src && iframes[i].src.includes('formulario')) {
          console.log("Iframe encontrado via seletor alternativo");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado(null, 'active', 
              "Iframe encontrado via seletor alternativo", 'info');
          }
          
          return iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow.document);
        }
      }
      
      // Tenta abordagem alternativa - procurar por qualquer iframe
      if (iframes.length > 0) {
        console.log("Tentando usar o primeiro iframe disponível");
        return iframes[0].contentDocument || (iframes[0].contentWindow && iframes[0].contentWindow.document);
      }
      
      return null;
    }
    
    try {
      const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!doc) {
        console.error("Documento do iframe não acessível - possível problema de origem cruzada");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado(null, 'error', 
            "Documento do iframe não acessível - possível problema de origem cruzada", 'error');
        }
        
        return null;
      }
      return doc;
    } catch (error) {
      console.error("Erro ao acessar o documento do iframe:", error);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado(null, 'error', 
          `Erro ao acessar o documento do iframe: ${error.message}`, 'error');
      }
      
      return null;
    }
  }
  
  // Valida se estamos na página correta
  function validarPaginaAtual() {
    console.log("Validando página atual...");
    
    // Verificamos se estamos na página correta de forma mais abrangente
    try {
      // Primeiro, verifica se há qualquer iframe na página
      const iframes = document.querySelectorAll('iframe');
      console.log("Número de iframes na página:", iframes.length);
      
      if (iframes.length === 0) {
        console.log("Nenhum iframe encontrado na página");
        return false;
      }
      
      // Tenta obter o documento do iframe normalmente
      const iframeDoc = obterDocumentoIframe();
      if (!iframeDoc) {
        console.log("Não foi possível obter o documento do iframe");
        return false;
      }
      
      console.log("Documento do iframe obtido, procurando elementos do formulário...");
      
      // Verifica se tem elementos esperados do formulário
      const campoRG = iframeDoc.querySelector('input[name="rg"]');
      const formPrincipal = iframeDoc.querySelector('form[name="formu"]');
      
      const resultado = !!(campoRG && formPrincipal);
      console.log("Resultado da validação:", resultado, 
                  "Campo RG:", !!campoRG, 
                  "Form Principal:", !!formPrincipal);
      
      return resultado;
    } catch (error) {
      console.error("Erro ao validar página:", error);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado(null, 'error', 
          `Erro ao validar página: ${error.message}`, 'error');
      }
      
      return false;
    }
  }
  
  // Processa um registro
  function processarRegistro() {
    if (!registroAtual || !emProcessamento) {
      return;
    }
    
    console.log(`Processando registro: RG ${registroAtual.rg}`);
    
    // Log detalhado
    if (config.debugDetalhado) {
      enviarDebugDetalhado('insertRG', 'active', 
        `Processando registro: RG ${registroAtual.rg} - ${registroAtual.nomeCurso}`, 'info');
    }
    
    // Obtém o documento do iframe
    const iframeDoc = obterDocumentoIframe();
    if (!iframeDoc) {
      reportarErro("Não foi possível acessar o documento do iframe");
      return;
    }
    
    // Busca o campo RG
    const campoRG = iframeDoc.querySelector('input[name="rg"]');
    if (!campoRG) {
      reportarErro("Campo RG não encontrado");
      return;
    }
    
    // Limpa campos existentes
    try {
      const botaoLimpar = iframeDoc.querySelector('input[value="Limpar"]');
      if (botaoLimpar) {
        console.log("Limpando campos...");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('insertRG', 'active', 
            "Limpando campos existentes...", 'info');
        }
        
        botaoLimpar.click();
        
        // Pequeno delay após limpar
        setTimeout(() => {
          inserirRG(campoRG);
        }, 300); // Reduzido de 1000ms para 300ms para otimização
      } else {
        inserirRG(campoRG);
      }
    } catch (error) {
      console.error("Erro ao limpar campos:", error);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('insertRG', 'error', 
          `Erro ao limpar campos: ${error.message}`, 'warning');
      }
      
      inserirRG(campoRG);
    }
  }
  
  // Insere o RG e inicia a pesquisa com lógica melhorada
  function inserirRG(campoRG) {
    // Tenta focar e limpar o campo com múltiplas abordagens
    campoRG.value = '';
    
    try {
      campoRG.focus();
      campoRG.click();
    } catch (e) {
      console.log("Erro ao focar no campo RG:", e);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('insertRG', 'warning', 
          `Erro ao focar no campo RG: ${e.message}`, 'warning');
      }
    }
    
    // Insere o valor após um pequeno delay
    setTimeout(() => {
      try {
        campoRG.value = registroAtual.rg;
        console.log(`RG inserido: ${registroAtual.rg}`);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('insertRG', 'success', 
            `RG inserido: ${registroAtual.rg}`, 'success');
        }
        
        // Dispara múltiplos eventos para garantir que o campo responda
        ['input', 'change', 'blur'].forEach(eventType => {
          try {
            const evento = new Event(eventType, { bubbles: true });
            campoRG.dispatchEvent(evento);
            console.log(`Evento ${eventType} disparado no campo RG`);
          } catch (err) {
            console.error(`Erro ao disparar evento ${eventType}:`, err);
            
            // Log detalhado
            if (config.debugDetalhado) {
              enviarDebugDetalhado('insertRG', 'warning', 
                `Erro ao disparar evento ${eventType}: ${err.message}`, 'warning');
            }
          }
        });
        
        // Atualiza para etapa de pesquisa no debug detalhado
        if (config.debugDetalhado) {
          const tempoEsperaLog = Math.max(1, config.waitTimeSearch);
          enviarDebugDetalhado('search', 'active', 
            `Pesquisando RG ${registroAtual.rg} no sistema. Aguardando ${tempoEsperaLog} segundos...`, 'info');
        }
        
        // Tempo de espera configurável
        const tempoEspera = Math.max(1, config.waitTimeSearch);
        console.log(`Aguardando ${tempoEspera} segundos para a pesquisa ser concluída...`);
        setTimeout(preencherCampos, tempoEspera * 1000);
      } catch (error) {
        console.error("Erro ao inserir RG:", error);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('insertRG', 'error', 
            `Erro ao inserir RG: ${error.message}`, 'error');
        }
        
        reportarErro(`Erro ao inserir RG: ${error.message}`);
      }
    }, 300); // Reduzido de 1000ms para 300ms
  }
  
  // Nova função para garantir a existência do campo de texto complementar
  function garantirCampoTextoComplementar(formPrincipal) {
    if (!formPrincipal) {
      console.error("Formulário principal não encontrado");
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('fill', 'error', 
          "Formulário principal não encontrado", 'error');
      }
      
      return null;
    }
    
    // Tenta encontrar o campo existente
    let campoTextoComplementar = formPrincipal.querySelector('input[name="textoComplementar"]');
    
    // Se não existir, tenta criar o campo
    if (!campoTextoComplementar) {
      console.log("Campo textoComplementar não encontrado. Criando campo...");
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('fill', 'warning', 
          "Campo textoComplementar não encontrado. Tentando criar o campo...", 'warning');
      }
      
      try {
        campoTextoComplementar = document.createElement('input');
        campoTextoComplementar.type = 'hidden';
        campoTextoComplementar.name = 'textoComplementar';
        formPrincipal.appendChild(campoTextoComplementar);
        console.log("Campo textoComplementar criado com sucesso");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'success', 
            "Campo textoComplementar criado com sucesso", 'success');
        }
      } catch (error) {
        console.error("Erro ao criar campo textoComplementar:", error);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'error', 
            `Erro ao criar campo textoComplementar: ${error.message}`, 'error');
        }
        
        return null;
      }
    }
    
    return campoTextoComplementar;
  }
  
  // Preenche os campos após a pesquisa do RG
  function preencherCampos() {
    if (!registroAtual || !emProcessamento) {
      return;
    }
    
    console.log("Iniciando preenchimento dos campos após pesquisa do RG");
    
    // Log detalhado
    if (config.debugDetalhado) {
      enviarDebugDetalhado('search', 'success', 
        "Pesquisa concluída. Verificando resultados...", 'info');
    }
    
    // Obtém o documento do iframe novamente para garantir dados atualizados
    const iframeDoc = obterDocumentoIframe();
    if (!iframeDoc) {
      reportarErro("Documento do iframe perdido durante o processamento. Tentando novamente em 2 segundos...");
      // Tenta novamente após um delay
      setTimeout(preencherCampos, 2000);
      return;
    }
    
    try {
      // Verifica se o RG foi encontrado
      const msgErro = iframeDoc.querySelector('.erro');
      if (msgErro && msgErro.textContent.includes("não encontrado")) {
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('search', 'error', 
            `RG ${registroAtual.rg} não encontrado no sistema`, 'error');
        }
        
        reportarErro(`RG ${registroAtual.rg} não encontrado no sistema`);
        return;
      }
      
      // Atualiza etapa para preenchimento
      if (config.debugDetalhado) {
        enviarDebugDetalhado('fill', 'active', 
          "Preenchendo campos do formulário...", 'info');
      }
      
      // Tenta preencher o campo oculto de texto complementar
      const formPrincipal = iframeDoc.querySelector('form[name="formu"]');
      const campoTextoComplementar = garantirCampoTextoComplementar(formPrincipal);
      
      if (campoTextoComplementar) {
        campoTextoComplementar.value = registroAtual.textoComplementar;
        console.log("Texto complementar preenchido:", registroAtual.textoComplementar);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'active', 
            "Texto complementar preenchido com sucesso", 'info');
        }
      } else {
        console.warn("Não foi possível criar ou acessar o campo de texto complementar");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Não foi possível criar ou acessar o campo de texto complementar", 'warning');
        }
      }
      
      // Preenche o tipo de curso
      const selectTipoCurso = iframeDoc.querySelector('select[name="tipocurso"]');
      if (selectTipoCurso) {
        selectTipoCurso.value = registroAtual.tipoCurso;
        try {
          const evento = new Event("change", { bubbles: true });
          selectTipoCurso.dispatchEvent(evento);
          console.log("Tipo de curso selecionado:", registroAtual.tipoCurso);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              `Tipo de curso selecionado: ${registroAtual.tipoCurso}`, 'info');
          }
        } catch (error) {
          console.error("Erro ao disparar evento no tipo de curso:", error);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              `Erro ao disparar evento no tipo de curso: ${error.message}`, 'warning');
          }
        }
      } else {
        console.warn("Campo de tipo de curso não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo de tipo de curso não encontrado", 'warning');
        }
      }
      
      // Um pequeno delay antes de continuar preenchendo os outros campos
      setTimeout(() => {
        continuarPreenchimento();
      }, 150); // Reduzido de 500ms para 150ms
      
    } catch (error) {
      console.error("Erro ao preencher campos iniciais:", error);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('fill', 'error', 
          `Erro ao preencher campos iniciais: ${error.message}`, 'error');
      }
      
      reportarErro(`Erro ao preencher campos iniciais: ${error.message}`);
    }
  }
  
  // Continua o preenchimento após um pequeno delay
  function continuarPreenchimento() {
    // Obtém o documento do iframe novamente
    const iframeDoc = obterDocumentoIframe();
    if (!iframeDoc) {
      reportarErro("Documento do iframe perdido durante preenchimento");
      return;
    }
    
    try {
      // Preenche o nome do curso
      const campoNomeCurso = iframeDoc.querySelector('input[name="nomeCurso"]');
      if (campoNomeCurso) {
        campoNomeCurso.value = registroAtual.nomeCurso;
        console.log("Nome do curso preenchido:", registroAtual.nomeCurso);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'active', 
            `Nome do curso preenchido: ${registroAtual.nomeCurso}`, 'info');
        }
      } else {
        reportarErro("Campo nome do curso não encontrado");
        return;
      }
      
      // Preenche o local
      const campoLocal = iframeDoc.querySelector('input[name="local"]');
      if (campoLocal) {
        campoLocal.value = registroAtual.local;
        console.log("Local preenchido:", registroAtual.local);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'active', 
            `Local preenchido: ${registroAtual.local}`, 'info');
        }
      } else {
        console.warn("Campo local não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo local não encontrado", 'warning');
        }
      }
      
      // Preenche a carga horária
      const campoCargaHoraria = iframeDoc.querySelector('input[name="cargahoraria"]');
      if (campoCargaHoraria) {
        campoCargaHoraria.value = registroAtual.cargaHoraria;
        console.log("Carga horária preenchida:", registroAtual.cargaHoraria);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'active', 
            `Carga horária preenchida: ${registroAtual.cargaHoraria}`, 'info');
        }
      } else {
        console.warn("Campo carga horária não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo carga horária não encontrado", 'warning');
        }
      }
      
      // Seleciona aprovado = Sim
      const radioAprovado = iframeDoc.querySelector('input[name="aprovado"][value="S"]');
      if (radioAprovado) {
        radioAprovado.checked = true;
        try {
          const evento = new Event("change", { bubbles: true });
          radioAprovado.dispatchEvent(evento);
          console.log("Opção Aprovado=Sim selecionada");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              "Opção Aprovado=Sim selecionada", 'info');
          }
        } catch (error) {
          console.error("Erro ao disparar evento no radio aprovado:", error);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              `Erro ao disparar evento no radio aprovado: ${error.message}`, 'warning');
          }
        }
      } else {
        console.warn("Campo aprovado não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo aprovado não encontrado", 'warning');
        }
      }
      
      // Seleciona a menção (campo opcional)
      const selectMencao = iframeDoc.querySelector('select[name="mencao"]');
      if (selectMencao && registroAtual.mencao) {
        selectMencao.value = registroAtual.mencao;
        try {
          const evento = new Event("change", { bubbles: true });
          selectMencao.dispatchEvent(evento);
          console.log("Menção selecionada:", registroAtual.mencao);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              `Menção selecionada: ${registroAtual.mencao}`, 'info');
          }
        } catch (error) {
          console.error("Erro ao disparar evento na menção:", error);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              `Erro ao disparar evento na menção: ${error.message}`, 'warning');
          }
        }
      } else if (selectMencao) {
        // Se o campo existe mas está vazio e campos opcionais habilitados
        if (config.camposOpcionais) {
          console.log("Campo menção é opcional e está vazio. Continuando...");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              "Campo menção é opcional e está vazio. Continuando...", 'info');
          }
        } else {
          console.warn("Campo menção não preenchido");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              "Campo menção não preenchido", 'warning');
          }
        }
      } else {
        console.warn("Campo menção não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo menção não encontrado", 'warning');
        }
      }
      
      // Preenche a nota (campo opcional)
      const campoNota = iframeDoc.querySelector('input[name="nota"]');
      if (campoNota && registroAtual.nota) {
        campoNota.value = registroAtual.nota;
        try {
          ['input', 'change', 'blur'].forEach(eventType => {
            const evento = new Event(eventType, { bubbles: true });
            campoNota.dispatchEvent(evento);
          });
          console.log("Nota preenchida:", registroAtual.nota);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              `Nota preenchida: ${registroAtual.nota}`, 'info');
          }
        } catch (error) {
          console.error("Erro ao disparar eventos na nota:", error);
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              `Erro ao disparar eventos na nota: ${error.message}`, 'warning');
          }
        }
      } else if (campoNota) {
        // Se o campo existe mas está vazio e campos opcionais habilitados
        if (config.camposOpcionais) {
          console.log("Campo nota é opcional e está vazio. Continuando...");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              "Campo nota é opcional e está vazio. Continuando...", 'info');
          }
        } else {
          console.warn("Campo nota não preenchido");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              "Campo nota não preenchido", 'warning');
          }
        }
      } else {
        console.warn("Campo nota não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo nota não encontrado", 'warning');
          }
      }
      
      // Preenche a classificação (campo opcional)
      const campoClassificacao = iframeDoc.querySelector('input[name="classificacao"]');
      if (campoClassificacao && registroAtual.classificacao) {
        campoClassificacao.value = registroAtual.classificacao;
        console.log("Classificação preenchida:", registroAtual.classificacao);
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'active', 
            `Classificação preenchida: ${registroAtual.classificacao}`, 'info');
        }
      } else if (campoClassificacao) {
        // Se o campo existe mas está vazio e campos opcionais habilitados
        if (config.camposOpcionais) {
          console.log("Campo classificação é opcional e está vazio. Continuando...");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'active', 
              "Campo classificação é opcional e está vazio. Continuando...", 'info');
          }
        } else {
          console.warn("Campo classificação não preenchido");
          
          // Log detalhado
          if (config.debugDetalhado) {
            enviarDebugDetalhado('fill', 'warning', 
              "Campo classificação não preenchido", 'warning');
          }
        }
      } else {
        console.warn("Campo classificação não encontrado");
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('fill', 'warning', 
            "Campo classificação não encontrado", 'warning');
        }
      }
      
      console.log("Todos os campos preenchidos com sucesso!");
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('fill', 'success', 
          "Todos os campos preenchidos com sucesso!", 'success');
      }
      
      // Clica no botão Incluir se configurado para isso
      if (config.autoClick) {
        setTimeout(() => {
          // Muda para etapa de submissão
          if (config.debugDetalhado) {
            enviarDebugDetalhado('submit', 'active', 
              "Preparando para enviar formulário...", 'info');
          }
          
          const botaoIncluir = iframeDoc.querySelector('input[value="Incluir"]');
          if (botaoIncluir) {
            console.log("Clicando no botão Incluir...");
            
            // Log detalhado
            if (config.debugDetalhado) {
              enviarDebugDetalhado('submit', 'active', 
                "Clicando no botão Incluir...", 'info');
            }
            
            // Pequena animação no botão para mostrar que foi clicado
            botaoIncluir.style.transition = "all 0.2s";
            botaoIncluir.style.backgroundColor = "#4CAF50";
            
            setTimeout(() => {
              botaoIncluir.click();
              
              // Log detalhado
              if (config.debugDetalhado) {
                enviarDebugDetalhado('submit', 'success', 
                  "Formulário enviado. Aguardando resposta do sistema...", 'info');
              }
              
              // Aguarda o tempo configurado após submissão
              setTimeout(() => {
                verificarResultadoSubmissao();
              }, Math.max(3, config.waitTimeAfterSubmit) * 1000);
            }, 300);
          } else {
            // Log detalhado
            if (config.debugDetalhado) {
              enviarDebugDetalhado('submit', 'error', 
                "Botão Incluir não encontrado", 'error');
            }
            
            reportarErro("Botão Incluir não encontrado");
          }
        }, 1000);
      } else {
        // Se não estiver configurado para clicar automaticamente,
        // reporta sucesso no preenchimento e aguarda ação manual
        
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('submit', 'warning', 
            "Preenchimento concluído. Aguardando clique manual no botão Incluir.", 'warning');
        }
        
        reportarSucesso(false);
      }
    } catch (error) {
      console.error("Erro ao preencher os campos:", error);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('fill', 'error', 
          `Erro ao preencher os campos: ${error.message}`, 'error');
      }
      
      reportarErro(`Erro ao preencher os campos: ${error.message}`);
    }
  }
  
  // Verifica se a submissão foi bem-sucedida
  function verificarResultadoSubmissao() {
    // Obtém o documento do iframe novamente para verificar o resultado
    const iframeDoc = obterDocumentoIframe();
    if (!iframeDoc) {
      reportarErro("Documento do iframe perdido durante verificação");
      return;
    }
    
    try {
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('check', 'active', 
          "Verificando resultado da submissão...", 'info');
      }
      
      // Verifica mensagens de sucesso
      const msgSucesso = iframeDoc.querySelector('.sucesso');
      const msgErro = iframeDoc.querySelector('.erro');
      
      if (msgSucesso && msgSucesso.textContent.includes("sucesso")) {
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('check', 'success', 
            "Inclusão realizada com sucesso!", 'success');
        }
        
        reportarSucesso(true);
        return;
      }
      
      if (msgErro) {
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('check', 'error', 
            `Erro retornado pelo sistema: ${msgErro.textContent.trim()}`, 'error');
        }
        
        reportarErro(`Erro retornado pelo sistema: ${msgErro.textContent.trim()}`);
        return;
      }
      
      // Verifica se o botão Nova Inclusão está visível
      const botaoNovaInclusao = iframeDoc.querySelector('input[value="Nova Inclusão"]');
      if (botaoNovaInclusao) {
        // Log detalhado
        if (config.debugDetalhado) {
          enviarDebugDetalhado('check', 'success', 
            "Inclusão realizada com sucesso! (Botão Nova Inclusão detectado)", 'success');
        }
        
        reportarSucesso(true);
        return;
      }
      
      // Se chegou até aqui, considera sucesso mas com aviso
      console.warn("Não foi possível verificar conclusivamente o resultado, mas parece ter funcionado");
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('check', 'success', 
          "Não foi possível verificar conclusivamente o resultado, mas parece ter funcionado", 'warning');
      }
      
      reportarSucesso(true);
      
    } catch (error) {
      console.error("Erro ao verificar resultado:", error);
      
      // Log detalhado
      if (config.debugDetalhado) {
        enviarDebugDetalhado('check', 'error', 
          `Erro ao verificar resultado: ${error.message}`, 'error');
      }
      
      reportarErro(`Erro ao verificar resultado: ${error.message}`);
    }
  }
  
  // Reporta sucesso no processamento
  function reportarSucesso(completo = true) {
    console.log(`Registro RG ${registroAtual.rg} processado com sucesso!`);
    
    // Envia mensagem para o popup
    chrome.runtime.sendMessage({
      action: 'registroProcessado',
      sucesso: true,
      indice: indiceAtual,
      registro: registroAtual,
      completo: completo
    });
  }
  
  // Reporta erro no processamento
  function reportarErro(mensagem) {
    console.error(`Erro ao processar registro RG ${registroAtual?.rg}: ${mensagem}`);
    
    // Envia mensagem para o popup
    chrome.runtime.sendMessage({
      action: 'registroProcessado',
      sucesso: false,
      indice: indiceAtual,
      registro: registroAtual,
      mensagem: mensagem
    });
  }
  
  // Adiciona um observador de mutações para detectar mudanças no iframe
  function adicionarObservadorIframe() {
    const targetNode = document.body;
    
    const config = { childList: true, subtree: true, attributes: true };
    
    const callback = function(mutationsList, observer) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Verifica se há novos elementos que possam ser o iframe
          const iframe = document.getElementById('iframeItem');
          if (iframe) {
            console.log("Iframe detectado dinamicamente!");
            
            // Tenta acessar o documento do iframe após um pequeno delay
            setTimeout(() => {
              const doc = obterDocumentoIframe();
              if (doc) {
                console.log("Documento do iframe acessível após detecção");
              }
            }, 500);
          }
        }
      }
    };
    
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    
    console.log("Observador de iframe configurado com detecção aprimorada");
  }
  
  // Inicializa
  function inicializar() {
    console.log("Script de conteúdo para Cadastramento Automático inicializado!");
    adicionarObservadorIframe();
  }
  
  inicializar();
})();