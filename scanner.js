/**
 * modelScanner.js
 * * Este script contém a função para escanear um modelo 3D carregado (THREE.Object3D)
 * e listar suas sub-peças (THREE.Mesh) junto com seus valores reais (área e dimensões).
 * * * FUNÇÃO PRINCIPAL EXPOSTA: window.performMeshScanAndSetData(model, currentUnit, MATERIAL_TYPES, DEFAULT_MATERIAL_TYPE)
 * - Proposito: Integra as métricas de calculo do scanner (Área e Bounding Box) com a estrutura userData 
 * dos objetos THREE.Mesh e THREE.Group, conforme esperado pelo script principal (modelonovo8.html).
 * * * * NOVA FUNÇÃO EXPOSTA: window.calculateAllMaterials(models, MATERIAL_TYPES)
 * - Proposito: Agrega os valores de cálculo (calculationValue) de todas as malhas para fornecer os totais de material 
 * e exibe o modal de resultados.
 */

(function () {
    
    // --- Funções de Cálculo ---

    /**
     * Calcula a área de superfície de uma THREE.BufferGeometry.
     * @param {THREE.BufferGeometry} geometry - A geometria da malha.
     * @returns {number} A área total da superfície na unidade base Three.js².
     */
    function calculateSurfaceArea(geometry) {
        if (!geometry || !geometry.attributes.position) {
            return 0;
        }

        // Garante que a geometria está indexada ou converte para não-indexada para cálculo
        let currentGeometry = geometry;
        if (!geometry.index) {
            // Cria uma cópia temporária não indexada, se necessário
            currentGeometry = geometry.toNonIndexed();
        }

        const positions = currentGeometry.attributes.position.array;
        const indexArray = currentGeometry.index ? currentGeometry.index.array : Array.from({ length: positions.length / 3 }, (_, i) => i);
        let totalArea = 0;

        for (let i = 0; i < indexArray.length; i += 3) {
            const i1 = indexArray[i] * 3;
            const i2 = indexArray[i + 1] * 3;
            const i3 = indexArray[i + 2] * 3;

            const vA = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
            const vB = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
            const vC = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

            // Calcula a área do triângulo usando produto vetorial
            const cb = new THREE.Vector3();
            const ca = new THREE.Vector3();

            cb.subVectors(vC, vB);
            ca.subVectors(vA, vB);
            cb.cross(ca);

            totalArea += cb.length() / 2;
        }

        return totalArea;
    }

    /**
     * Calcula as dimensões da Bounding Box (L, A, P) e as armazena em userData.
     * Os resultados são SEMPRE armazenados em milímetros (mm), aplicando o scaleFactor.
     * @param {THREE.BufferGeometry} geometry - A geometria da malha.
     * @param {THREE.Mesh} mesh - A malha para armazenar os dados.
     * @param {number} scaleFactor - O fator de escala para converter a unidade base Three.js para milímetros (e.g., 1000 para 'm', 10 para 'cm', 1 para 'mm').
     */
    function calculateBoundingBoxDimensions(geometry, mesh, scaleFactor = 1) {
        if (!geometry || !geometry.attributes.position) {
            mesh.userData.dimensions = { length: 0, width: 0, height: 0, unit: 'mm' };
            mesh.userData.maxDimension_mm = 0;
            return;
        }

        // Garante que a Bounding Box seja calculada
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;

        if (bbox) {
            const size = new THREE.Vector3();
            bbox.getSize(size);

            // Aplica o fator de escala para obter dimensões em milímetros (mm)
            const dimensions = {
                length: size.x * scaleFactor, // Comprimento em mm
                width: size.y * scaleFactor,  // Largura em mm
                height: size.z * scaleFactor, // Altura em mm
                unit: 'mm' // A unidade final é sempre milímetros
            };
            
            // Armazena as dimensões na userData da malha
            mesh.userData.dimensions = dimensions;
            
            // Armazena a maior dimensão em mm para uso em cálculos LINEAR
            mesh.userData.maxDimension_mm = Math.max(dimensions.length, dimensions.width, dimensions.height);
        } else {
            mesh.userData.dimensions = { length: 0, width: 0, height: 0, unit: 'mm' };
            mesh.userData.maxDimension_mm = 0;
        }
    }

    /**
     * Estima o volume da malha usando o volume da Bounding Box (unidades base Three.js³).
     * @param {THREE.BufferGeometry} geometry - A geometria da malha.
     * @returns {number} O volume estimado.
     */
    function estimateVolume(geometry) {
        if (!geometry || !geometry.attributes.position) {
            return 0;
        }

        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        if (!bbox) return 0;

        const size = new THREE.Vector3();
        bbox.getSize(size);
        // Estimativa simples de volume (Volume da Bounding Box)
        return size.x * size.y * size.z;
    }

    // --- Nova Função: Determinação Automática do Tipo de Material ---

    /**
     * Determina automaticamente o materialType da malha com base no nome e nas dimensões.
     * Prioridade: Nome > Proporções de Bounding Box.
     * @param {THREE.Mesh} mesh - A malha a ser classificada.
     * @param {Object} dimensions - Objeto com { length, width, height } em mm.
     * @param {Object} MATERIAL_TYPES - Objeto de tipos de material (CHAPA(m²), VOLUME(m³), LINEAR(m), UNITARIO(un)).
     * @returns {string | null} O materialType (ex: 'CHAPA (m²)') ou null se não puder determinar.
     */
    function autoDetermineMaterialType(mesh, dimensions, MATERIAL_TYPES) {
        if (!dimensions || dimensions.length === 0) return null;

        const name = mesh.name ? mesh.name.toUpperCase() : '';
        const { length, width, height } = dimensions;
        const dims = [length, width, height].sort((a, b) => a - b); // [Espessura, Largura, Comprimento]
        
        const T = dims[0]; // Espessura (menor)
        const W = dims[1]; // Largura (média)
        const L = dims[2]; // Comprimento (maior)
        
        // Fator de tolerância para comparação (ex: 5% da dimensão maior, ou 10mm fixos)
        // Usaremos uma tolerância de 5% da dimensão L para definir o que é "fino"
        const THIN_RATIO = 0.05; 
        const THIN_THRESHOLD = Math.max(10, L * THIN_RATIO); // Min 10mm para grandes peças

        // 1. Classificação por Nome (Prioridade Alta)
        if (name.includes('CHAPA') || name.includes('PLACA')) {
            return MATERIAL_TYPES.CHAPA;
        }
        
        if (name.includes('TUBO') || name.includes('METALON') || name.includes('PERFIL ESTRUTURAL')) {
             // O usuário solicitou tubos/metalons para cálculo em M3 (VOLUME)
            return MATERIAL_TYPES.VOLUME;
        }
        
        if (name.includes('BARRA') || name.includes('PERFIL') || name.includes('HASTE')) {
            return MATERIAL_TYPES.LINEAR;
        }

        if (name.includes('UNIDADE') || name.includes('PECA')) {
            return MATERIAL_TYPES.UNITARIO;
        }

        // 2. Classificação por Dimensão (Fallback)
        
        // Verifica se a peça é muito pequena em todas as dimensões, tratando como UNITARIO
        if (L < 50) { // Se a maior dimensão for menor que 50mm, pode ser uma peça unitária (parafuso, etc.)
            return MATERIAL_TYPES.UNITARIO;
        }

        // A. CHAPA (Sheet/Plate): A espessura (T) é muito pequena em relação ao Comprimento (L) e Largura (W)
        // Se T for menor que o THIN_THRESHOLD E T for muito menor que W (por exemplo, < 10% de W)
        const isThinSheet = T < THIN_THRESHOLD && (T / W < 0.1); 

        if (isThinSheet) {
            return MATERIAL_TYPES.CHAPA;
        }

        // B. LINEAR (Profile/Bar): A Espessura (T) e Largura (W) são muito menores que o Comprimento (L)
        // Se T e W forem menores que o THIN_THRESHOLD (indicando que L é muito maior)
        const isLinearProfile = T < THIN_THRESHOLD && W < THIN_THRESHOLD && L > W * 5; // L é pelo menos 5x maior que W

        if (isLinearProfile) {
            return MATERIAL_TYPES.LINEAR;
        }

        // C. VOLUME (Block/Solid): Se nenhuma das condições acima for atendida, é um volume
        // As três dimensões são relativamente próximas (não é chapa nem perfil fino)
        return MATERIAL_TYPES.VOLUME;
    }


    // --- Função Principal de Escaneamento e Preparação de Dados ---

    /**
     * Escaneia um modelo (THREE.Object3D) e suas sub-malhas (THREE.Mesh), 
     * calculando e armazenando métricas (Área, Volume, Dimensões e Valores de Cálculo).
     * @param {THREE.Object3D} model - O modelo ou grupo a ser escaneado.
     * @param {string} currentUnit - A unidade atual do sistema (e.g., 'm', 'cm', 'mm').
     * @param {Object} MATERIAL_TYPES - Objeto de tipos de material (CHAPA(m²), VOLUME(m³), LINEAR(m), UNITARIO(un)).
     * @param {string} DEFAULT_MATERIAL_TYPE - O tipo de material padrão para novas malhas.
     */
    window.performMeshScanAndSetData = function(model, currentUnit, MATERIAL_TYPES, DEFAULT_MATERIAL_TYPE) {
        
        // Define o fator de conversão de unidade base Three.js para milímetros (mm)
        let scaleFactor = 1;
        if (currentUnit === 'm') {
            scaleFactor = 1000; // 1 Three.js unit (m) = 1000 mm
        } else if (currentUnit === 'cm') {
            scaleFactor = 10; // 1 Three.js unit (cm) = 10 mm
        }
        // Se currentUnit for 'mm', scaleFactor = 1.

        let groupTotalArea = 0;
        let groupTotalVolume = 0;

        // Traverse o modelo
        model.traverse(child => {
            if (child.isMesh) {
                const mesh = child;
                const geometry = mesh.geometry;

                // 1. Calcula a Área de Superfície (em unidades base Three.js²)
                const surfaceArea = calculateSurfaceArea(geometry);

                // 2. Calcula Volume Estimado (em unidades base Three.js³)
                const meshVolumeEstimate = estimateVolume(geometry);
                
                // 3. Calcula a Bounding Box e armazena **em milímetros (mm)**
                calculateBoundingBoxDimensions(geometry, mesh, scaleFactor);
                
                // Armazena os valores brutos na userData da malha (em unidades base Three.js)
                mesh.userData.area = surfaceArea;
                mesh.userData.volume = meshVolumeEstimate;
                
                // =========================================================================
                // 4. Determinação Automática do Tipo de Material (NOVA LÓGICA)
                // =========================================================================
                const autoType = autoDetermineMaterialType(mesh, mesh.userData.dimensions, MATERIAL_TYPES);

                // Inicializa/Atualiza o tipo de material, priorizando a determinação automática
                // Se autoType for null (caso improvável), usa o DEFAULT_MATERIAL_TYPE
                mesh.userData.materialType = autoType || mesh.userData.materialType || DEFAULT_MATERIAL_TYPE;
                
                // 5. Define o valor de cálculo final (calculationValue) e a unidade (calculationUnit)
                // Conversão de unidades (base Three.js -> Unidade de Material)
                
                if (mesh.userData.materialType.includes('CHAPA')) {
                    // CHAPA (Área em m²)
                    let area_sqm = surfaceArea; // Inicialmente em (unidade base)²
                    
                    if (currentUnit === 'cm') {
                        area_sqm = surfaceArea / 10000; // (cm)² -> m²
                    } else if (currentUnit === 'mm') {
                        area_sqm = surfaceArea / 1000000; // (mm)² -> m²
                    }
                    
                    mesh.userData.calculationValue = area_sqm;
                    mesh.userData.calculationUnit = 'm²'; // Garante a unidade de cálculo m²

                } else if (mesh.userData.materialType.includes('VOLUME')) {
                    // VOLUME (Volume em m³)
                    let volume_cubm = meshVolumeEstimate; // Inicialmente em (unidade base)³
                    
                    if (currentUnit === 'cm') {
                        volume_cubm = meshVolumeEstimate / 1000000; // (cm)³ -> m³
                    } else if (currentUnit === 'mm') {
                        volume_cubm = meshVolumeEstimate / 1000000000; // (mm)³ -> m³
                    }

                    mesh.userData.calculationValue = volume_cubm;
                    mesh.userData.calculationUnit = 'm³'; // Garante a unidade de cálculo m³
                    
                } else if (mesh.userData.materialType.includes('LINEAR')) {
                    // LINEAR (Comprimento em mm) - Usando a dimensão máxima em milímetros
                    const maxDimension_mm = mesh.userData.maxDimension_mm || 0;
                    
                    // O valor de cálculo é o comprimento em mm
                    mesh.userData.calculationValue = maxDimension_mm; 
                    mesh.userData.calculationUnit = 'mm'; 

                } else if (mesh.userData.materialType.includes('UNITARIO')) {
                    // UNITARIO (un)
                    mesh.userData.calculationValue = 1; // 1 unidade
                    mesh.userData.calculationUnit = 'un'; 
                } else {
                    mesh.userData.calculationValue = 0;
                    mesh.userData.calculationUnit = 'N/A';
                }

                // Soma os totais para o Group pai (em unidades base Three.js)
                groupTotalArea += surfaceArea;
                groupTotalVolume += meshVolumeEstimate; 
            }
        });
        
        // Armazena o total no Group pai para uso na lista principal (em unidades base Three.js)
        model.userData.area = groupTotalArea;
        model.userData.volume = groupTotalVolume;
        
        // Define o valor de cálculo do grupo (padrão em área, convertido para m²)
        let area_sqm_group = groupTotalArea;
        if (currentUnit === 'cm') {
            area_sqm_group = groupTotalArea / 10000; // (cm)² -> m²
        } else if (currentUnit === 'mm') {
            area_sqm_group = groupTotalArea / 1000000; // (mm)² -> m²
        }

        model.userData.calculationValue = area_sqm_group; 
        model.userData.calculationUnit = 'm²'; // Garante a unidade m²
        model.userData.materialType = model.userData.materialType || DEFAULT_MATERIAL_TYPE;
        
        console.log(`[modelScanner] Escaneamento concluído. ${model.name} propriedades atualizadas.`);
    };


    /**
     * Itera sobre os modelos e calcula o total de material necessário para cada tipo.
     * Esta função é a que o botão "cálculo de matérias" deve chamar.
     * @param {THREE.Object3D[]} models - Array de modelos carregados (THREE.Group ou THREE.Mesh).
     * @param {Object} MATERIAL_TYPES - Objeto de tipos de material (CHAPA(m²), VOLUME(m³), LINEAR(m), UNITARIO(un)).
     * @returns {Object} Um objeto com os totais por tipo de material.
     */
    window.calculateAllMaterials = function(models, MATERIAL_TYPES) {
        const totals = {};
        
        // 1. Inicializa totais com os tipos de material (m², m³, mm, un)
        Object.values(MATERIAL_TYPES).forEach(type => {
            const key = type.split('(')[0].trim(); // CHAPA, VOLUME, LINEAR, UNITARIO
            let unit = type.split('(')[1].replace(')', '').trim(); // m², m³, m, un
            
            // Força a unidade de exibição para LINEAR (mm) e UNITARIO (un)
            if (key === 'LINEAR') {
                unit = 'mm'; 
            } else if (key === 'UNITARIO') {
                unit = 'un';
            }

            totals[key] = { value: 0, unit: unit, type: type };
        });

        if (!models || models.length === 0) {
            console.warn('[modelScanner] Nenhum modelo para calcular. Verifique se há modelos carregados.');
            
            // Exibe o modal de resultados mesmo que esteja vazio
            displayCalculationResults({}, totals);
            return totals;
        }

        // 2. Agrega os valores de cálculo de todas as malhas
        models.forEach(model => {
            model.traverse(child => {
                // Soma apenas os valores de cálculo das malhas individuais (sub-peças)
                if (child.isMesh && child.userData.materialType) {
                    const type = child.userData.materialType;
                    const key = type.split('(')[0].trim();
                    const value = child.userData.calculationValue || 0; // Valor final de cálculo (e.g., m², m³, mm ou un)
                    
                    if (totals[key]) {
                        totals[key].value += value;
                    }
                }
            });
        });

        // 3. Formata e exibe os resultados
        const formattedResults = {};
        for (const key in totals) {
            // Inclui o resultado se o valor for maior que 0.
            if (totals[key].value > 0) {
                formattedResults[key] = {
                    // Se for UNITARIO, arredonda para 0 casas decimais (é uma contagem)
                    value: key === 'UNITARIO' ? totals[key].value.toFixed(0) : totals[key].value.toFixed(3), 
                    unit: totals[key].unit,
                    type: totals[key].type
                };
            }
        }
        
        console.log('[modelScanner] Resultados do Cálculo de Material:', formattedResults);
        
        // Exibe o modal
        displayCalculationResults(formattedResults, totals);

        return formattedResults;
    };


    /**
     * Auxiliar para manipular o DOM e exibir os resultados no modal.
     * Presume a existência de 'creator-modal', 'results-modal' e 'calculation-results-ul' no HTML.
     * @param {Object} formattedResults - Resultados formatados com valores > 0.
     * @param {Object} allTotals - Todos os totais (incluindo 0).
     */
    function displayCalculationResults(formattedResults, allTotals) {
        const creatorModal = document.getElementById('creator-modal');
        const resultsModal = document.getElementById('results-modal');
        const resultsUl = document.getElementById('calculation-results-ul');

        if (creatorModal) {
            creatorModal.style.display = 'none';
        }

        if (resultsUl) {
            resultsUl.innerHTML = ''; // Limpa resultados anteriores
            
            let hasResults = false;
            
            // Itera sobre todos os tipos de material para garantir a ordem e que todos os tipos apareçam
            for (const key in allTotals) {
                const result = formattedResults[key];
                
                // Apenas exibe se houver um resultado formatado (valor > 0)
                if (result) {
                    hasResults = true;
                    const li = document.createElement('li');
                    li.className = 'py-2 px-4 bg-gray-100 rounded-md mb-2 shadow-inner flex justify-between items-center';
                    li.innerHTML = `
                        <span class="font-semibold text-gray-700">${key}:</span>
                        <span class="text-lg font-bold text-indigo-600">${result.value} <span class="text-sm font-medium text-indigo-500">${result.unit}</span></span>
                    `;
                    resultsUl.appendChild(li);
                }
            }
            
            if (!hasResults) {
                 const li = document.createElement('li');
                 li.className = 'py-2 px-4 bg-yellow-100 rounded-md text-sm text-yellow-700';
                 li.innerText = 'Nenhum material configurado ou modelo carregado com dados de cálculo.';
                 resultsUl.appendChild(li);
            }
        }

        if (resultsModal) {
            resultsModal.style.display = 'flex'; // Exibe o modal de resultados
        }
    }

})();