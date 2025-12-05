/**
 * MÓDULO DE LOGIN E AUTENTICAÇÃO (criador.js)
 * * Este script injeta a interface de login, o CSS e a lógica de autenticação 
 * usando o relógio local do dispositivo para controle de acesso por tempo.
 *
 * * ATENÇÃO: Tela de compra/reset reformulada e incorporada à tela principal.
 */

// ----------------------------------------------------
// --- CONSTANTES DE CONTEÚDO (HTML E CSS) ---
// ----------------------------------------------------

const LOGIN_STYLES = `
    /* Estilos customizados e efeitos Neon/Glow */
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

    :root {
        --neon-pink: #ff007f; /* Cor rosa/magenta */
        --neon-blue: #00ffff; /* Cor ciano/azul */
        --dark-bg: #03001C;
    }

    /* 1. Fundo da Página (O corpo é apenas um container de layout) */
    body.login-view {
        font-family: 'Orbitron', sans-serif;
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow-y: auto; 
    }
    
    /* NOVO: Modal de tela cheia para a imagem de fundo */
    #background-modal {
        position: fixed;
        inset: 0;
        z-index: 999; /* Fica atrás do #login-container (z-index: 1000) */
        opacity: 1;
        transition: opacity 0.5s;
        
        /* APLICANDO A IMAGEM DE FUNDO A ESTE NOVO MODAL */
        background-image: url(/fundo.jpg);
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        background-repeat: no-repeat;
    }

    /* 2. Estilos Neon para a Janela Central */
    .neon-glow-text {
        color: var(--neon-blue);
        text-shadow: 0 0 5px var(--neon-blue), 0 0 10px var(--neon-blue);
    }

    .neon-border-blue {
        /* Simula a borda e o brilho da janela flutuante */
        border: 2px solid var(--neon-blue);
        box-shadow: 0 0 15px var(--neon-blue), 0 0 30px rgba(0, 255, 255, 0.4) inset;
    }

    /* Estilo para a caixa de input (fundo escuro e borda fina) */
    .input-style {
        background-color: rgba(0, 0, 0, 0.5); /* Semi-transparente */
        border: 1px solid var(--neon-pink);
        color: white;
        padding: 0.75rem;
        border-radius: 4px;
        font-size: 0.9rem;
        transition: all 0.3s;
    }
    .input-style:focus {
        border-color: var(--neon-blue);
        box-shadow: 0 0 8px var(--neon-blue);
        outline: none;
    }
    
    /* Estilo para campos desabilitados/bloqueados */
    .input-style:disabled {
        background-color: rgba(10, 10, 20, 0.6);
        border-color: var(--neon-blue);
        color: #888;
        cursor: not-allowed;
        box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
    }

    /* Botão AUTENTICAR E ACESSAR (Estilo Padrão Neon) */
    .btn-auth {
        background: linear-gradient(90deg, var(--neon-blue) 0%, var(--neon-pink) 100%);
        color: black;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        transition: all 0.3s;
        box-shadow: 0 0 10px var(--neon-pink);
    }
    .btn-auth:hover {
        box-shadow: 0 0 20px var(--neon-blue), 0 0 30px var(--neon-pink);
        transform: scale(1.02);
    }
    
    /* NOVO: Botão ACESSO MESTRE (Destaque Pink) */
    .btn-master-auth {
        background: linear-gradient(90deg, var(--neon-pink) 0%, #ff66a3 100%);
        color: black;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        transition: all 0.3s;
        box-shadow: 0 0 10px var(--neon-pink);
    }
    .btn-master-auth:hover {
        box-shadow: 0 0 20px var(--neon-blue), 0 0 30px var(--neon-pink);
        transform: scale(1.02);
    }


    /* Botão INICIAR TESTE (Estilo Secundário/Teste) */
    .btn-trial {
        background-color: transparent;
        border: 2px solid #50ff90; /* Verde Neon Claro */
        color: #50ff90;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        transition: all 0.3s;
        box-shadow: 0 0 10px rgba(80, 255, 144, 0.5);
    }
    .btn-trial:hover {
        background-color: rgba(80, 255, 144, 0.1);
        box-shadow: 0 0 20px #50ff90;
        transform: scale(1.02);
    }
    
    /* Estilo para a linha de mensagem inferior */
    #message-box {
        border-top: 2px solid var(--neon-pink);
        box-shadow: 0 0 10px var(--neon-pink);
    }
    
    /* Ajuste do layout para garantir a centralização completa */
    .main-container {
        z-index: 10;
        padding: 1rem; /* Padding para mobile */
        width: 90%;
        max-width: 500px;
    }
    
    /* Estilo para o campo de chave de validacao (destaque amarelo) */
    .key-input-style {
        border: 1px solid #ffcc00; /* Amarelo */
        box-shadow: 0 0 8px #ffcc00;
    }
`;

const LOGIN_HTML_CONTENT = `
    <div id="login-container" style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 1000; transition: opacity 0.5s;">
        <div class="main-container bg-black bg-opacity-70 p-6 sm:p-8 rounded-lg neon-border-blue relative">
            <header class="text-center mb-6">
                <h1 class="text-2xl font-bold text-white neon-glow-text">GERENCIADOR DE MATERIAIS</h1>
                <p class="text-sm text-gray-400 mt-2">Validação de Acesso Local</p>
            </header>
            
            <form id="login-form" onsubmit="event.preventDefault(); window.attemptLogin();">
                <div class="mb-4">
                    <label for="criador-input" class="block text-sm font-medium text-gray-300 mb-2">ID DO CRIADOR (NICK)</label>
                    <input type="text" id="criador-input" placeholder="Seu Nome/Nickname Único" required
                           class="input-style w-full block" value="Convidado">
                </div>
                
                <div class="mb-6">
                    <label for="validation-key-input" class="block text-sm font-medium text-gray-300 mb-2">CHAVE DE ACESSO (Mestra/Compra)</label>
                    <input type="password" id="validation-key-input" placeholder="Insira a Chave Aqui"
                           class="input-style w-full block key-input-style">
                </div>
                
                <button type="submit" id="auth-button" class="btn-auth w-full py-3 rounded-lg text-lg mb-4">
                    AUTENTICAR E ACESSAR
                </button>
                
                <button type="button" id="master-auth-button" onclick="window.attemptMasterLogin()" class="btn-master-auth w-full py-2 rounded-lg text-sm mb-4">
                    ACESSO MESTRE (Deivid)
                </button> 
                
                <div class="flex flex-col sm:flex-row gap-3">
                    <button type="button" id="trial-button" onclick="window.startTrial()" class="btn-trial py-2 rounded-lg text-sm flex-grow">
                        INICIAR TESTE (5 Dias Úteis)
                    </button>
                </div>
            </form>

            <div id="purchase-data-box" class="mt-6 p-4 rounded-lg hidden" style="border: 2px solid #ffcc00; box-shadow: 0 0 10px rgba(255, 204, 0, 0.5); background-color: rgba(30, 20, 0, 0.5);">
                <h3 class="text-lg font-bold mb-3 text-yellow-400">Dados para Compra de Chave</h3>
                <p class="text-xs text-gray-300 mb-3">Para adquirir o acesso permanente, contate o desenvolvedor:</p>
                <div class="text-left space-y-2">
                    <p class="text-md text-white">📧 **Email para Contato:**</p>
                    <p class="text-sm text-gray-300 neon-glow-text pl-4">supernova.dm10@gmail.com</p>
                    <p class="text-md text-white mt-3">📱 **Telefone/WhatsApp:**</p>
                    <p class="text-sm text-gray-300 neon-glow-text pl-4">(43)984223290</p>
                </div>
            </div>
            
            <div class="mt-4 text-center">
                <button type="button" id="toggle-purchase-data-button" onclick="window.togglePurchaseData()" class="text-sm text-yellow-500 hover:text-yellow-300 transition duration-300 underline">
                    MOSTRAR DADOS DE COMPRA
                </button>
            </div>


            <div id="message-box" class="mt-4 p-3 text-center text-sm rounded-lg">
                Carregando Módulos de Segurança Local...
            </div>
        </div>
    </div>
`;


// ----------------------------------------------------
// --- CONFIGURAÇÕES DE ACESSO ---
// ----------------------------------------------------
const MASTER_KEY = 'dmcs'; // Chave mestra de acesso
const MASTER_USER = 'Deivid'; // NOVO: Usuário mestre
// Lista de chaves do localStorage a serem LIMPAS no Master Reset.
const KEYS_TO_CLEAR = [
    'trialStartDate',
    'trialExpirationDate',
    'trialStarted',
    // Adicione aqui outras chaves de dados de uso do site, se houver
];

// ----------------------------------------------------
// --- FUNÇÕES UTILITÁRIAS DE STATUS E UI ---
// ----------------------------------------------------

// Função para exibir mensagens de status (carregando, sucesso, erro)
window.showStatus = function(message, type = 'default') {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;

    // Limpa classes anteriores e define o texto
    messageBox.className = 'mt-8 p-3 text-center text-sm rounded-lg';
    messageBox.textContent = message;

    // Adiciona novas classes com base no tipo
    if (type === 'loading') {
        messageBox.classList.add('bg-neon-blue/20', 'text-neon-blue', 'neon-glow-text');
        messageBox.style.boxShadow = '0 0 10px var(--neon-blue)';
        messageBox.style.borderTop = '2px solid var(--neon-blue)';
    } else if (type === 'success') {
        messageBox.classList.add('bg-green-500/20', 'text-green-400');
        messageBox.style.boxShadow = '0 0 10px #50ff90';
        messageBox.style.borderTop = '2px solid #50ff90';
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-500/20', 'text-red-400');
        messageBox.style.boxShadow = '0 0 10px #ff0000';
        messageBox.style.borderTop = '2px solid #ff0000';
    } else {
        messageBox.classList.add('bg-gray-500/20', 'text-gray-400');
        messageBox.style.boxShadow = '0 0 10px var(--neon-pink)';
        messageBox.style.borderTop = '2px solid var(--neon-pink)';
    }
}

/**
 * Bloqueia ou desbloqueia os campos de CRIADOR/ID e CHAVE DE COMPRA.
 * @param {boolean} unlock - Se deve desbloquear (true) ou bloquear (false).
 */
window.unlockAuthFields = function(unlock) {
    const criadorInput = document.getElementById('criador-input');
    const authButton = document.getElementById('auth-button');
    const keyInput = document.getElementById('validation-key-input');
    // NOVO: Adiciona o botão mestre para bloquear/desbloquear
    const masterAuthButton = document.getElementById('master-auth-button');

    if (criadorInput) criadorInput.disabled = !unlock;
    if (authButton) authButton.disabled = !unlock;
    if (keyInput) keyInput.disabled = !unlock; 
    if (masterAuthButton) masterAuthButton.disabled = !unlock;
}

/**
 * Esconde a tela de login (e a imagem de fundo) para revelar o aplicativo principal.
 */
window.hideLoginScreen = function() {
    const loginContainer = document.getElementById('login-container');
    const backgroundModal = document.getElementById('background-modal'); 
    const body = document.body;
    
    // Aplica opacidade zero para a transição suave nos dois modais
    if (loginContainer) {
        loginContainer.style.opacity = '0'; 
    }
    if (backgroundModal) {
        backgroundModal.style.opacity = '0';
    }

    // Remove completamente os elementos após a transição
    setTimeout(() => {
        if (loginContainer) loginContainer.remove();
        if (backgroundModal) backgroundModal.remove(); 
    }, 500);

    // Remove a classe de estilo de login do body
    if (body) {
        body.classList.remove('login-view');
        // Limpa a imagem de fundo (agora desnecessário, mas mantido por segurança)
        body.style.backgroundImage = 'none'; 
    }
}

/**
 * Alterna a visibilidade da seção de dados de compra/contato.
 */
window.togglePurchaseData = function() {
    const dataBox = document.getElementById('purchase-data-box');
    const toggleButton = document.getElementById('toggle-purchase-data-button');
    if (!dataBox || !toggleButton) return;

    if (dataBox.classList.contains('hidden')) {
        dataBox.classList.remove('hidden');
        toggleButton.textContent = 'OCULTAR DADOS DE COMPRA';
    } else {
        dataBox.classList.add('hidden');
        toggleButton.textContent = 'MOSTRAR DADOS DE COMPRA';
    }
}

/**
 * Lógica central para limpar o estado de teste e dados de uso do site no localStorage.
 */
function resetTrialStateLogic() {
    // Remove todas as chaves definidas na lista KEYS_TO_CLEAR
    KEYS_TO_CLEAR.forEach(key => {
        localStorage.removeItem(key);
    });
}

/**
 * Função para limpar o estado de teste local (para fins de desenvolvimento/re-teste).
 * MANTIDA para uso via console.
 * Exemplo: window.resetTrialState()
 */
window.resetTrialState = function() {
    resetTrialStateLogic();
    window.checkLocalStatusOnLoad();
    window.showStatus("Estado de teste local resetado com sucesso. Clique em 'INICIAR TESTE' para começar.", 'default');
}


// ----------------------------------------------------
// --- LÓGICA DE ACESSO (LOCAL) ---
// ----------------------------------------------------

/**
 * Verifica o status do período de teste local no localStorage.
 * Retorna { isActive: boolean, expirationDate: Date | null, daysLeft: number, trialStarted: boolean }
 */
function getTrialStatus() {
    const expirationDateStr = localStorage.getItem('trialExpirationDate');
    const trialStarted = localStorage.getItem('trialStarted') === 'true'; 
    
    if (!expirationDateStr) {
        return { isActive: false, expirationDate: null, daysLeft: 5, trialStarted: trialStarted }; 
    }
    
    const expirationDate = new Date(expirationDateStr);
    const now = new Date();
    
    if (now >= expirationDate) {
        // Expirado
        return { isActive: false, expirationDate: expirationDate, daysLeft: 0, trialStarted: trialStarted };
    }
    
    // Ativo
    const msLeft = expirationDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    
    return { isActive: true, expirationDate: expirationDate, daysLeft: daysLeft, trialStarted: trialStarted };
}

/**
 * Verifica o status do acesso local ao carregar a página e configura os botões.
 */
window.checkLocalStatusOnLoad = function() {
    const status = getTrialStatus();
    const authButton = document.getElementById('auth-button');
    const trialButton = document.getElementById('trial-button');

    // Garante que o botão de login chame o attemptLogin
    if (authButton) {
        authButton.onclick = window.attemptLogin;
    }

    // 1. LÓGICA DE CONTROLE DOS BOTÕES E UI
    if (status.trialStarted && !status.isActive) {
        // Se o teste já foi iniciado e EXPIRADO:
        if (trialButton) trialButton.classList.add('hidden'); // Esconde o botão de teste
    } else {
        // Se o teste está ativo OU nunca foi iniciado:
        if (trialButton) {
            // Se ativo, esconde o botão de teste (o login já faz o acesso)
            if (status.isActive) {
                trialButton.classList.add('hidden');
            } else {
                // Nunca iniciado
                trialButton.classList.remove('hidden'); // Mostra o botão de teste
            }
        }
    }


    // 2. LÓGICA DA MENSAGEM DE STATUS
    if (status.isActive) {
        // Acesso de teste ativo
        const expirationDisplay = status.expirationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        window.showStatus(`Acesso de Teste Local ATIVO. Expira em ${expirationDisplay}. Restam aproximadamente ${status.daysLeft} dias.`, 'success');
        
        if (authButton) {
            authButton.textContent = 'ACESSAR (TESTE ATIVO)';
        }

    } else {
        // Expirado ou nunca iniciado
        if (status.trialStarted) {
            // Expirado
            window.showStatus("ACESSO NEGADO: O período de teste EXPIROU. Use a chave de compra ou peça a reinicialização.", 'error');
            if (authButton) {
                authButton.textContent = 'AUTENTICAR E ACESSAR';
            }
        } else {
            // Nunca iniciado
            window.showStatus("Nenhum acesso ativo encontrado. Clique em 'INICIAR TESTE' para começar o período de 5 dias.", 'default');
            if (authButton) {
                authButton.textContent = 'AUTENTICAR E ACESSAR';
            }
        }
    }
    
    // Libera os campos para interação
    window.unlockAuthFields(true);
}

/**
 * Inicia o período de teste de 5 dias usando o relógio do aparelho.
 */
window.startTrial = function() {
    window.showStatus("Iniciando período de teste local...", 'loading');
    window.unlockAuthFields(false);

    try {
        const status = getTrialStatus();
        
        // Impede novo início se já foi usado (mesmo que expirado)
        if (status.trialStarted && !status.isActive) {
             window.showStatus("ACESSO NEGADO: O período de teste já foi utilizado e EXPIROU. Use a chave de compra ou peça a reinicialização.", 'error');
             window.checkLocalStatusOnLoad(); 
             return;
        }

        // Impede novo início se já está ativo
        if (status.isActive) {
            window.showStatus("O teste já está ativo! Clique em 'AUTENTICAR E ACESSAR'.", 'success');
            window.checkLocalStatusOnLoad(); 
            return;
        }
        
        const trialDays = 5;
        const now = new Date();
        // Define a expiração para 5 dias a partir de agora
        const expirationDate = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));
        
        localStorage.setItem('trialStartDate', now.toISOString());
        localStorage.setItem('trialExpirationDate', expirationDate.toISOString());
        localStorage.setItem('trialStarted', 'true'); // Marca que o teste foi iniciado
        
        const expirationDisplay = expirationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        window.showStatus(`ACESSO CONCEDIDO (Teste Local). Seu acesso expira em: ${expirationDisplay}.`, 'success');
        
        // Atualiza o status de carregamento e esconde a tela de login
        setTimeout(() => {
            window.hideLoginScreen();
        }, 1000);

    } catch (error) {
        console.error("Erro no startTrial:", error);
        window.showStatus(`Erro ao iniciar o período de teste local: ${error.message}`, 'error');
    } finally {
        // Força a atualização do estado dos botões
        window.checkLocalStatusOnLoad(); 
    }
}

/**
 * NOVO: Tentativa de login Mestre
 */
window.attemptMasterLogin = function() {
    window.showStatus("Verificando credenciais Mestre...", 'loading');
    window.unlockAuthFields(false); // Bloqueia temporariamente para feedback
    
    const keyInput = document.getElementById('validation-key-input').value.trim(); 
    
    // Acesso Mestre é verificado APENAS com a chave (dmcs)
    if (keyInput.toUpperCase() === MASTER_KEY.toUpperCase()) {
        window.showStatus(`ACESSO MESTRE CONCEDIDO. Bem-vindo, ${MASTER_USER}!`, 'success');
        
        // Define o campo de criador com o nome mestre
        document.getElementById('criador-input').value = MASTER_USER;

        setTimeout(() => {
            window.hideLoginScreen();
        }, 500);
        return true;
    } else {
        window.showStatus("ACESSO NEGADO: Chave Mestra Inválida.", 'error');
        window.unlockAuthFields(true);
        return false;
    }
}

/**
 * Função principal de login e validação de acesso.
 */
window.attemptLogin = function() {
    window.showStatus("Verificando status de acesso local...", 'loading');
    window.unlockAuthFields(false);
    
    const criadorInput = document.getElementById('criador-input').value.trim() || 'Usuário';
    const keyInput = document.getElementById('validation-key-input').value.trim(); 

    // -----------------------------------------------------
    // 1. VERIFICAÇÃO DA CHAVE MESTRA (DMCS) - Mantida por segurança
    // Se o usuário digitar 'Deivid' e 'dmcs' no formulário principal
    // -----------------------------------------------------
    if (criadorInput.toUpperCase() === MASTER_USER.toUpperCase() && keyInput.toUpperCase() === MASTER_KEY.toUpperCase()) {
        window.showStatus(`ACESSO MESTRE CONCEDIDO. Bem-vindo, ${MASTER_USER}!`, 'success');
        setTimeout(() => {
            window.hideLoginScreen();
        }, 500);
        return true;
    } 
    // FIM DA CHAVE MESTRA
    // -----------------------------------------------------

    const status = getTrialStatus();
    
    if (status.isActive) {
        // Acesso ativo (Trial)
        const expirationDisplay = status.expirationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        window.showStatus(`ACESSO CONCEDIDO (Ativo - Local). Bem-vindo(a), ${criadorInput}. Restam aproximadamente ${status.daysLeft} dias.`, 'success');
        
        setTimeout(() => {
            window.hideLoginScreen();
        }, 1000);
        return true;
    } else {
        // Expirado ou nunca iniciado
        if (status.trialStarted) {
            // Expirado
            window.showStatus(`ACESSO NEGADO: O período de teste de '${criadorInput}' expirou. Por favor, obtenha uma chave de compra.`, 'error');
        } else {
            // Nunca iniciado
            window.showStatus(`ACESSO NEGADO: Por favor, clique em 'INICIAR TESTE' para começar seu período de 5 dias.`, 'error');
        }

        window.unlockAuthFields(true);
        return false;
    }
}


// ----------------------------------------------------
// --- FUNÇÃO DE INJEÇÃO PRINCIPAL ---
// ----------------------------------------------------

/**
 * Injeta o CSS, HTML e a lógica de login/autenticação local.
 */
window.injectLoginScreen = function() {
    // 1. Tenta encontrar um container de login existente para evitar duplicação
    if (document.getElementById('login-container')) {
        console.warn("A tela de login já foi injetada. Ignorando injeção.");
        return;
    }
    
    // 2. Injeta os estilos no <head>
    const styleElement = document.createElement('style');
    styleElement.id = 'login-styles';
    styleElement.innerHTML = LOGIN_STYLES;
    document.head.appendChild(styleElement);
    
    // 3. CRIA E INJETA O MODAL DE BACKGROUND (Atrás do principal, z-index: 999 pelo CSS)
    const backgroundModal = document.createElement('div');
    backgroundModal.id = 'background-modal';
    if (document.body) {
        // Insere o background modal
        document.body.insertBefore(backgroundModal, document.body.firstChild);
    }

    // 4. Injeta o HTML do container principal (z-index: 1000 pelo HTML)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = LOGIN_HTML_CONTENT;
    const loginContainer = tempDiv.firstElementChild; 

    if (document.body) {
         // Insere o container de login no topo do <body> para garantir que ele cubra tudo (o z-index fará a sobreposição).
        document.body.insertBefore(loginContainer, document.body.firstChild);

        // 5. Aplica a classe de fundo ao body (para o estilo de fonte/padding/etc)
        document.body.classList.add('login-view');
        
        // 6. Inicializa a verificação de status local
        window.checkLocalStatusOnLoad();
    } else {
        console.error("ERRO: O elemento <body> não está disponível. A injeção falhou.");
    }
}


// ----------------------------------------------------
// --- INJEÇÃO AUTOMÁTICA AO CARREGAR O SCRIPT ---
// ----------------------------------------------------

/**
 * Dispara a injeção da tela de login quando o DOM estiver completamente carregado.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno atraso para garantir que o DOM esteja totalmente renderizado.
    setTimeout(() => {
        if (typeof window.injectLoginScreen === 'function') {
            window.injectLoginScreen();
        }
    }, 100);
});
