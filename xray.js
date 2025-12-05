// Arquivo: xray.js
// Contém a lógica de seleção de malhas (meshes) e o efeito de transparência (Raio-X),
// além da alternância do modo de anexação do TransformControls (Gizmo) e a função de Raycasting.

// Variável global para rastrear a malha (Mesh) atualmente selecionada para o efeito.
let currentSelectedMesh = null;

// Variável para rastrear o modo de operação do Gizmo:
// true = Gizmo anexa à PEÇA (Mesh); false = Gizmo anexa ao MODELO RAIZ (Group)
let isGizmoAttachedToMesh = false; 

// Variáveis para Raycasting (Detecção de clique na cena 3D)
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Material padrão temporário que será usado se a malha original não puder ser restaurada
const DEFAULT_MATERIAL_XRAY_HELPER = new THREE.MeshStandardMaterial({ 
    color: 0xaaaaaa, 
    metalness: 0.5, 
    roughness: 0.5 
});

// Material para o efeito Raio-X (transparente, destacável em verde)
const XRAY_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x00ff00,    // Cor de destaque (verde vibrante)
    opacity: 0.25,      // Transparência
    transparent: true,  // Habilita a transparência
    depthTest: true,    // Mantém o teste de profundidade padrão
    metalness: 0.1,
    roughness: 0.8
});

/**
 * Restaura o material original da malha.
 * @param {THREE.Mesh} mesh - A malha a ser restaurada.
 */
function restoreOriginalMaterial(mesh) {
    if (mesh && mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial;
        mesh.userData.originalMaterial = null;
        mesh.material.needsUpdate = true;
    }
}

/**
 * Aplica o material Raio-X ou o material de seleção à malha.
 * @param {THREE.Mesh} mesh - A malha a ser modificada.
 * @param {boolean} isXRayActive - Indica se o modo Raio-X global está ativo.
 */
function applySelectionMaterial(mesh, isXRayActive) {
    if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
    }

    if (isXRayActive) {
        // Se o Raio-X global está ativo, a seleção é o XRAY_MATERIAL (já aplicado globalmente)
        // Apenas para garantir que o material não foi sobrescrito por engano.
        mesh.material = XRAY_MATERIAL;
    } else {
        // Se o Raio-X global está DESATIVADO, usa-se o material XRAY para Destaque/Seleção
        mesh.material = XRAY_MATERIAL; 
    }
    mesh.material.needsUpdate = true;
}

/**
 * Centraliza a lógica para selecionar ou deselecionar uma malha.
 * @param {THREE.Mesh|null} mesh - A malha clicada, ou null para deselecionar tudo.
 */
window.selectMeshForXRay = function (mesh) {
    // 1. Desfaz a seleção anterior
    if (currentSelectedMesh) {
        // Verifica se a malha anterior não é o mesmo objeto
        if (currentSelectedMesh !== mesh) {
            // Se o modo Raio-X global está ATIVO, não restauramos o material original, pois o toggleXRay() já o aplicou/manterá.
            // A restauração só é necessária se o Raio-X global está DESATIVADO e queremos remover o destaque individual.
            if (!window.isXRayMode) {
                 restoreOriginalMaterial(currentSelectedMesh);
            }
        }
    }

    // 2. Define a nova seleção
    if (mesh) {
        // Se a malha selecionada é a mesma, deseleciona (toggle)
        if (mesh === currentSelectedMesh) {
            restoreOriginalMaterial(mesh);
            currentSelectedMesh = null;
            // Desanexa o gizmo ao deselecionar
            if (window.transformControls) window.transformControls.detach(); 
            return;
        }

        // Aplica o material de destaque (Raio-X, que serve como seleção)
        applySelectionMaterial(mesh, window.isXRayMode);
        currentSelectedMesh = mesh;
        
        // 3. Anexa o Gizmo à peça se estiver no modo correto (isGizmoAttachedToMesh)
        if (window.transformControls && isGizmoAttachedToMesh) {
            window.transformControls.detach();
            window.transformControls.attach(mesh);
        }
    } else {
        // Se mesh é null, apenas limpa a seleção
        currentSelectedMesh = null;
        if (window.transformControls) window.transformControls.detach();
    }
};


/**
 * Função principal chamada pelo botão "Raio-X" para alternar o modo global.
 * @param {Array<THREE.Group>} loadedModels - Lista de modelos na cena.
 * @param {boolean} activate - True para ativar o modo Raio-X, False para desativar.
 */
window.toggleXRay = function(loadedModels, activate) {
    // Armazena o estado global (definido no 2,zero3.html)
    window.isXRayMode = activate; 
    
    loadedModels.forEach(model => {
        model.traverse(child => {
            if (child.isMesh && child.name !== 'Chao') {
                if (activate) {
                    // Guarda o material original, se ainda não estiver guardado
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material;
                    }
                    child.material = XRAY_MATERIAL;
                } else {
                    // Desativa: restaura o material original, se houver backup
                    restoreOriginalMaterial(child);
                }
            }
        });
    });
};

/**
 * NOVO: Lida com o clique do mouse na tela para detecção de malhas 3D (Raycasting).
 */
window.onMouseDown = function(event) {
    // Verifica se os controles (TransformControls/Gizmo) estão sendo usados. Se sim, ignora.
    if (window.transformControls && window.transformControls.dragging) return;
    // Ignora se o clique não for o botão principal do mouse
    if (event.button !== 0) return; 

    // Se estiver usando os OrbitControls (botão direito ou meio do mouse), ignora o raycasting
    if (window.controls && window.controls.enabled && (event.buttons === 2 || event.buttons === 4)) return;

    // Calcula a posição do mouse em coordenadas normalizadas (-1 a +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Atualiza o raycaster com a câmera e a posição do mouse
    raycaster.setFromCamera(mouse, window.camera);

    // Coleta todas as malhas que fazem parte dos modelos carregados
    let allMeshes = [];
    if (window.loadedModels) {
        window.loadedModels.forEach(model => {
            model.traverse(child => {
                if (child.isMesh && child.name !== 'Chao') { 
                    allMeshes.push(child);
                }
            });
        });
    }

    // Calcula os objetos que interceptam o raio
    const intersects = raycaster.intersectObjects(allMeshes, true);
    
    let selectedMesh = null;
    if (intersects.length > 0) {
        // Pega a primeira malha intersectada (a mais próxima da câmera)
        selectedMesh = intersects[0].object;
    }

    // Chama a função de seleção (toggle on/off)
    window.selectMeshForXRay(selectedMesh);
    
    if (selectedMesh) {
         console.log(`Malha clicada: ${selectedMesh.name}. ${currentSelectedMesh === selectedMesh ? 'Selecionada.' : 'Deselecionada.'}`);
    } else {
         console.log('Clique no fundo. Seleção limpa.');
    }
}


// Inicializa o listener de clique para Raycasting assim que o DOM for carregado
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o listener de clique para a função de Raycasting
    document.addEventListener('mousedown', window.onMouseDown, false); 
});

