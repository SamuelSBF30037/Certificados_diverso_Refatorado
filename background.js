// Script de fundo para a extensão de Cadastro Automático de Cursos
chrome.runtime.onInstalled.addListener(function() {
  console.log('Extensão Cadastro Automático de Cursos instalada!');
  
  // Configura o Side Panel para abrir ao clicar no ícone da extensão
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
  
  // Inicializa as configurações padrão com valores mais conservadores
  chrome.storage.local.get('config', function(result) {
    if (!result.config) {
      chrome.storage.local.set({
        config: {
          waitTimeSearch: 8,        // Aumentado para 8 segundos (era 5)
          waitTimeAfterSubmit: 5,   // Aumentado para 5 segundos (era 3)
          autoClick: true,
          continueOnError: true,
          camposOpcionais: true,
          comandante: "",
          comandanteCargo: "Comandante da Academia de Polícia Militar", 
          processoSEI: "",
          iniciais: "",
          // NOVOS PARÂMETROS
          linhaInicial: 1,
          linhaFinal: 0,
          modoTeste: true,
          debugDetalhado: true
        }
      });
    }
  });
  
  // Inicializa o estado da aplicação
  chrome.storage.local.get('estado', function(result) {
    if (!result.estado) {
      chrome.storage.local.set({
        estado: {
          emProcessamento: false,
          pausado: false,
          indiceAtual: 0,
          totalProcessados: 0,
          sucessos: 0,
          falhas: 0,
          modoTesteAtivo: false,
          passoAtual: null,
          ultimoRegistroProcessado: -1
        }
      });
    }
  });
  
  // Registrar o content script programaticamente
  // Isso garante que ele esteja disponível em todas as páginas relevantes
  chrome.scripting?.registerContentScripts([{
    id: 'content-script',
    matches: ['<all_urls>'],
    js: ['content.js'],
    runAt: 'document_idle'
  }])
  .then(() => console.log('Content script registrado com sucesso'))
  .catch(error => console.error('Erro ao registrar content script:', error));
  
  // Cria a entrada de contexto para o menu
  chrome.contextMenus?.create({
    id: "abrirExtensao",
    title: "Abrir Cadastro Automático",
    contexts: ["page"]
  });
  
  // Adiciona uma entrada para visualizar estado atual
  chrome.contextMenus?.create({
    id: "visualizarEstado",
    title: "Visualizar Estado Atual",
    contexts: ["page"]
  });
  
  // Adiciona uma entrada para limpar estado
  chrome.contextMenus?.create({
    id: "limparEstado",
    title: "Limpar Estado Salvo",
    contexts: ["page"]
  });
  
  // Adiciona uma entrada para recarregar o content script
  chrome.contextMenus?.create({
    id: "recarregarScript",
    title: "Recarregar Script de Conteúdo",
    contexts: ["page"]
  });
  
  // Adiciona listener para possíveis mensagens de diagnóstico
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'log') {
      console.log(`[Extensão Log] ${message.message}`);
    }
    
    // Tratamento para mensagens de persistência
    if (message.action === 'salvarEstado') {
      chrome.storage.local.set({ 
        estado: message.estado,
        logs: message.logs
      }, function() {
        console.log('Estado salvo pelo popup:', message.estado);
        if (sendResponse) sendResponse({ success: true });
      });
      return true; // Indica que responderemos de forma assíncrona
    }
    
    return true;
  });
});

// Tratamento para clique no menu de contexto
chrome.contextMenus?.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "abrirExtensao") {
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
    }
  }
  
  // Visualizar estado atual
  else if (info.menuItemId === "visualizarEstado") {
    chrome.storage.local.get(['estado', 'registros'], function(result) {
      let mensagem = 'Estado Atual:\n\n';
      
      if (result.estado) {
        mensagem += `Processados: ${result.estado.totalProcessados}\n`;
        mensagem += `Sucessos: ${result.estado.sucessos}\n`;
        mensagem += `Falhas: ${result.estado.falhas}\n`;
        mensagem += `Índice atual: ${result.estado.indiceAtual}\n`;
        mensagem += `Último registro: ${result.estado.ultimoRegistroProcessado}\n`;
        mensagem += `Em processamento: ${result.estado.emProcessamento}\n`;
        mensagem += `Pausado: ${result.estado.pausado}\n`;
      } else {
        mensagem += 'Nenhum estado salvo encontrado.';
      }
      
      if (result.registros) {
        mensagem += `\nTotal de registros: ${result.registros.length}`;
      }
      
      // Exibe o estado em um alerta
      alert(mensagem);
    });
  }
  
  // Limpar estado
  else if (info.menuItemId === "limparEstado") {
    if (confirm('Tem certeza que deseja limpar o estado salvo? Isso irá resetar todo o progresso de processamento.')) {
      chrome.storage.local.set({
        estado: {
          emProcessamento: false,
          pausado: false,
          indiceAtual: 0,
          totalProcessados: 0,
          sucessos: 0,
          falhas: 0,
          modoTesteAtivo: false,
          passoAtual: null,
          ultimoRegistroProcessado: -1
        },
        logs: []
      }, function() {
        alert('Estado limpo com sucesso!');
      });
    }
  }
  
  // Recarregar o content script
  else if (info.menuItemId === "recarregarScript") {
    // Primeiro desregistra o script atual
    chrome.scripting.unregisterContentScripts({ids: ['content-script']})
      .then(() => {
        console.log('Script anterior desregistrado com sucesso');
        
        // Agora registra novamente
        return chrome.scripting.registerContentScripts([{
          id: 'content-script',
          matches: ['<all_urls>'],
          js: ['content.js'],
          runAt: 'document_idle'
        }]);
      })
      .then(() => {
        console.log('Script reregistrado com sucesso');
        
        // Agora injeta o script na página atual
        return chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['content.js']
        });
      })
      .then(() => {
        alert('Script de conteúdo recarregado com sucesso!');
      })
      .catch(error => {
        console.error('Erro ao recarregar script:', error);
        alert('Erro ao recarregar script: ' + error.message);
      });
  }
});

// Escuta eventos de mudança de aba para manter persistência
chrome.tabs.onActivated.addListener(function(activeInfo) {
  // Quando o usuário muda de aba, verifica se há uma sessão em andamento
  chrome.storage.local.get('estado', function(result) {
    if (result.estado && result.estado.emProcessamento && !result.estado.pausado) {
      // Se houver uma sessão ativa, envia uma notificação
      chrome.action.setBadgeText({
        text: "⏸️",
        tabId: activeInfo.tabId
      });
      
      chrome.action.setBadgeBackgroundColor({
        color: "#FFA500", // laranja
        tabId: activeInfo.tabId
      });
    } else {
      chrome.action.setBadgeText({
        text: "",
        tabId: activeInfo.tabId
      });
    }
  });
});