// Verificar se databaseManager está disponível via window
if (typeof databaseManager === 'undefined' && typeof window.CamarimDatabase !== 'undefined') {
    databaseManager = window.CamarimDatabase;
    console.log('✅ DatabaseManager carregado via window.CamarimDatabase');
}

// Fallback: criar DatabaseManager básico se necessário
if (typeof databaseManager === 'undefined') {
    console.warn('⚠️ DatabaseManager não encontrado, criando versão básica...');
    
    databaseManager = {
        initialized: false,
        init: async function() {
            console.log('🔄 Inicializando DatabaseManager básico...');
            this.initialized = true;
            return true;
        },
        getSystemData: async function() {
            try {
                const savedData = localStorage.getItem('camarim-system-data');
                if (savedData) {
                    return JSON.parse(savedData);
                }
            } catch (error) {
                console.error('❌ Erro ao carregar do localStorage:', error);
            }
            return {
                products: [],
                sales: [],
                settings: {}
            };
        },
        saveSystemData: async function(data) {
            try {
                localStorage.setItem('camarim-system-data', JSON.stringify(data));
                console.log('💾 Dados salvos no localStorage');
                return true;
            } catch (error) {
                console.error('❌ Erro ao salvar no localStorage:', error);
                return false;
            }
        },
        migrateFromLocalStorage: async function() {
            console.log('🔄 Migração do localStorage (básica)');
            const lsData = localStorage.getItem('camarim-system-data');
            if (!lsData) return false;
            
            try {
                const data = JSON.parse(lsData);
                await this.saveSystemData(data);
                console.log(`✅ ${data.products?.length || 0} produtos migrados`);
                return true;
            } catch (error) {
                console.error('❌ Erro na migração:', error);
                return false;
            }
        },
        getDatabaseInfo: async function() {
            try {
                const data = await this.getSystemData();
                return {
                    status: 'LocalStorage',
                    products: data.products?.length || 0,
                    sales: data.sales?.length || 0,
                    storage: 'N/A'
                };
            } catch (error) {
                return {
                    status: 'Erro',
                    products: 0,
                    sales: 0,
                    storage: 'N/A'
                };
            }
        },
        logAudit: async function() {
            // Função vazia para compatibilidade
        }
    };
    
    window.databaseManager = databaseManager;
}

// ============================================
// 1. ESTRUTURA DE DADOS DO SISTEMA
// ============================================

let systemData = {
    products: [],
    sales: [],
    settings: {
        defaultDebitFee: 2.0,
        defaultCreditFee: 4.5,
        lastProductId: 0,
        lastSaleId: 0
    }
};

// Estado da aplicação
let appState = {
    currentView: 'dashboard',
    currentProductId: null,
    currentSaleId: null,
    cart: [],
    saleInProgress: false,
    charts: {
        monthlySales: null,
        categoryChart: null
    },
    currentSaleData: null,
    databaseReady: false
};

// Dados para edição de vendas
let editingSaleData = {
    saleId: null,
    originalSale: null,
    cart: [],
    originalCart: []
};

// ============================================
// 2. INICIALIZAÇÃO DO SISTEMA
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Sistema Camarim...');
    
    // Inicializar sistema
    await initSystem();
    setupEventListeners();
    
    // Verificar hash da URL para manter a aba selecionada
    checkHashAndShowView();
    
    // Configurar listener para mudanças de hash
    window.addEventListener('hashchange', checkHashAndShowView);
    
    // Mostrar status do banco de dados
    showDatabaseStatus();
});

function checkHashAndShowView() {
    const hash = window.location.hash.substring(1);
    const validViews = ['dashboard', 'products', 'new-product', 'sales', 'new-sale', 'reports', 'database'];
    
    if (hash && validViews.includes(hash)) {
        showView(hash);
    } else {
        showView('dashboard');
    }
}

async function initSystem() {
    console.log('🔄 Carregando dados do sistema...');
    
    try {
        // Inicializar DatabaseManager se necessário
        if (!databaseManager.initialized) {
            console.log('🔧 Inicializando DatabaseManager...');
            await databaseManager.init();
        }
        
        // Carregar dados do sistema
        const savedData = await databaseManager.getSystemData();
        
        if (savedData && typeof savedData === 'object') {
            systemData = savedData;
            console.log(`✅ Dados carregados: ${systemData.products.length} produtos, ${systemData.sales.length} vendas`);
            appState.databaseReady = true;
            
            // Verificar se precisa migrar IDs
            updateProductIds();
            updateSaleIds();
            
        } else {
            console.log('📭 Nenhum dado encontrado, criando nova base');
            createInitialData();
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema:', error);
        
        // Fallback para localStorage direto
        loadFromLocalStorageDirect();
    }
    
    // Carregar configurações na UI
    loadData();
    updateDashboard();
}

function loadFromLocalStorageDirect() {
    try {
        const savedData = localStorage.getItem('camarim-system-data');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // Validar estrutura básica
            if (data && typeof data === 'object') {
                systemData = data;
                console.log('✅ Dados carregados do localStorage (direto)');
            } else {
                throw new Error('Estrutura de dados inválida');
            }
        } else {
            createInitialData();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar do localStorage:', error);
        showAlert('Erro ao carregar dados salvos. Criando nova base de dados.', 'warning');
        createInitialData();
    }
}

function createInitialData() {
    systemData = {
        products: [],
        sales: [],
        settings: {
            defaultDebitFee: 2.0,
            defaultCreditFee: 4.5,
            lastProductId: 0,
            lastSaleId: 0
        }
    };
    
    saveData();
}

// ============================================
// 3. GERENCIAMENTO DE DADOS
// ============================================

async function saveData() {
    try {
        const success = await databaseManager.saveSystemData(systemData);
        
        if (success) {
            console.log('💾 Dados salvos com sucesso');
        } else {
            console.log('⚠️ Dados salvos em modo fallback');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        showAlert('Erro ao salvar dados no navegador', 'error');
    }
}

function loadData() {
    // Atualizar lista de produtos
    updateProductsList();
    updateSalesList();
}

function updateProductIds() {
    let maxId = 0;
    
    systemData.products.forEach(product => {
        if (product.id && product.id.startsWith('CAM-')) {
            const idNum = parseInt(product.id.replace('CAM-', ''));
            if (!isNaN(idNum) && idNum > maxId) {
                maxId = idNum;
            }
        }
    });
    
    systemData.settings.lastProductId = maxId;
}

function updateSaleIds() {
    let maxId = 0;
    
    systemData.sales.forEach(sale => {
        if (sale.id && sale.id.startsWith('SALE-')) {
            const idNum = parseInt(sale.id.replace('SALE-', ''));
            if (!isNaN(idNum) && idNum > maxId) {
                maxId = idNum;
            }
        }
    });
    
    systemData.settings.lastSaleId = maxId;
}

// ============================================
// 4. NAVEGAÇÃO ENTRE VIEWS
// ============================================

function showView(viewName) {
    viewName = DOMPurify.sanitize(viewName);
    
    appState.currentView = viewName;
    window.location.hash = viewName;
    
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('d-none');
    });
    
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
        viewElement.classList.remove('d-none');
    } else {
        console.error(`❌ View ${viewName} não encontrada`);
        showView('dashboard');
        return;
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        }
    });
    
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'Produtos',
        'new-product': 'Cadastrar Produto',
        'sales': 'Vendas',
        'new-sale': 'Nova Venda',
        'reports': 'Relatórios',
        'database': 'Banco de Dados'
    };
    
    const titleElement = document.getElementById('page-title');
    if (titleElement) {
        titleElement.textContent = titles[viewName] || 'Dashboard';
    }
    
    switch(viewName) {
        case 'dashboard':
            updateDashboard();
            updateMonthlySalesChart();
            break;
        case 'products':
            updateProductsList();
            updateInventorySummary();
            break;
        case 'new-product':
            resetProductForm();
            break;
        case 'sales':
            updateSalesList();
            break;
        case 'new-sale':
            setupNewSale();
            break;
        case 'reports':
            updateReports();
            updateCategoryChart();
            break;
        case 'database':
            updateDatabaseInfo();
            break;
    }
}

// ============================================
// 5. SETUP DE EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Navegação do menu
    document.querySelectorAll('.nav-item, .btn-primary, .btn-secondary, .btn[data-view]').forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            if (view) {
                showView(view);
            }
        });
    });
    
    // Botões de ação do cabeçalho
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    
    if (exportBtn) exportBtn.addEventListener('click', () => showModal('export-modal'));
    if (importBtn) importBtn.addEventListener('click', () => showModal('import-modal'));
    
    // Formulário de produto
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', saveProduct);
    }
    
    // Atualizar cálculos do produto em tempo real
    const calcFields = ['purchase-cost', 'profit-margin', 'cmv-cost'];
    calcFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateProductCalculations);
        }
    });
    
    // Busca de produtos
    const productSearch = document.getElementById('product-search');
    const categoryFilter = document.getElementById('category-filter');
    
    if (productSearch) productSearch.addEventListener('input', filterProducts);
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    
    // Exportar produtos
    const exportProductsBtn = document.getElementById('export-products');
    if (exportProductsBtn) {
        exportProductsBtn.addEventListener('click', () => {
            exportData('products');
        });
    }
    
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    
    if (exportDataBtn) exportDataBtn.addEventListener('click', () => showModal('export-modal'));
    if (importDataBtn) importDataBtn.addEventListener('click', () => showModal('import-modal'));
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearAllData);
    
    // Modal de exportação
    const confirmExportBtn = document.getElementById('confirm-export');
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', exportData);
    }
    
    // Modal de importação
    const confirmImportBtn = document.getElementById('confirm-import');
    const importFile = document.getElementById('import-file');
    
    if (confirmImportBtn) confirmImportBtn.addEventListener('click', importData);
    if (importFile) {
        importFile.addEventListener('change', function() {
            const importError = document.getElementById('import-error');
            if (importError) importError.classList.add('d-none');
        });
    }
    
    // Fechar modais
    document.querySelectorAll('.modal-close, .btn[data-modal]').forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) {
                hideModal(modalId);
            }
        });
    });
    
    // Venda
    const saleProductSearch = document.getElementById('sale-product-search');
    const paymentMethod = document.getElementById('payment-method');
    const saleDiscount = document.getElementById('sale-discount');
    const cardFee = document.getElementById('card-fee');
    const completeSale = document.getElementById('complete-sale');
    const clearCartBtn = document.getElementById('clear-cart');
    
    if (saleProductSearch) saleProductSearch.addEventListener('input', filterSaleProducts);
    if (paymentMethod) paymentMethod.addEventListener('change', updatePaymentMethod);
    if (saleDiscount) saleDiscount.addEventListener('input', updateSaleSummary);
    if (cardFee) cardFee.addEventListener('input', updateSaleSummary);
    if (completeSale) completeSale.addEventListener('click', processSale);
    if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
    
    // Cliques fora do modal para fechar
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Botão de confirmação de pagamento Pix
    const confirmPixPaymentBtn = document.getElementById('confirm-pix-payment');
    if (confirmPixPaymentBtn) {
        confirmPixPaymentBtn.addEventListener('click', confirmPixPayment);
    }
    
    // Botão de impressão de recibo
    const printReceiptBtn = document.getElementById('print-receipt-btn');
    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', printReceipt);
    }
    
    // Botão para gerar PDF de relatório
    const generatePdfReportBtn = document.getElementById('generate-pdf-report');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    
    if (generatePdfReportBtn) {
        generatePdfReportBtn.addEventListener('click', () => showModal('pdf-report-modal'));
    }
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', generatePDFReport);
    }
    
    // Configurar seleção de período personalizado
    const reportPeriod = document.getElementById('report-period');
    if (reportPeriod) {
        reportPeriod.addEventListener('change', function() {
            const customDateRange = document.getElementById('custom-date-range');
            if (this.value === 'custom') {
                customDateRange.classList.remove('d-none');
            } else {
                customDateRange.classList.add('d-none');
            }
        });
    }
    
    // Botão para salvar venda editada
    const saveEditedSaleBtn = document.getElementById('save-edited-sale');
    if (saveEditedSaleBtn) {
        saveEditedSaleBtn.addEventListener('click', saveEditedSale);
    }
    
    // Event listeners para campos do modal de edição
    const editPaymentMethod = document.getElementById('edit-payment-method');
    const editSaleDiscount = document.getElementById('edit-sale-discount');
    const editCardFee = document.getElementById('edit-card-fee');
    
    if (editPaymentMethod) editPaymentMethod.addEventListener('change', updateEditPaymentMethod);
    if (editSaleDiscount) editSaleDiscount.addEventListener('input', updateEditSaleSummary);
    if (editCardFee) editCardFee.addEventListener('input', updateEditSaleSummary);
    
    // ============================================
    // EVENT LISTENERS PARA BANCO DE DADOS
    // ============================================
    
    // Forçar migração para IndexedDB
    const forceMigrationBtn = document.getElementById('force-migration');
    if (forceMigrationBtn) {
        forceMigrationBtn.addEventListener('click', async () => {
            if (confirm('Deseja migrar todos os dados do localStorage para o IndexedDB? Esta operação pode demorar alguns segundos.')) {
                showAlert('Migração em andamento...', 'info');
                
                const result = await databaseManager.migrateFromLocalStorage();
                if (result) {
                    showAlert('Migração realizada com sucesso! Recarregando dados...', 'success');
                    
                    // Recarregar dados
                    const newData = await databaseManager.getSystemData();
                    systemData = newData;
                    loadData();
                    updateDashboard();
                    updateDatabaseInfo();
                    
                } else {
                    showAlert('Erro na migração ou nenhum dado para migrar', 'error');
                }
            }
        });
    }
    
    // Limpar localStorage
    const cleanupLocalBtn = document.getElementById('cleanup-local');
    if (cleanupLocalBtn) {
        cleanupLocalBtn.addEventListener('click', async () => {
            if (confirm('Deseja limpar os dados antigos do localStorage? Isso não afetará o IndexedDB.')) {
                // Manter apenas o backup mais recente
                const currentData = localStorage.getItem('camarim-system-data');
                if (currentData) {
                    localStorage.setItem('camarim-backup-last', currentData);
                }
                
                localStorage.removeItem('camarim-system-data');
                
                showAlert('LocalStorage limpo com sucesso! Backup mantido.', 'success');
                updateDatabaseInfo();
            }
        });
    }
}

// ============================================
// 6. FUNÇÕES PARA CALCULAR VALOR DO ESTOQUE
// ============================================

function calculateInventoryValue() {
    let totalSellingValue = 0;
    let totalCostValue = 0;
    let totalProfitMargin = 0;
    let totalItems = 0;
    
    systemData.products.forEach(product => {
        const sellingValue = product.sellingPrice * product.stock;
        const costValue = product.purchaseCost * product.stock;
        const profitValue = sellingValue - costValue;
        
        totalSellingValue += sellingValue;
        totalCostValue += costValue;
        totalProfitMargin += profitValue;
        totalItems += product.stock;
    });
    
    return {
        totalSellingValue: parseFloat(totalSellingValue.toFixed(2)),
        totalCostValue: parseFloat(totalCostValue.toFixed(2)),
        totalProfitMargin: parseFloat(totalProfitMargin.toFixed(2)),
        totalItems: totalItems,
        averageMargin: totalCostValue > 0 ? 
            parseFloat(((totalProfitMargin / totalCostValue) * 100).toFixed(2)) : 0
    };
}

function updateInventorySummary() {
    const inventorySummary = document.getElementById('inventory-summary');
    if (!inventorySummary) return;
    
    const inventoryData = calculateInventoryValue();
    
    inventorySummary.innerHTML = DOMPurify.sanitize(`
        <div class="card inventory-total-card">
            <div class="card-header">
                <div class="card-icon">
                    <i class="fas fa-boxes"></i>
                </div>
                <div>
                    <h3 class="card-title">Valor Total do Estoque</h3>
                    <div class="card-value currency">${formatCurrency(inventoryData.totalSellingValue)}</div>
                    <div class="card-subtitle">${inventoryData.totalItems} itens em estoque</div>
                </div>
            </div>
        </div>
        
        <div class="card inventory-cost-card">
            <div class="card-header">
                <div class="card-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div>
                    <h3 class="card-title">Custo Total do Estoque</h3>
                    <div class="card-value currency">${formatCurrency(inventoryData.totalCostValue)}</div>
                    <div class="card-subtitle">Custo médio por item: ${formatCurrency(inventoryData.totalCostValue / (inventoryData.totalItems || 1))}</div>
                </div>
            </div>
        </div>
        
        <div class="card inventory-margin-card">
            <div class="card-header">
                <div class="card-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div>
                    <h3 class="card-title">Lucro Potencial</h3>
                    <div class="card-value currency">${formatCurrency(inventoryData.totalProfitMargin)}</div>
                    <div class="card-subtitle">Margem média: ${inventoryData.averageMargin}%</div>
                </div>
            </div>
        </div>
    `);
}

// ============================================
// 7. CÁLCULO DE PREÇO CORRETO
// ============================================

/**
 * Calcula o preço de venda final com a lógica:
 * 1. Preço base = Custo de Compra × (1 + Margem/100)
 * 2. Preço final = Preço base + CMV
 * 
 * Exemplo: Custo 6,00 + 50% = 9,00 + CMV 3,00 = 12,00
 */
function calculateSellingPrice(purchaseCost, profitMargin, cmvValue) {
    if (purchaseCost <= 0) return cmvValue;
    
    // Passo 1: Preço base com margem SOBRE O CUSTO
    const basePrice = purchaseCost * (1 + (profitMargin / 100));
    
    // Passo 2: Adiciona o CMV (valor fixo)
    const finalPrice = basePrice + cmvValue;
    
    return parseFloat(finalPrice.toFixed(2));
}

/**
 * Calcula o preço base (antes do CMV)
 */
function calculateBasePrice(purchaseCost, profitMargin) {
    if (purchaseCost <= 0) return 0;
    return parseFloat((purchaseCost * (1 + (profitMargin / 100))).toFixed(2));
}

/**
 * Calcula o lucro sobre o produto (preço final - custo total)
 */
function calculateProfit(finalPrice, purchaseCost, cmvValue) {
    const totalCost = purchaseCost + cmvValue;
    return parseFloat((finalPrice - totalCost).toFixed(2));
}

function updateProductCalculations() {
    const purchaseCost = sanitizeNumber(parseFloat(document.getElementById('purchase-cost')?.value) || 0);
    const profitMargin = sanitizeNumber(parseFloat(document.getElementById('profit-margin')?.value) || 0);
    const cmvValue = sanitizeNumber(parseFloat(document.getElementById('cmv-cost')?.value) || 0);
    
    if (purchaseCost < 0) {
        showAlert('Valores não podem ser negativos', 'error');
        return;
    }
    
    // Calcular preço base (custo + margem sobre o custo)
    const basePrice = calculateBasePrice(purchaseCost, profitMargin);
    
    // Calcular preço final (base + CMV)
    const finalPrice = calculateSellingPrice(purchaseCost, profitMargin, cmvValue);
    
    // Calcular custo total (compra + CMV)
    const totalCost = purchaseCost + cmvValue;
    
    // Calcular lucro
    const profit = calculateProfit(finalPrice, purchaseCost, cmvValue);
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    
    // Atualizar campos de cálculo
    const calcFields = {
        'calc-purchase-cost': purchaseCost,
        'calc-cmv': cmvValue,
        'calc-total-cost': totalCost,
        'calc-profit-percent': profitMargin,
        'calc-base-price': basePrice,
        'calc-profit-value': profit,
        'calc-profit-percent-total': profitPercent.toFixed(1),
        'calc-suggested-price': finalPrice
    };
    
    Object.entries(calcFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id.includes('price') || id.includes('cost') || id.includes('profit-value')) {
                element.textContent = formatCurrency(value);
            } else if (id.includes('percent')) {
                element.textContent = value;
            } else {
                element.textContent = typeof value === 'number' ? value.toFixed(2) : value;
            }
        }
    });
    
    // Se for um novo produto (não edição), preencher o campo de preço automaticamente
    const isEdit = document.getElementById('is-edit')?.value === 'true';
    const sellingPriceField = document.getElementById('selling-price');
    
    if (sellingPriceField && (!isEdit || !sellingPriceField.value || sellingPriceField.value == 0)) {
        sellingPriceField.value = finalPrice.toFixed(2);
    }
}

function generateProductId() {
    systemData.settings.lastProductId++;
    const idNumber = systemData.settings.lastProductId.toString().padStart(5, '0');
    return `CAM-${idNumber}`;
}

async function saveProduct(e) {
    e.preventDefault();
    
    const name = DOMPurify.sanitize(document.getElementById('product-name')?.value.trim() || '');
    const category = DOMPurify.sanitize(document.getElementById('product-category')?.value || '');
    const purchaseCost = sanitizeNumber(parseFloat(document.getElementById('purchase-cost')?.value || 0));
    const cmvValue = sanitizeNumber(parseFloat(document.getElementById('cmv-cost')?.value || 0));
    const profitMargin = sanitizeNumber(parseFloat(document.getElementById('profit-margin')?.value || 0));
    let sellingPrice = sanitizeNumber(parseFloat(document.getElementById('selling-price')?.value || 0));
    const stock = sanitizeNumber(parseInt(document.getElementById('initial-stock')?.value || 0));
    
    // Validações
    if (!name || name.length > 200) {
        showAlert('Nome do produto é obrigatório e deve ter no máximo 200 caracteres', 'error');
        return;
    }
    
    if (!category) {
        showAlert('Categoria do produto é obrigatória', 'error');
        return;
    }
    
    if (isNaN(purchaseCost) || purchaseCost < 0) {
        showAlert('Custo de compra deve ser um número positivo', 'error');
        return;
    }
    
    if (isNaN(cmvValue) || cmvValue < 0) {
        showAlert('CMV deve ser um número positivo', 'error');
        return;
    }
    
    if (profitMargin < 0 || profitMargin >= 100) {
        showAlert('Margem de lucro deve estar entre 0 e 99.9%', 'error');
        return;
    }
    
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
        // Se não informou preço, calcular automaticamente
        sellingPrice = calculateSellingPrice(purchaseCost, profitMargin, cmvValue);
    }
    
    if (isNaN(stock) || stock < 0) {
        showAlert('Estoque inicial deve ser um número inteiro positivo', 'error');
        return;
    }
    
    // Calcular preço base e valores derivados
    const basePrice = calculateBasePrice(purchaseCost, profitMargin);
    const suggestedPrice = calculateSellingPrice(purchaseCost, profitMargin, cmvValue);
    
    const isEdit = document.getElementById('is-edit')?.value === 'true';
    const productId = DOMPurify.sanitize(document.getElementById('product-id')?.value || '');
    
    let product;
    
    if (isEdit && productId) {
        product = systemData.products.find(p => p.id === productId);
        if (product) {
            // Atualizar produto existente
            product.name = name;
            product.category = category;
            product.purchaseCost = purchaseCost;
            product.cmv = cmvValue;
            product.profitMargin = profitMargin;
            product.basePrice = parseFloat(basePrice.toFixed(2));
            product.suggestedPrice = parseFloat(suggestedPrice.toFixed(2));
            product.sellingPrice = sellingPrice;
            product.stock = stock;
            
            showAlert(`Produto "${name}" atualizado com sucesso!`, 'success');
        }
    } else {
        // Criar novo produto
        product = {
            id: generateProductId(),
            name: name,
            category: category,
            purchaseCost: purchaseCost,
            cmv: cmvValue,
            profitMargin: profitMargin,
            basePrice: parseFloat(basePrice.toFixed(2)),
            suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
            sellingPrice: sellingPrice,
            stock: stock,
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        systemData.products.push(product);
        
        showAlert(`Produto "${name}" cadastrado com sucesso! Código: ${product.id}`, 'success');
    }
    
    await saveData();
    resetProductForm();
    updateProductsList();
    updateInventorySummary();
    
    setTimeout(() => {
        showView('products');
    }, 2000);
}

function resetProductForm() {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    
    const productId = document.getElementById('product-id');
    const isEdit = document.getElementById('is-edit');
    const submitBtn = document.getElementById('product-form-submit');
    
    if (productId) productId.value = '';
    if (isEdit) isEdit.value = 'false';
    if (submitBtn) submitBtn.textContent = 'Salvar Produto';
    
    // Valores padrão
    const defaultFields = {
        'profit-margin': 50,
        'initial-stock': 1,
        'cmv-cost': 0
    };
    
    Object.entries(defaultFields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
    });
    
    updateProductCalculations();
}

function loadProductForEdit(productId) {
    const sanitizedId = DOMPurify.sanitize(productId);
    const product = systemData.products.find(p => p.id === sanitizedId);
    if (!product) return;
    
    const productIdField = document.getElementById('product-id');
    const isEditField = document.getElementById('is-edit');
    const submitBtn = document.getElementById('product-form-submit');
    
    if (productIdField) productIdField.value = product.id;
    if (isEditField) isEditField.value = 'true';
    if (submitBtn) submitBtn.textContent = 'Atualizar Produto';
    
    // Preencher campos
    const fields = {
        'product-name': product.name,
        'product-category': product.category,
        'purchase-cost': product.purchaseCost,
        'cmv-cost': product.cmv || 0,
        'profit-margin': product.profitMargin,
        'selling-price': product.sellingPrice,
        'initial-stock': product.stock
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
    });
    
    updateProductCalculations();
    showView('new-product');
}

function updateProductsList() {
    const productsBody = document.getElementById('products-body');
    if (!productsBody) return;
    
    productsBody.innerHTML = '';
    
    systemData.products.forEach(product => {
        const sanitizedName = DOMPurify.sanitize(product.name);
        const sanitizedCategory = DOMPurify.sanitize(product.category);
        
        const row = document.createElement('tr');
        
        // Célula ID
        const idCell = document.createElement('td');
        idCell.textContent = product.id;
        row.appendChild(idCell);
        
        // Célula Nome
        const nameCell = document.createElement('td');
        nameCell.textContent = sanitizedName;
        row.appendChild(nameCell);
        
        // Célula Categoria
        const categoryCell = document.createElement('td');
        categoryCell.textContent = getCategoryName(sanitizedCategory);
        row.appendChild(categoryCell);
        
        // Célula Custo de Compra
        const purchaseCostCell = document.createElement('td');
        purchaseCostCell.className = 'currency';
        purchaseCostCell.textContent = formatCurrency(product.purchaseCost);
        row.appendChild(purchaseCostCell);
        
        // Célula CMV
        const cmvCell = document.createElement('td');
        cmvCell.className = 'currency';
        cmvCell.textContent = formatCurrency(product.cmv || 0);
        row.appendChild(cmvCell);
        
        // Célula Preço de Venda
        const sellingPriceCell = document.createElement('td');
        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'form-control selling-price-input';
        priceInput.setAttribute('data-id', product.id);
        priceInput.value = product.sellingPrice.toFixed(2);
        priceInput.step = '0.01';
        priceInput.min = '0.01';
        priceInput.style.width = '120px';
        sellingPriceCell.appendChild(priceInput);
        row.appendChild(sellingPriceCell);
        
        // Célula Estoque
        const stockCell = document.createElement('td');
        const stockBadge = document.createElement('span');
        if (product.stock < 10) {
            stockBadge.className = 'badge badge-danger';
        } else if (product.stock < 20) {
            stockBadge.className = 'badge badge-warning';
        } else {
            stockBadge.className = 'badge badge-success';
        }
        stockBadge.textContent = `${product.stock} und.`;
        stockCell.appendChild(stockBadge);
        row.appendChild(stockCell);
        
        // Célula Valor do Estoque
        const inventoryValueCell = document.createElement('td');
        const inventoryValue = product.sellingPrice * product.stock;
        inventoryValueCell.className = 'currency';
        inventoryValueCell.textContent = formatCurrency(inventoryValue);
        row.appendChild(inventoryValueCell);
        
        // Célula Ações
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        // Botão Editar
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-small btn-warning edit-product';
        editBtn.setAttribute('data-id', product.id);
        editBtn.setAttribute('title', 'Editar Produto');
        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-edit';
        editBtn.appendChild(editIcon);
        actionsCell.appendChild(editBtn);
        
        // Botão Editar Estoque
        const editStockBtn = document.createElement('button');
        editStockBtn.className = 'btn btn-small btn-info edit-stock';
        editStockBtn.setAttribute('data-id', product.id);
        editStockBtn.setAttribute('title', 'Editar Estoque');
        const editStockIcon = document.createElement('i');
        editStockIcon.className = 'fas fa-box';
        editStockBtn.appendChild(editStockIcon);
        actionsCell.appendChild(editStockBtn);
        
        // Botão Excluir
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-small btn-danger delete-product';
        deleteBtn.setAttribute('data-id', product.id);
        deleteBtn.setAttribute('title', 'Excluir Produto');
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteBtn.appendChild(deleteIcon);
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(actionsCell);
        productsBody.appendChild(row);
    });
    
    // Adicionar event listeners
    setTimeout(() => {
        document.querySelectorAll('.selling-price-input').forEach(input => {
            input.addEventListener('change', function() {
                const productId = DOMPurify.sanitize(this.getAttribute('data-id'));
                const newPrice = sanitizeNumber(parseFloat(this.value));
                updateProductPrice(productId, newPrice);
            });
        });
        
        document.querySelectorAll('.edit-product').forEach(button => {
            button.addEventListener('click', function() {
                const productId = DOMPurify.sanitize(this.getAttribute('data-id'));
                loadProductForEdit(productId);
            });
        });
        
        document.querySelectorAll('.edit-stock').forEach(button => {
            button.addEventListener('click', function() {
                const productId = DOMPurify.sanitize(this.getAttribute('data-id'));
                const product = systemData.products.find(p => p.id === productId);
                if (product) {
                    const sanitizedName = DOMPurify.sanitize(product.name);
                    const newStock = prompt(`Digite a nova quantidade em estoque para "${sanitizedName}":`, product.stock);
                    if (newStock !== null && !isNaN(parseInt(newStock)) && parseInt(newStock) >= 0) {
                        updateProductStock(productId, sanitizeNumber(parseInt(newStock)));
                    }
                }
            });
        });
        
        document.querySelectorAll('.delete-product').forEach(button => {
            button.addEventListener('click', function() {
                const productId = DOMPurify.sanitize(this.getAttribute('data-id'));
                confirmDeleteProduct(productId);
            });
        });
    }, 100);
    
    // Atualizar contador no dashboard
    const totalProducts = document.getElementById('total-products');
    if (totalProducts) {
        totalProducts.textContent = systemData.products.length;
    }
    
    // Atualizar resumo do estoque
    updateInventorySummary();
}

async function updateProductStock(productId, newStock) {
    const sanitizedId = DOMPurify.sanitize(productId);
    const product = systemData.products.find(p => p.id === sanitizedId);
    if (product && !isNaN(newStock) && newStock >= 0) {
        product.stock = newStock;
        await saveData();
        showAlert(`Estoque do produto atualizado para ${newStock} unidades`, 'success');
        updateProductsList();
        updateInventorySummary();
    } else {
        showAlert('Quantidade de estoque inválida. Deve ser um número inteiro não-negativo.', 'error');
    }
}

function filterProducts() {
    const searchInput = document.getElementById('product-search');
    const categoryFilter = document.getElementById('category-filter');
    
    if (!searchInput || !categoryFilter) return;
    
    const searchTerm = DOMPurify.sanitize(searchInput.value.toLowerCase());
    const categoryValue = categoryFilter.value;
    
    const rows = document.querySelectorAll('#products-body tr');
    let visibleItems = 0;
    let visibleInventoryValue = 0;
    
    rows.forEach(row => {
        const productName = row.cells[1]?.textContent.toLowerCase() || '';
        const productCode = row.cells[0]?.textContent.toLowerCase() || '';
        const productCategory = row.cells[2]?.textContent || '';
        const inventoryValueText = row.cells[7]?.textContent || '0,00';
        
        const matchesSearch = productName.includes(searchTerm) || productCode.includes(searchTerm);
        const matchesCategory = !categoryValue || productCategory === getCategoryName(categoryValue);
        
        const isVisible = matchesSearch && matchesCategory;
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) {
            visibleItems++;
            const value = parseFloat(inventoryValueText.replace('R$ ', '').replace('.', '').replace(',', '.'));
            if (!isNaN(value)) {
                visibleInventoryValue += value;
            }
        }
    });
    
    updateFilteredInventorySummary(visibleItems, visibleInventoryValue);
}

function updateFilteredInventorySummary(visibleItems, visibleInventoryValue) {
    const inventorySummary = document.getElementById('inventory-summary');
    if (!inventorySummary) return;
    
    const cards = inventorySummary.querySelectorAll('.card');
    if (cards.length < 1) return;
    
    const totalCard = cards[0];
    const totalValueElement = totalCard.querySelector('.card-value');
    const totalSubtitleElement = totalCard.querySelector('.card-subtitle');
    
    if (totalValueElement) {
        totalValueElement.textContent = formatCurrency(visibleInventoryValue);
    }
    
    if (totalSubtitleElement) {
        const searchInput = document.getElementById('product-search');
        const categoryFilter = document.getElementById('category-filter');
        
        let filterInfo = '';
        if (searchInput && searchInput.value) {
            filterInfo += `Filtro: "${searchInput.value}"`;
        }
        if (categoryFilter && categoryFilter.value) {
            if (filterInfo) filterInfo += ' | ';
            filterInfo += `Categoria: ${categoryFilter.options[categoryFilter.selectedIndex].text}`;
        }
        
        totalSubtitleElement.textContent = filterInfo ? 
            `${visibleItems} itens (${filterInfo})` : 
            `${visibleItems} itens em estoque`;
    }
}

async function updateProductPrice(productId, newPrice) {
    const sanitizedId = DOMPurify.sanitize(productId);
    const product = systemData.products.find(p => p.id === sanitizedId);
    if (product && !isNaN(newPrice) && newPrice > 0) {
        product.sellingPrice = newPrice;
        await saveData();
        showAlert(`Preço do produto atualizado para ${formatCurrency(newPrice)}`, 'success');
        updateProductsList();
        updateInventorySummary();
    } else {
        showAlert('Preço inválido. Deve ser um número positivo maior que zero.', 'error');
    }
}

function confirmDeleteProduct(productId) {
    const sanitizedId = DOMPurify.sanitize(productId);
    const product = systemData.products.find(p => p.id === sanitizedId);
    if (product) {
        appState.currentProductId = sanitizedId;
        
        const deleteMessage = document.getElementById('delete-message');
        if (deleteMessage) {
            deleteMessage.textContent = 
                DOMPurify.sanitize(`Tem certeza que deseja excluir o produto "${product.name}" (${product.id})? Esta ação não pode ser desfeita.`);
        }
        
        showModal('delete-modal');
        
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.onclick = async function() {
                await deleteProduct(sanitizedId);
                hideModal('delete-modal');
            };
        }
    }
}

async function deleteProduct(productId) {
    const sanitizedId = DOMPurify.sanitize(productId);
    const productIndex = systemData.products.findIndex(p => p.id === sanitizedId);
    
    if (productIndex !== -1) {
        systemData.products.splice(productIndex, 1);
        await saveData();
        updateProductsList();
        updateDashboard();
        updateInventorySummary();
        showAlert('Produto excluído com sucesso', 'success');
    }
}

// ============================================
// 8. SISTEMA DE VENDAS COM ATENDENTE
// ============================================

function updatePaymentMethod() {
    const paymentMethod = document.getElementById('payment-method');
    const cardFeeContainer = document.getElementById('card-fee-container');
    const cardFeeInfo = document.getElementById('card-fee-info');
    const cardFee = document.getElementById('card-fee');
    
    if (!paymentMethod || !cardFeeContainer) return;
    
    const method = paymentMethod.value;
    
    if (method === 'debit') {
        cardFeeContainer.classList.remove('d-none');
        if (cardFeeInfo) {
            cardFeeInfo.textContent = `Taxa para cartão de débito: ${sanitizeNumber(systemData.settings.defaultDebitFee)}%`;
        }
        if (cardFee) {
            cardFee.value = sanitizeNumber(systemData.settings.defaultDebitFee);
        }
    } else if (method === 'credit') {
        cardFeeContainer.classList.remove('d-none');
        if (cardFeeInfo) {
            cardFeeInfo.textContent = `Taxa para cartão de crédito: ${sanitizeNumber(systemData.settings.defaultCreditFee)}%`;
        }
        if (cardFee) {
            cardFee.value = sanitizeNumber(systemData.settings.defaultCreditFee);
        }
    } else if (method === 'cash' || method === 'pix') {
        cardFeeContainer.classList.add('d-none');
    }
    
    updateSaleSummary();
}

function updateEditPaymentMethod() {
    const paymentMethod = document.getElementById('edit-payment-method');
    const cardFeeContainer = document.getElementById('edit-card-fee-container');
    const cardFeeInfo = document.getElementById('edit-card-fee-info');
    const cardFee = document.getElementById('edit-card-fee');
    
    if (!paymentMethod || !cardFeeContainer) return;
    
    const method = paymentMethod.value;
    
    if (method === 'debit') {
        cardFeeContainer.classList.remove('d-none');
        if (cardFeeInfo) {
            cardFeeInfo.textContent = `Taxa para cartão de débito: ${sanitizeNumber(systemData.settings.defaultDebitFee)}%`;
        }
        if (cardFee) {
            cardFee.value = sanitizeNumber(systemData.settings.defaultDebitFee);
        }
    } else if (method === 'credit') {
        cardFeeContainer.classList.remove('d-none');
        if (cardFeeInfo) {
            cardFeeInfo.textContent = `Taxa para cartão de crédito: ${sanitizeNumber(systemData.settings.defaultCreditFee)}%`;
        }
        if (cardFee) {
            cardFee.value = sanitizeNumber(systemData.settings.defaultCreditFee);
        }
    } else if (method === 'cash' || method === 'pix') {
        cardFeeContainer.classList.add('d-none');
    }
    
    updateEditSaleSummary();
}

async function processSale() {
    if (appState.cart.length === 0) {
        showAlert('Adicione produtos ao carrinho antes de finalizar a venda', 'error');
        return;
    }
    
    const attendantInput = document.getElementById('attendant');
    if (!attendantInput) {
        showAlert('Campo atendente não encontrado', 'error');
        return;
    }
    
    const attendant = DOMPurify.sanitize(attendantInput.value.trim());
    
    if (!attendant) {
        showAlert('Selecione o atendente', 'error');
        return;
    }
    
    if (attendant.length > 100) {
        showAlert('Nome do atendente muito longo. Máximo 100 caracteres.', 'error');
        return;
    }
    
    let subtotal = 0;
    appState.cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const discountInput = document.getElementById('sale-discount');
    const discount = discountInput ? sanitizeNumber(parseFloat(discountInput.value) || 0) : 0;
    
    const paymentMethod = document.getElementById('payment-method');
    const method = paymentMethod ? paymentMethod.value : 'cash';
    
    let cardFee = 0;
    let cardType = "";
    
    if (method === 'debit' || method === 'credit') {
        const cardFeeInput = document.getElementById('card-fee');
        cardFee = cardFeeInput ? sanitizeNumber(parseFloat(cardFeeInput.value) || 0) : 0;
        cardType = method;
    }
    
    const fees = (method === 'debit' || method === 'credit') ? 
        (subtotal - discount) * (cardFee / 100) : 0;
    const total = subtotal - discount + fees;
    
    for (const item of appState.cart) {
        const product = systemData.products.find(p => p.id === item.productId);
        if (!product || product.stock < item.quantity) {
            showAlert(`Estoque insuficiente para ${DOMPurify.sanitize(item.name)} (Disponível: ${product ? product.stock : 0})`, 'error');
            return;
        }
    }
    
    systemData.settings.lastSaleId++;
    const saleId = `SALE-${systemData.settings.lastSaleId.toString().padStart(3, '0')}`;
    
    const sale = {
        id: saleId,
        date: new Date().toISOString(),
        items: appState.cart.map(item => ({
            productId: item.productId,
            name: DOMPurify.sanitize(item.name),
            quantity: item.quantity,
            price: item.price
        })),
        subtotal: subtotal,
        discount: discount,
        paymentMethod: method,
        cardType: cardType,
        cardFee: cardFee,
        fees: fees,
        total: total,
        attendant: attendant
    };
    
    appState.currentSaleData = sale;
    
    if (method === 'pix') {
        showPixPayment(sale);
    } else {
        await confirmSale(sale);
    }
}

async function confirmSale(sale) {
    try {
        // Atualizar estoque dos produtos
        appState.cart.forEach(item => {
            const product = systemData.products.find(p => p.id === item.productId);
            if (product) {
                product.stock -= item.quantity;
            }
        });
        
        // Adicionar venda ao histórico
        systemData.sales.push(sale);
        
        // Salvar dados
        await saveData();
        
        // Limpar carrinho
        appState.cart = [];
        const attendantInput = document.getElementById('attendant');
        if (attendantInput) attendantInput.value = '';
        
        // Mostrar recibo
        showReceipt(sale);
        
        // Atualizar views
        updateDashboard();
        updateMonthlySalesChart();
        updateProductsList();
        updateInventorySummary();
        updateSaleProductsList();
        updateCartDisplay();
        updateSaleSummary();
        
        showAlert(`Venda ${sale.id} finalizada com sucesso! Total: ${formatCurrency(sale.total)}`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao confirmar venda:', error);
        showAlert('Erro ao salvar a venda. Tente novamente.', 'error');
    }
}

// ============================================
// 9. FUNÇÕES PARA EDIÇÃO DE VENDAS
// ============================================

function editSale(saleId) {
    const sanitizedId = DOMPurify.sanitize(saleId);
    const sale = systemData.sales.find(s => s.id === sanitizedId);
    
    if (!sale) {
        showAlert('Venda não encontrada', 'error');
        return;
    }
    
    // Salvar dados originais
    editingSaleData.saleId = sanitizedId;
    editingSaleData.originalSale = JSON.parse(JSON.stringify(sale));
    
    // Converter itens da venda para o formato do carrinho
    editingSaleData.cart = sale.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
    }));
    
    editingSaleData.originalCart = JSON.parse(JSON.stringify(editingSaleData.cart));
    
    // Preencher modal de edição
    populateEditSaleModal(sale);
    showModal('edit-sale-modal');
}

function populateEditSaleModal(sale) {
    // Preencher campos do formulário
    const attendantSelect = document.getElementById('edit-attendant');
    if (attendantSelect) {
        attendantSelect.value = sale.attendant || '';
    }
    
    const discountInput = document.getElementById('edit-sale-discount');
    if (discountInput) {
        discountInput.value = sale.discount || 0;
    }
    
    const paymentMethodSelect = document.getElementById('edit-payment-method');
    if (paymentMethodSelect) {
        paymentMethodSelect.value = sale.paymentMethod || 'cash';
    }
    
    const cardFeeInput = document.getElementById('edit-card-fee');
    if (cardFeeInput && sale.cardFee) {
        cardFeeInput.value = sale.cardFee;
    }
    
    // Atualizar lista de produtos e carrinho
    updateEditSaleProductsList();
    updateEditCartDisplay();
    updateEditPaymentMethod();
    updateEditSaleSummary();
}

function updateEditSaleProductsList() {
    const container = document.getElementById('edit-sale-products-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    systemData.products.forEach(product => {
        const sanitizedName = DOMPurify.sanitize(product.name);
        const existingItem = editingSaleData.cart.find(item => item.productId === product.id);
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        
        // Calcular estoque disponível (considerando itens já no carrinho)
        const availableStock = product.stock + currentQuantity;
        
        const productElement = document.createElement('div');
        productElement.className = 'cart-item';
        productElement.innerHTML = `
            <div class="cart-item-info">
                <h4>${sanitizedName}</h4>
                <div class="code">${product.id} | Estoque: ${availableStock}</div>
                <div class="currency" style="font-weight: 600; margin-top: 5px;">${formatCurrency(product.sellingPrice)}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn edit-minus" data-id="${DOMPurify.sanitize(product.id)}" type="button">-</button>
                <span id="edit-cart-qty-${DOMPurify.sanitize(product.id)}">${currentQuantity}</span>
                <button class="quantity-btn edit-plus" data-id="${DOMPurify.sanitize(product.id)}" type="button">+</button>
                <button class="btn btn-small btn-success edit-add-to-cart" data-id="${DOMPurify.sanitize(product.id)}" type="button" style="margin-left: 10px;">
                    <i class="fas fa-cart-plus"></i> Adicionar
                </button>
            </div>
        `;
        container.appendChild(productElement);
    });
    
    // Adicionar event listeners usando event delegation
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    // Adiciona um único event listener no container
    document.getElementById('edit-sale-products-list').addEventListener('click', function(e) {
        const target = e.target;
        const button = target.closest('button');
        
        if (!button) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const productId = DOMPurify.sanitize(button.getAttribute('data-id'));
        if (!productId) return;
        
        const qtySpan = document.getElementById(`edit-cart-qty-${productId}`);
        if (!qtySpan) return;
        
        let currentQty = parseInt(qtySpan.textContent) || 0;
        const product = systemData.products.find(p => p.id === productId);
        
        // Botão "+"
        if (button.classList.contains('edit-plus') && product) {
            // Verificar estoque disponível (considerando itens já no carrinho)
            const cartItem = editingSaleData.cart.find(item => item.productId === productId);
            const currentCartQty = cartItem ? cartItem.quantity : 0;
            const availableStock = product.stock + currentCartQty;
            
            if (currentQty < availableStock) {
                currentQty++;
                qtySpan.textContent = currentQty;
            }
        }
        // Botão "-"
        else if (button.classList.contains('edit-minus')) {
            if (currentQty > 0) {
                currentQty--;
                qtySpan.textContent = currentQty;
            }
        }
        // Botão "Adicionar"
        else if (button.classList.contains('edit-add-to-cart')) {
            const quantity = currentQty;
            if (quantity > 0) {
                editAddToCart(productId, quantity);
                qtySpan.textContent = '0';
            }
        }
    });
    
    // Filtro de busca (manter separado)
    const searchInput = document.getElementById('edit-sale-product-search');
    if (searchInput) {
        searchInput.oninput = filterEditSaleProducts;
    }
}

function filterEditSaleProducts() {
    const searchInput = document.getElementById('edit-sale-product-search');
    if (!searchInput) return;
    
    const searchTerm = DOMPurify.sanitize(searchInput.value.toLowerCase());
    const products = document.querySelectorAll('#edit-sale-products-list .cart-item');
    
    products.forEach(product => {
        const productName = product.querySelector('.cart-item-info h4')?.textContent.toLowerCase() || '';
        const productCode = product.querySelector('.code')?.textContent.toLowerCase() || '';
        
        const isVisible = productName.includes(searchTerm) || productCode.includes(searchTerm);
        product.style.display = isVisible ? '' : 'none';
    });
}

function editAddToCart(productId, quantity) {
    const product = systemData.products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItemIndex = editingSaleData.cart.findIndex(item => item.productId === productId);
    
    if (existingItemIndex !== -1) {
        const newQty = editingSaleData.cart[existingItemIndex].quantity + quantity;
        editingSaleData.cart[existingItemIndex].quantity = newQty;
    } else {
        editingSaleData.cart.push({
            productId: productId,
            name: DOMPurify.sanitize(product.name),
            price: product.sellingPrice,
            quantity: quantity
        });
    }
    
    updateEditCartDisplay();
    updateEditSaleSummary();
    updateEditSaleProductsList(); // Atualizar lista para mostrar estoque atualizado
}

function updateEditCartDisplay() {
    const cartContainer = document.getElementById('edit-sale-cart');
    const emptyMessage = document.getElementById('edit-empty-cart-message');
    
    if (!cartContainer || !emptyMessage) return;
    
    if (editingSaleData.cart.length === 0) {
        cartContainer.innerHTML = '';
        emptyMessage.classList.remove('d-none');
        return;
    }
    
    emptyMessage.classList.add('d-none');
    
    let cartHTML = '<h4 style="margin-bottom: 15px;">Produtos na Venda</h4>';
    
    editingSaleData.cart.forEach((item, index) => {
        const product = systemData.products.find(p => p.id === item.productId);
        const subtotal = item.price * item.quantity;
        
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${DOMPurify.sanitize(item.name)}</h4>
                    <div class="code">${item.productId}</div>
                    <div class="currency">${formatCurrency(item.price)} cada</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn edit-minus-cart" data-index="${index}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn edit-plus-cart" data-index="${index}">+</button>
                    <button class="btn btn-small btn-danger edit-remove-from-cart" data-index="${index}" style="margin-left: 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="text-right" style="min-width: 100px;">
                    <strong class="currency">${formatCurrency(subtotal)}</strong>
                </div>
            </div>
        `;
    });
    
    cartContainer.innerHTML = DOMPurify.sanitize(cartHTML);
    
    // Adicionar event listeners para os botões do carrinho
    setTimeout(() => {
        document.querySelectorAll('.edit-plus-cart').forEach(button => {
            button.addEventListener('click', function() {
                const index = sanitizeNumber(parseInt(this.getAttribute('data-index')));
                editUpdateCartItemQuantity(index, 1);
            });
        });
        
        document.querySelectorAll('.edit-minus-cart').forEach(button => {
            button.addEventListener('click', function() {
                const index = sanitizeNumber(parseInt(this.getAttribute('data-index')));
                editUpdateCartItemQuantity(index, -1);
            });
        });
        
        document.querySelectorAll('.edit-remove-from-cart').forEach(button => {
            button.addEventListener('click', function() {
                const index = sanitizeNumber(parseInt(this.getAttribute('data-index')));
                editRemoveFromCart(index);
            });
        });
    }, 100);
}

function editUpdateCartItemQuantity(index, change) {
    if (index < 0 || index >= editingSaleData.cart.length) return;
    
    const item = editingSaleData.cart[index];
    const product = systemData.products.find(p => p.id === item.productId);
    if (!product) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        editRemoveFromCart(index);
        return;
    }
    
    // Verificar estoque disponível (considerando itens já no carrinho)
    const cartItem = editingSaleData.cart.find(cartItem => cartItem.productId === item.productId);
    const currentCartQty = cartItem ? cartItem.quantity : 0;
    const availableStock = product.stock + currentCartQty;
    
    if (newQuantity > availableStock) {
        showAlert(`Estoque insuficiente! Disponível: ${availableStock}`, 'error');
        return;
    }
    
    item.quantity = newQuantity;
    updateEditCartDisplay();
    updateEditSaleSummary();
    updateEditSaleProductsList();
}

function editRemoveFromCart(index) {
    if (index >= 0 && index < editingSaleData.cart.length) {
        editingSaleData.cart.splice(index, 1);
        updateEditCartDisplay();
        updateEditSaleSummary();
        updateEditSaleProductsList();
    }
}

function updateEditSaleSummary() {
    const cartSubtotal = document.getElementById('edit-cart-subtotal');
    const cartDiscount = document.getElementById('edit-cart-discount');
    const cartTotal = document.getElementById('edit-cart-total');
    
    if (!cartSubtotal || !cartDiscount || !cartTotal) return;
    
    let subtotal = 0;
    editingSaleData.cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const discountInput = document.getElementById('edit-sale-discount');
    const discount = discountInput ? sanitizeNumber(parseFloat(discountInput.value) || 0) : 0;
    
    const paymentMethod = document.getElementById('edit-payment-method');
    const method = paymentMethod ? paymentMethod.value : 'cash';
    
    let fees = 0;
    
    if (method === 'debit' || method === 'credit') {
        const cardFeeInput = document.getElementById('edit-card-fee');
        const cardFee = cardFeeInput ? sanitizeNumber(parseFloat(cardFeeInput.value) || 0) : 0;
        fees = (subtotal - discount) * (cardFee / 100);
        
        const cartFeesRow = document.getElementById('edit-cart-fees-row');
        const cartFees = document.getElementById('edit-cart-fees');
        if (cartFeesRow) cartFeesRow.classList.remove('d-none');
        if (cartFees) cartFees.textContent = formatCurrency(fees);
    } else {
        const cartFeesRow = document.getElementById('edit-cart-fees-row');
        if (cartFeesRow) cartFeesRow.classList.add('d-none');
    }
    
    const total = subtotal - discount + fees;
    
    cartSubtotal.textContent = formatCurrency(subtotal);
    cartDiscount.textContent = formatCurrency(discount);
    cartTotal.textContent = formatCurrency(total);
}

async function saveEditedSale() {
    if (editingSaleData.cart.length === 0) {
        showAlert('Adicione produtos à venda antes de salvar', 'error');
        return;
    }
    
    const attendantInput = document.getElementById('edit-attendant');
    if (!attendantInput) {
        showAlert('Campo atendente não encontrado', 'error');
        return;
    }
    
    const attendant = DOMPurify.sanitize(attendantInput.value.trim());
    
    if (!attendant) {
        showAlert('Selecione o atendente', 'error');
        return;
    }
    
    if (attendant.length > 100) {
        showAlert('Nome do atendente muito longo. Máximo 100 caracteres.', 'error');
        return;
    }
    
    let subtotal = 0;
    editingSaleData.cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const discountInput = document.getElementById('edit-sale-discount');
    const discount = discountInput ? sanitizeNumber(parseFloat(discountInput.value) || 0) : 0;
    
    const paymentMethod = document.getElementById('edit-payment-method');
    const method = paymentMethod ? paymentMethod.value : 'cash';
    
    let cardFee = 0;
    let cardType = "";
    
    if (method === 'debit' || method === 'credit') {
        const cardFeeInput = document.getElementById('edit-card-fee');
        cardFee = cardFeeInput ? sanitizeNumber(parseFloat(cardFeeInput.value) || 0) : 0;
        cardType = method;
    }
    
    const fees = (method === 'debit' || method === 'credit') ? 
        (subtotal - discount) * (cardFee / 100) : 0;
    const total = subtotal - discount + fees;
    
    // Verificar estoque para todos os produtos
    for (const item of editingSaleData.cart) {
        const product = systemData.products.find(p => p.id === item.productId);
        if (!product) {
            showAlert(`Produto ${DOMPurify.sanitize(item.name)} não encontrado`, 'error');
            return;
        }
        
        // Encontrar quantidade original deste produto na venda
        const originalItem = editingSaleData.originalCart.find(oi => oi.productId === item.productId);
        const originalQuantity = originalItem ? originalItem.quantity : 0;
        
        // Calcular diferença de quantidade
        const quantityDifference = item.quantity - originalQuantity;
        
        // Verificar se há estoque suficiente para a diferença
        if (product.stock < quantityDifference) {
            const availableForIncrease = product.stock + originalQuantity;
            showAlert(`Estoque insuficiente para ${DOMPurify.sanitize(item.name)}. Disponível para aumento: ${availableForIncrease}`, 'error');
            return;
        }
    }
    
    try {
        // 1. Restaurar estoque dos produtos originais
        editingSaleData.originalCart.forEach(originalItem => {
            const product = systemData.products.find(p => p.id === originalItem.productId);
            if (product) {
                product.stock += originalItem.quantity;
            }
        });
        
        // 2. Reduzir estoque dos novos produtos
        editingSaleData.cart.forEach(item => {
            const product = systemData.products.find(p => p.id === item.productId);
            if (product) {
                product.stock -= item.quantity;
            }
        });
        
        // 3. Atualizar a venda no sistema
        const saleIndex = systemData.sales.findIndex(s => s.id === editingSaleData.saleId);
        if (saleIndex !== -1) {
            systemData.sales[saleIndex] = {
                id: editingSaleData.saleId,
                date: editingSaleData.originalSale.date, // Manter a data original
                items: editingSaleData.cart.map(item => ({
                    productId: item.productId,
                    name: DOMPurify.sanitize(item.name),
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: subtotal,
                discount: discount,
                paymentMethod: method,
                cardType: cardType,
                cardFee: cardFee,
                fees: fees,
                total: total,
                attendant: attendant
            };
        }
        
        // 4. Salvar dados
        await saveData();
        
        // 5. Limpar dados de edição
        editingSaleData = {
            saleId: null,
            originalSale: null,
            cart: [],
            originalCart: []
        };
        
        // 6. Fechar modal
        hideModal('edit-sale-modal');
        
        // 7. Atualizar views
        updateSalesList();
        updateDashboard();
        updateProductsList();
        updateInventorySummary();
        
        showAlert('Venda atualizada com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar venda editada:', error);
        showAlert('Erro ao salvar as alterações. Tente novamente.', 'error');
    }
}

// ============================================
// 10. SISTEMA DE RECIBOS E IMPRESSÃO
// ============================================

function showReceipt(sale) {
    const modalContent = document.getElementById('receipt-content');
    if (!modalContent) return;
    
    const saleDate = new Date(sale.date);
    
    const sanitizedId = DOMPurify.sanitize(sale.id);
    const sanitizedAttendant = DOMPurify.sanitize(sale.attendant);
    
    let receiptHTML = `
        <div class="receipt-header">
            <h2 style="margin-bottom: 5px;">CAMARIM BOUTIQUE</h2>
            <p style="margin-bottom: 5px;">Sistema de Gestão</p>
            <p>CNPJ: 12.345.678/0001-99</p>
            <p>${saleDate.toLocaleDateString('pt-BR')} ${saleDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <p><strong>Venda:</strong> ${sanitizedId}</p>
            <p><strong>Atendente:</strong> ${sanitizedAttendant}</p>
        </div>
        
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 15px;">
    `;
    
    sale.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const sanitizedName = DOMPurify.sanitize(item.name);
        receiptHTML += `
            <div class="receipt-item">
                <div style="flex: 1;">
                    <div>${sanitizedName}</div>
                    <div style="font-size: 0.9em;">${item.quantity} x ${formatCurrency(item.price)}</div>
                </div>
                <div>${formatCurrency(itemTotal)}</div>
            </div>
        `;
    });
    
    receiptHTML += `
        </div>
        
        <div style="margin-bottom: 15px;">
            <div class="receipt-item">
                <span>Subtotal:</span>
                <span>${formatCurrency(sale.subtotal)}</span>
            </div>
    `;
    
    if (sale.discount > 0) {
        receiptHTML += `
            <div class="receipt-item">
                <span>Desconto:</span>
                <span>- ${formatCurrency(sale.discount)}</span>
            </div>
        `;
    }
    
    if (sale.fees > 0) {
        const feeType = sale.cardType === 'debit' ? 'Taxa Débito' : 'Taxa Crédito';
        receiptHTML += `
            <div class="receipt-item">
                <span>${feeType} (${sale.cardFee}%):</span>
                <span>${formatCurrency(sale.fees)}</span>
            </div>
        `;
    }
    
    let paymentMethodText = '';
    switch(sale.paymentMethod) {
        case 'cash':
            paymentMethodText = 'Dinheiro';
            break;
        case 'pix':
            paymentMethodText = 'Pix';
            break;
        case 'debit':
            paymentMethodText = 'Cartão de Débito';
            break;
        case 'credit':
            paymentMethodText = 'Cartão de Crédito';
            break;
        default:
            paymentMethodText = DOMPurify.sanitize(sale.paymentMethod);
    }
    
    receiptHTML += `
            <div class="receipt-item receipt-total">
                <span>TOTAL:</span>
                <span>${formatCurrency(sale.total)}</span>
            </div>
            
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #000;">
                <p><strong>Forma de Pagamento:</strong> ${paymentMethodText}</p>
            </div>
        </div>
        
        <div class="receipt-footer">
            <p>**************************************</p>
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre!</p>
            <p>Instagram:@camarim</p>
            <p>**************************************</p>
        </div>
    `;
    
    modalContent.innerHTML = DOMPurify.sanitize(receiptHTML);
    showModal('receipt-modal');
}

function printReceipt() {
    const receiptContent = document.getElementById('receipt-content').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recibo - Camarim Boutique</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 0;
                    padding: 10px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .receipt-header {
                    text-align: center;
                    margin-bottom: 15px;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                }
                .receipt-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .receipt-total {
                    border-top: 2px solid #000;
                    margin-top: 10px;
                    padding-top: 10px;
                    font-weight: bold;
                }
                .receipt-footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 0.9em;
                    color: #666;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${receiptContent}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 500);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================
// 11. SISTEMA DE RELATÓRIOS EM PDF (VERSÃO SIMPLIFICADA)
// ============================================

function generatePDFReport() {
    const reportType = document.getElementById('report-type').value;
    const reportPeriod = document.getElementById('report-period').value;
    const reportTitle = document.getElementById('report-title').value || getDefaultReportTitle(reportType, reportPeriod);
    const includeCharts = document.getElementById('include-charts').value === 'yes';
    const includeTables = document.getElementById('include-tables').value === 'yes';
    const reportFormat = document.getElementById('report-format').value;
    const reportOrientation = document.getElementById('report-orientation').value;
    
    // Determinar período
    const period = getReportPeriod(reportPeriod);
    
    showAlert('Gerando relatório... Isso pode levar alguns segundos.', 'info');
    
    setTimeout(() => {
        // Gerar relatório com base no tipo
        generateSalesReport(reportTitle, period, includeCharts, includeTables, reportFormat, reportOrientation);
        
        hideModal('pdf-report-modal');
    }, 100);
}

function getDefaultReportTitle(type, period) {
    const typeNames = {
        'sales': 'Relatório de Vendas',
        'products': 'Relatório de Produtos',
        'financial': 'Relatório Financeiro',
        'inventory': 'Relatório de Estoque'
    };
    
    const periodNames = {
        'today': 'Hoje',
        'yesterday': 'Ontem',
        'last7': 'Últimos 7 Dias',
        'last30': 'Últimos 30 Dias',
        'thisMonth': 'Este Mês',
        'lastMonth': 'Mês Anterior',
        'thisYear': 'Este Ano',
        'custom': 'Período Personalizado'
    };
    
    return `${typeNames[type]} - ${periodNames[period]}`;
}

function getReportPeriod(period) {
    const now = new Date();
    let startDate, endDate;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
        case 'last7':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
        case 'last30':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
        case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            const startInput = document.getElementById('start-date').value;
            const endInput = document.getElementById('end-date').value;
            startDate = startInput ? new Date(startInput + 'T00:00:00') : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = endInput ? new Date(endInput + 'T23:59:59') : now;
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = now;
    }
    
    return { startDate, endDate };
}

async function generateSalesReport(title, period, includeCharts, includeTables, format, orientation) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('Biblioteca jsPDF não carregada');
        }
        
        const pageSize = format === 'A3' ? 'a3' : format === 'letter' ? 'letter' : 'a4';
        const isLandscape = orientation === 'landscape';
        
        const doc = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: pageSize
        });
        
        // Filtrar vendas no período
        const filteredSales = systemData.sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= period.startDate && saleDate <= period.endDate;
        });
        
        // Calcular métricas
        const metrics = calculateSalesMetrics(filteredSales);
        
        // Capa
        doc.setFontSize(16);
        doc.text('CAMARIM BOUTIQUE', 105, 50, { align: 'center' });
        doc.setFontSize(12);
        doc.text('Sistema de Gestão Comercial', 105, 65, { align: 'center' });
        doc.setFontSize(14);
        doc.text(title, 105, 95, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Período: ${period.startDate.toLocaleDateString('pt-BR')} a ${period.endDate.toLocaleDateString('pt-BR')}`, 105, 115, { align: 'center' });
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 130, { align: 'center' });
        
        // Resumo
        doc.addPage();
        doc.setFontSize(14);
        doc.text('RESUMO EXECUTIVO', 105, 30, { align: 'center' });
        
        doc.setFontSize(10);
        let yPos = 50;
        doc.text(`Total de vendas: ${metrics.totalSales}`, 20, yPos);
        yPos += 10;
        doc.text(`Receita total: R$ ${formatCurrency(metrics.totalRevenue)}`, 20, yPos);
        yPos += 10;
        doc.text(`Ticket médio: R$ ${formatCurrency(metrics.averageTicket)}`, 20, yPos);
        
        // Salvar PDF
        const fileName = `relatorio_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
        
        showAlert(`Relatório "${fileName}" gerado com sucesso!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error);
        showAlert('Erro ao gerar relatório: ' + error.message, 'error');
    }
}

function calculateSalesMetrics(sales) {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
    
    return {
        totalSales: sales.length,
        totalRevenue,
        averageTicket
    };
}

// ============================================
// 12. FUNÇÕES DE APOIO PARA VENDAS
// ============================================

function setupNewSale() {
    updateSaleProductsList();
    updateCartDisplay();
    updateSaleSummary();
    updatePaymentMethod();
}

function updateSaleProductsList() {
    const container = document.getElementById('sale-products-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    systemData.products.forEach(product => {
        if (product.stock > 0) {
            const sanitizedName = DOMPurify.sanitize(product.name);
            const productElement = document.createElement('div');
            productElement.className = 'cart-item';
            productElement.innerHTML = `
                <div class="cart-item-info">
                    <h4>${sanitizedName}</h4>
                    <div class="code">${product.id} | Estoque: ${product.stock}</div>
                    <div class="currency" style="font-weight: 600; margin-top: 5px;">${formatCurrency(product.sellingPrice)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus" data-id="${DOMPurify.sanitize(product.id)}" type="button">-</button>
                    <span id="cart-qty-${DOMPurify.sanitize(product.id)}">0</span>
                    <button class="quantity-btn plus" data-id="${DOMPurify.sanitize(product.id)}" type="button">+</button>
                    <button class="btn btn-small btn-success add-to-cart" data-id="${DOMPurify.sanitize(product.id)}" type="button" style="margin-left: 10px;">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            `;
            container.appendChild(productElement);
        }
    });
    
    // Adicionar event listeners usando event delegation
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    document.getElementById('sale-products-list').addEventListener('click', function(e) {
        const target = e.target;
        const button = target.closest('button');
        
        if (!button) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const productId = DOMPurify.sanitize(button.getAttribute('data-id'));
        if (!productId) return;
        
        const qtySpan = document.getElementById(`cart-qty-${productId}`);
        if (!qtySpan) return;
        
        let currentQty = parseInt(qtySpan.textContent) || 0;
        const product = systemData.products.find(p => p.id === productId);
        
        if (button.classList.contains('plus') && product) {
            if (currentQty < product.stock) {
                currentQty++;
                qtySpan.textContent = currentQty;
            }
        }
        else if (button.classList.contains('minus')) {
            if (currentQty > 0) {
                currentQty--;
                qtySpan.textContent = currentQty;
            }
        }
        else if (button.classList.contains('add-to-cart')) {
            if (currentQty > 0) {
                addToCart(productId, currentQty);
                qtySpan.textContent = '0';
            }
        }
    });
}

function filterSaleProducts() {
    const searchInput = document.getElementById('sale-product-search');
    if (!searchInput) return;
    
    const searchTerm = DOMPurify.sanitize(searchInput.value.toLowerCase());
    const products = document.querySelectorAll('#sale-products-list .cart-item');
    
    products.forEach(product => {
        const productName = product.querySelector('.cart-item-info h4')?.textContent.toLowerCase() || '';
        const productCode = product.querySelector('.code')?.textContent.toLowerCase() || '';
        
        const isVisible = productName.includes(searchTerm) || productCode.includes(searchTerm);
        product.style.display = isVisible ? '' : 'none';
    });
}

function addToCart(productId, quantity) {
    const product = systemData.products.find(p => p.id === productId);
    if (!product) return;
    
    if (quantity > product.stock) {
        showAlert(`Estoque insuficiente! Disponível: ${product.stock}`, 'error');
        return;
    }
    
    const existingItem = appState.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) {
            showAlert(`Estoque insuficiente! Disponível: ${product.stock}`, 'error');
            return;
        }
        existingItem.quantity = newQty;
    } else {
        appState.cart.push({
            productId: productId,
            name: DOMPurify.sanitize(product.name),
            price: product.sellingPrice,
            quantity: quantity
        });
    }
    
    updateCartDisplay();
    updateSaleSummary();
    showAlert(`${quantity}x ${DOMPurify.sanitize(product.name)} adicionado(s) ao carrinho`, 'success');
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('sale-cart');
    const emptyMessage = document.getElementById('empty-cart-message');
    
    if (!cartContainer || !emptyMessage) return;
    
    if (appState.cart.length === 0) {
        cartContainer.innerHTML = '';
        emptyMessage.classList.remove('d-none');
        return;
    }
    
    emptyMessage.classList.add('d-none');
    
    let cartHTML = '<h4 style="margin-bottom: 15px;">Carrinho de Venda</h4>';
    
    appState.cart.forEach((item, index) => {
        const product = systemData.products.find(p => p.id === item.productId);
        const subtotal = item.price * item.quantity;
        
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${DOMPurify.sanitize(item.name)}</h4>
                    <div class="code">${item.productId}</div>
                    <div class="currency">${formatCurrency(item.price)} cada</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus-cart" data-index="${index}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn plus-cart" data-index="${index}">+</button>
                    <button class="btn btn-small btn-danger remove-from-cart" data-index="${index}" style="margin-left: 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="text-right" style="min-width: 100px;">
                    <strong class="currency">${formatCurrency(subtotal)}</strong>
                </div>
            </div>
        `;
    });
    
    cartContainer.innerHTML = DOMPurify.sanitize(cartHTML);
    
    setTimeout(() => {
        document.querySelectorAll('.plus-cart').forEach(button => {
            button.addEventListener('click', function() {
                const index = sanitizeNumber(parseInt(this.getAttribute('data-index')));
                updateCartItemQuantity(index, 1);
            });
        });
        
        document.querySelectorAll('.minus-cart').forEach(button => {
            button.addEventListener('click', function() {
                const index = sanitizeNumber(parseInt(this.getAttribute('data-index')));
                updateCartItemQuantity(index, -1);
            });
        });
        
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', function() {
                const index = sanitizeNumber(parseInt(this.getAttribute('data-index')));
                removeFromCart(index);
            });
        });
    }, 100);
}

function updateCartItemQuantity(index, change) {
    if (index < 0 || index >= appState.cart.length) return;
    
    const item = appState.cart[index];
    const product = systemData.products.find(p => p.id === item.productId);
    if (!product) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > product.stock) {
        showAlert(`Estoque insuficiente! Disponível: ${product.stock}`, 'error');
        return;
    }
    
    item.quantity = newQuantity;
    updateCartDisplay();
    updateSaleSummary();
}

function removeFromCart(index) {
    if (index >= 0 && index < appState.cart.length) {
        appState.cart.splice(index, 1);
        updateCartDisplay();
        updateSaleSummary();
    }
}

function clearCart() {
    appState.cart = [];
    updateCartDisplay();
    updateSaleSummary();
    showAlert('Carrinho limpo', 'info');
}

function updateSaleSummary() {
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartDiscount = document.getElementById('cart-discount');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartSubtotal || !cartDiscount || !cartTotal) return;
    
    let subtotal = 0;
    appState.cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const discountInput = document.getElementById('sale-discount');
    const discount = discountInput ? sanitizeNumber(parseFloat(discountInput.value) || 0) : 0;
    
    const paymentMethod = document.getElementById('payment-method');
    const method = paymentMethod ? paymentMethod.value : 'cash';
    
    let fees = 0;
    
    if (method === 'debit' || method === 'credit') {
        const cardFeeInput = document.getElementById('card-fee');
        const cardFee = cardFeeInput ? sanitizeNumber(parseFloat(cardFeeInput.value) || 0) : 0;
        fees = (subtotal - discount) * (cardFee / 100);
        
        const cartFeesRow = document.getElementById('cart-fees-row');
        const cartFees = document.getElementById('cart-fees');
        if (cartFeesRow) cartFeesRow.classList.remove('d-none');
        if (cartFees) cartFees.textContent = formatCurrency(fees);
    } else {
        const cartFeesRow = document.getElementById('cart-fees-row');
        if (cartFeesRow) cartFeesRow.classList.add('d-none');
    }
    
    const total = subtotal - discount + fees;
    
    cartSubtotal.textContent = formatCurrency(subtotal);
    cartDiscount.textContent = formatCurrency(discount);
    cartTotal.textContent = formatCurrency(total);
}

// ============================================
// 13. LISTA DE VENDAS
// ============================================

function updateSalesList() {
    const salesBody = document.getElementById('sales-body');
    if (!salesBody) return;
    
    salesBody.innerHTML = '';
    
    const sortedSales = [...systemData.sales].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const itemsText = sale.items.map(item => 
            `${item.quantity}x ${DOMPurify.sanitize(item.name)}`
        ).join(', ');
        
        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        let paymentText = '';
        switch(sale.paymentMethod) {
            case 'cash':
                paymentText = 'Dinheiro';
                break;
            case 'pix':
                paymentText = 'Pix';
                break;
            case 'debit':
                paymentText = 'Cartão Débito';
                break;
            case 'credit':
                paymentText = 'Cartão Crédito';
                break;
            default:
                paymentText = DOMPurify.sanitize(sale.paymentMethod);
        }
        
        const sanitizedAttendant = DOMPurify.sanitize(sale.attendant || 'Não informado');
        
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = sale.id;
        row.appendChild(idCell);
        
        const dateCell = document.createElement('td');
        const dateText = document.createTextNode(saleDate.toLocaleDateString('pt-BR'));
        const brElement = document.createElement('br');
        const timeText = document.createTextNode(saleDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}));
        dateCell.appendChild(dateText);
        dateCell.appendChild(brElement);
        dateCell.appendChild(timeText);
        row.appendChild(dateCell);
        
        const itemsCell = document.createElement('td');
        itemsCell.textContent = itemsText;
        row.appendChild(itemsCell);
        
        const qtyCell = document.createElement('td');
        qtyCell.textContent = totalItems;
        row.appendChild(qtyCell);
        
        const totalCell = document.createElement('td');
        totalCell.className = 'currency';
        totalCell.textContent = formatCurrency(sale.total);
        row.appendChild(totalCell);
        
        const attendantCell = document.createElement('td');
        attendantCell.textContent = sanitizedAttendant;
        row.appendChild(attendantCell);
        
        const paymentCell = document.createElement('td');
        paymentCell.textContent = paymentText;
        row.appendChild(paymentCell);
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-small btn-info view-sale';
        viewBtn.setAttribute('data-id', sale.id);
        viewBtn.setAttribute('title', 'Visualizar Venda');
        const viewIcon = document.createElement('i');
        viewIcon.className = 'fas fa-eye';
        viewBtn.appendChild(viewIcon);
        actionsCell.appendChild(viewBtn);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-small btn-warning edit-sale-btn';
        editBtn.setAttribute('data-id', sale.id);
        editBtn.setAttribute('title', 'Editar Venda');
        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-edit';
        editBtn.appendChild(editIcon);
        actionsCell.appendChild(editBtn);
        
        row.appendChild(actionsCell);
        salesBody.appendChild(row);
    });
    
    setTimeout(() => {
        document.querySelectorAll('.view-sale').forEach(button => {
            button.addEventListener('click', function() {
                const saleId = DOMPurify.sanitize(this.getAttribute('data-id'));
                viewSaleDetails(saleId);
            });
        });
        
        document.querySelectorAll('.edit-sale-btn').forEach(button => {
            button.addEventListener('click', function() {
                const saleId = DOMPurify.sanitize(this.getAttribute('data-id'));
                editSale(saleId);
            });
        });
    }, 100);
}

function viewSaleDetails(saleId) {
    const sanitizedId = DOMPurify.sanitize(saleId);
    const sale = systemData.sales.find(s => s.id === sanitizedId);
    if (!sale) return;
    
    const modalContent = document.getElementById('sale-details-content');
    if (!modalContent) return;
    
    const saleDate = new Date(sale.date);
    
    let detailsHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>ID da Venda:</strong> ${DOMPurify.sanitize(sale.id)}</p>
            <p><strong>Data/Hora:</strong> ${saleDate.toLocaleDateString('pt-BR')} ${saleDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
            <p><strong>Atendente:</strong> ${DOMPurify.sanitize(sale.attendant || 'Não informado')}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                    <th style="padding: 10px; text-align: left;">Produto</th>
                    <th style="padding: 10px; text-align: center;">Qtd</th>
                    <th style="padding: 10px; text-align: right;">Preço Unit.</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sale.items.forEach(item => {
        const sanitizedName = DOMPurify.sanitize(item.name);
        detailsHTML += `
            <tr>
                <td style="padding: 10px;">${sanitizedName}</td>
                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right;">${formatCurrency(item.price)}</td>
                <td style="padding: 10px; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `;
    });
    
    let paymentText = '';
    switch(sale.paymentMethod) {
        case 'cash':
            paymentText = 'Dinheiro';
            break;
        case 'pix':
            paymentText = 'Pix';
            break;
        case 'debit':
            paymentText = 'Cartão de Débito';
            break;
        case 'credit':
            paymentText = 'Cartão de Crédito';
            break;
        default:
            paymentText = DOMPurify.sanitize(sale.paymentMethod);
    }
    
    detailsHTML += `
            </tbody>
        </table>
        
        <div style="border-top: 2px solid #ddd; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Subtotal:</span>
                <span>${formatCurrency(sale.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Desconto:</span>
                <span>- ${formatCurrency(sale.discount)}</span>
            </div>
    `;
    
    if (sale.fees > 0) {
        detailsHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Taxas (${sale.cardFee}%):</span>
                <span>${formatCurrency(sale.fees)}</span>
            </div>
        `;
    }
    
    detailsHTML += `
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2em; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
                <span>TOTAL:</span>
                <span>${formatCurrency(sale.total)}</span>
            </div>
            
            <div style="margin-top: 15px;">
                <p><strong>Método de Pagamento:</strong> ${paymentText}</p>
            </div>
        </div>
    `;
    
    modalContent.innerHTML = DOMPurify.sanitize(detailsHTML);
    
    const printReceiptBtn = document.getElementById('print-receipt');
    if (printReceiptBtn) {
        printReceiptBtn.onclick = function() {
            showReceipt(sale);
        };
    }
    
    showModal('sale-details-modal');
}

// ============================================
// 14. DASHBOARD E RELATÓRIOS
// ============================================

function updateDashboard() {
    const totalProducts = document.getElementById('total-products');
    const todaySales = document.getElementById('today-sales');
    const monthlyRevenue = document.getElementById('monthly-revenue');
    const bestSeller = document.getElementById('best-seller');
    const bestSellerQty = document.getElementById('best-seller-qty');
    
    if (totalProducts) totalProducts.textContent = systemData.products.length;
    
    const today = new Date().toISOString().split('T')[0];
    const todaySalesCount = systemData.sales.filter(sale => 
        sale.date.startsWith(today)
    ).length;
    
    if (todaySales) todaySales.textContent = todaySalesCount;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySales = systemData.sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
    
    const monthlyRevenueTotal = monthlySales.reduce((sum, sale) => sum + sale.total, 0);
    
    if (monthlyRevenue) monthlyRevenue.textContent = formatCurrency(monthlyRevenueTotal);
    
    const productSales = {};
    systemData.sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = 0;
            }
            productSales[item.productId] += item.quantity;
        });
    });
    
    let bestSellerId = null;
    let bestSellerQtyValue = 0;
    
    for (const [productId, qty] of Object.entries(productSales)) {
        if (qty > bestSellerQtyValue) {
            bestSellerQtyValue = qty;
            bestSellerId = productId;
        }
    }
    
    if (bestSellerId) {
        const bestProduct = systemData.products.find(p => p.id === bestSellerId);
        if (bestProduct) {
            const sanitizedName = DOMPurify.sanitize(bestProduct.name);
            if (bestSeller) bestSeller.textContent = sanitizedName;
            if (bestSellerQty) bestSellerQty.textContent = bestSellerQtyValue;
        }
    } else {
        if (bestSeller) bestSeller.textContent = '-';
        if (bestSellerQty) bestSellerQty.textContent = '0';
    }
    
    updateRecentSales();
    updateMonthlySalesChart();
}

function updateRecentSales() {
    const recentSalesBody = document.getElementById('recent-sales-body');
    if (!recentSalesBody) return;
    
    recentSalesBody.innerHTML = '';
    
    const sortedSales = [...systemData.sales].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    ).slice(0, 5);
    
    sortedSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const itemsText = sale.items.map(item => 
            `${item.quantity}x ${DOMPurify.sanitize(item.name)}`
        ).join(', ');
        
        let paymentText = '';
        switch(sale.paymentMethod) {
            case 'cash':
                paymentText = 'Dinheiro';
                break;
            case 'pix':
                paymentText = 'Pix';
                break;
            case 'debit':
                paymentText = 'Débito';
                break;
            case 'credit':
                paymentText = 'Crédito';
                break;
            default:
                paymentText = DOMPurify.sanitize(sale.paymentMethod);
        }
        
        const sanitizedAttendant = DOMPurify.sanitize(sale.attendant || 'Não informado');
        
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = sale.id;
        row.appendChild(idCell);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = `${saleDate.toLocaleDateString('pt-BR')} ${saleDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        row.appendChild(dateCell);
        
        const itemsCell = document.createElement('td');
        itemsCell.textContent = itemsText;
        row.appendChild(itemsCell);
        
        const totalCell = document.createElement('td');
        totalCell.className = 'currency';
        totalCell.textContent = formatCurrency(sale.total);
        row.appendChild(totalCell);
        
        const attendantCell = document.createElement('td');
        attendantCell.textContent = sanitizedAttendant;
        row.appendChild(attendantCell);
        
        const paymentCell = document.createElement('td');
        paymentCell.textContent = paymentText;
        row.appendChild(paymentCell);
        
        recentSalesBody.appendChild(row);
    });
}

function updateReports() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = systemData.sales.filter(sale => 
        new Date(sale.date) >= thirtyDaysAgo
    );
    
    const totalRevenue = recentSales.reduce((sum, sale) => sum + sale.total, 0);
    const reportRevenue = document.getElementById('report-revenue');
    if (reportRevenue) reportRevenue.textContent = formatCurrency(totalRevenue);
    
    let totalCost = 0;
    recentSales.forEach(sale => {
        sale.items.forEach(item => {
            const product = systemData.products.find(p => p.id === item.productId);
            if (product) {
                totalCost += product.purchaseCost * item.quantity;
            }
        });
    });
    
    const reportCost = document.getElementById('report-cost');
    if (reportCost) reportCost.textContent = formatCurrency(totalCost);
    
    const netProfit = totalRevenue - totalCost;
    const reportProfit = document.getElementById('report-profit');
    if (reportProfit) reportProfit.textContent = formatCurrency(netProfit);
    
    const lowStockProducts = systemData.products.filter(p => p.stock < 10);
    const lowStockCount = document.getElementById('low-stock-count');
    const lowStockList = document.getElementById('low-stock-list');
    
    if (lowStockCount) lowStockCount.textContent = lowStockProducts.length;
    
    if (lowStockList) {
        if (lowStockProducts.length > 0) {
            const lowStockNames = lowStockProducts.map(p => DOMPurify.sanitize(p.name)).slice(0, 3).join(', ');
            lowStockList.textContent = lowStockNames + 
                (lowStockProducts.length > 3 ? '...' : '');
        } else {
            lowStockList.textContent = 'Nenhum produto';
        }
    }
    
    updateTopProducts();
    updateCategoryChart();
}

function updateTopProducts() {
    const topProductsBody = document.getElementById('top-products-body');
    if (!topProductsBody) return;
    
    topProductsBody.innerHTML = '';
    
    const productStats = {};
    
    systemData.sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productStats[item.productId]) {
                productStats[item.productId] = {
                    quantity: 0,
                    revenue: 0
                };
            }
            productStats[item.productId].quantity += item.quantity;
            productStats[item.productId].revenue += item.quantity * item.price;
        });
    });
    
    const sortedProducts = Object.entries(productStats)
        .map(([productId, stats]) => {
            const product = systemData.products.find(p => p.id === productId);
            return {
                productId,
                name: product ? DOMPurify.sanitize(product.name) : 'Produto desconhecido',
                category: product ? DOMPurify.sanitize(product.category) : 'Desconhecida',
                ...stats
            };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    
    sortedProducts.forEach((product, index) => {
        const row = document.createElement('tr');
        
        const positionCell = document.createElement('td');
        positionCell.textContent = index + 1;
        row.appendChild(positionCell);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = product.name;
        row.appendChild(nameCell);
        
        const categoryCell = document.createElement('td');
        categoryCell.textContent = getCategoryName(product.category);
        row.appendChild(categoryCell);
        
        const qtyCell = document.createElement('td');
        qtyCell.textContent = product.quantity;
        row.appendChild(qtyCell);
        
        const revenueCell = document.createElement('td');
        revenueCell.className = 'currency';
        revenueCell.textContent = formatCurrency(product.revenue);
        row.appendChild(revenueCell);
        
        const profitCell = document.createElement('td');
        profitCell.className = 'currency';
        profitCell.textContent = formatCurrency(product.revenue * 0.3);
        row.appendChild(profitCell);
        
        topProductsBody.appendChild(row);
    });
}

// ============================================
// 15. GRÁFICOS
// ============================================

function updateMonthlySalesChart() {
    const ctx = document.getElementById('monthlySalesChart');
    if (!ctx) return;
    
    if (appState.charts.monthlySales) {
        appState.charts.monthlySales.destroy();
    }
    
    const monthlySales = {};
    const monthlyRevenue = {};
    
    systemData.sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const monthYear = `${saleDate.getMonth() + 1}/${saleDate.getFullYear()}`;
        
        if (!monthlySales[monthYear]) {
            monthlySales[monthYear] = 0;
            monthlyRevenue[monthYear] = 0;
        }
        
        monthlySales[monthYear] += 1;
        monthlyRevenue[monthYear] += sale.total;
    });
    
    const sortedMonths = Object.keys(monthlySales).sort((a, b) => {
        const [monthA, yearA] = a.split('/').map(Number);
        const [monthB, yearB] = b.split('/').map(Number);
        return yearA === yearB ? monthA - monthB : yearA - yearB;
    });
    
    const displayMonths = sortedMonths.slice(-6);
    
    const labels = displayMonths.map(month => {
        const [monthNum, year] = month.split('/');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${monthNames[monthNum - 1]}/${year}`;
    });
    
    const salesData = displayMonths.map(month => monthlySales[month] || 0);
    const revenueData = displayMonths.map(month => monthlyRevenue[month] || 0);
    
    try {
        appState.charts.monthlySales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Número de Vendas',
                        data: salesData,
                        backgroundColor: 'rgba(138, 43, 226, 0.7)',
                        borderColor: 'rgba(138, 43, 226, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Receita (R$)',
                        data: revenueData,
                        backgroundColor: 'rgba(255, 107, 107, 0.7)',
                        borderColor: 'rgba(255, 107, 107, 1)',
                        borderWidth: 1,
                        type: 'line',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Número de Vendas'
                        },
                        ticks: {
                            beginAtZero: true,
                            precision: 0
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Receita (R$)'
                        },
                        ticks: {
                            beginAtZero: true,
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2).replace('.', ',');
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico:', error);
    }
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (appState.charts.categoryChart) {
        appState.charts.categoryChart.destroy();
    }
    
    const categoryRevenue = {};
    
    systemData.sales.forEach(sale => {
        sale.items.forEach(item => {
            const product = systemData.products.find(p => p.id === item.productId);
            if (product) {
                const category = DOMPurify.sanitize(product.category);
                if (!categoryRevenue[category]) {
                    categoryRevenue[category] = 0;
                }
                categoryRevenue[category] += item.price * item.quantity;
            }
        });
    });
    
    const categories = Object.keys(categoryRevenue);
    const revenueData = categories.map(cat => categoryRevenue[cat]);
    
    const categoryNames = {
        'Skincare': 'Skincare',
        'Makeup': 'Maquiagem',
        'Acessories': 'Acessórios'
    };
    
    const labels = categories.map(cat => categoryNames[cat] || cat);
    
    const backgroundColors = [
        'rgba(138, 43, 226, 0.7)',
        'rgba(255, 107, 107, 0.7)',
        'rgba(76, 175, 80, 0.7)',
        'rgba(255, 152, 0, 0.7)',
        'rgba(33, 150, 243, 0.7)',
        'rgba(156, 39, 176, 0.7)'
    ];
    
    try {
        appState.charts.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: revenueData,
                    backgroundColor: backgroundColors.slice(0, categories.length),
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de categorias:', error);
    }
}

// ============================================
// 16. EXPORTAÇÃO E IMPORTAÇÃO DE DADOS
// ============================================

function exportData(type = null) {
    if (!type) {
        const exportType = document.getElementById('export-type');
        type = exportType ? exportType.value : 'all';
    }
    
    let dataToExport;
    let filename;
    
    switch(type) {
        case 'products':
            dataToExport = { products: systemData.products };
            filename = `camarim-produtos-${new Date().toISOString().slice(0,10)}.json`;
            break;
        case 'sales':
            dataToExport = { sales: systemData.sales };
            filename = `camarim-vendas-${new Date().toISOString().slice(0,10)}.json`;
            break;
        case 'all':
        default:
            dataToExport = systemData;
            filename = `camarim-backup-${new Date().toISOString().slice(0,10)}.json`;
            break;
    }
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    showAlert(`Dados exportados com sucesso: ${filename}`, 'success');
    hideModal('export-modal');
}

function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput?.files[0];
    
    if (!file) {
        const importError = document.getElementById('import-error');
        if (importError) {
            importError.classList.remove('d-none');
            const importErrorMessage = document.getElementById('import-error-message');
            if (importErrorMessage) {
                importErrorMessage.textContent = 'Selecione um arquivo JSON para importar';
            }
        }
        return;
    }
    
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        const importError = document.getElementById('import-error');
        if (importError) {
            importError.classList.remove('d-none');
            const importErrorMessage = document.getElementById('import-error-message');
            if (importErrorMessage) {
                importErrorMessage.textContent = 'O arquivo deve ser um JSON válido';
            }
        }
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.products || !Array.isArray(importedData.products)) {
                throw new Error('Estrutura de dados inválida');
            }
            
            const sanitizedData = {
                products: importedData.products.map(product => ({
                    ...product,
                    name: DOMPurify.sanitize(product.name || ''),
                    category: DOMPurify.sanitize(product.category || '')
                })),
                sales: importedData.sales ? importedData.sales.map(sale => ({
                    ...sale,
                    attendant: DOMPurify.sanitize(sale.attendant || ''),
                    items: sale.items ? sale.items.map(item => ({
                        ...item,
                        name: DOMPurify.sanitize(item.name || '')
                    })) : []
                })) : [],
                settings: importedData.settings || {}
            };
            
            if (sanitizedData.sales && Array.isArray(sanitizedData.sales)) {
                systemData.sales = sanitizedData.sales;
            }
            
            if (sanitizedData.settings && typeof sanitizedData.settings === 'object') {
                systemData.settings = { ...systemData.settings, ...sanitizedData.settings };
            }
            
            systemData.products = sanitizedData.products;
            
            updateProductIds();
            updateSaleIds();
            
            saveData();
            loadData();
            updateDashboard();
            updateProductsList();
            updateInventorySummary();
            updateSalesList();
            
            showAlert('Dados importados com sucesso!', 'success');
            hideModal('import-modal');
            
        } catch (error) {
            const importError = document.getElementById('import-error');
            if (importError) {
                importError.classList.remove('d-none');
                const importErrorMessage = document.getElementById('import-error-message');
                if (importErrorMessage) {
                    importErrorMessage.textContent = 
                        DOMPurify.sanitize(`Erro ao importar dados: ${error.message}`);
                }
            }
            console.error('Erro na importação:', error);
        }
    };
    
    reader.onerror = function() {
        const importError = document.getElementById('import-error');
        if (importError) {
            importError.classList.remove('d-none');
            const importErrorMessage = document.getElementById('import-error-message');
            if (importErrorMessage) {
                importErrorMessage.textContent = 'Erro ao ler o arquivo';
            }
        }
    };
    
    reader.readAsText(file);
}

async function clearAllData() {
    const confirmation = confirm('ATENÇÃO: Esta ação irá apagar TODOS os dados do sistema. Esta ação não pode ser desfeita. Deseja continuar?');
    if (confirmation) {
        try {
            systemData = {
                products: [],
                sales: [],
                settings: {
                    defaultDebitFee: 2.0,
                    defaultCreditFee: 4.5,
                    lastProductId: 0,
                    lastSaleId: 0
                }
            };
            
            await saveData();
            
            loadData();
            updateDashboard();
            updateInventorySummary();
            
            showAlert('Todos os dados foram apagados e o sistema foi reinicializado', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao limpar dados:', error);
            showAlert('Erro ao limpar dados: ' + error.message, 'error');
        }
    }
}

// ============================================
// 17. SISTEMA DE VENDAS PIX
// ============================================

function showPixPayment(sale) {
    const modalContent = document.getElementById('pix-content');
    if (!modalContent) return;
    
    const pixCode = generatePixCode(sale.total);
    
    let pixHTML = `
        <div class="text-center">
            <h4 style="margin-bottom: 20px;">Pagamento via Pix</h4>
            <p>Valor: <strong class="currency">${formatCurrency(sale.total)}</strong></p>
            <p>Atendente: <strong>${DOMPurify.sanitize(sale.attendant)}</strong></p>
            
            <div class="pix-qr-code" id="pix-qr-code"></div>
            
            <div class="pix-copy-code">
                <p style="margin-bottom: 10px;">Código Pix Copia e Cola:</p>
                <div class="pix-code">${DOMPurify.sanitize(pixCode)}</div>
                <button class="btn btn-info btn-block" id="copy-pix-code">
                    <i class="fas fa-copy"></i> Copiar Código
                </button>
            </div>
            
            <div class="alert alert-success mt-20">
                <i class="fas fa-info-circle"></i>
                <span>Após realizar o pagamento, clique em "Confirmar Pagamento"</span>
            </div>
        </div>
    `;
    
    modalContent.innerHTML = DOMPurify.sanitize(pixHTML);
    
    setTimeout(() => {
        if (typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById("pix-qr-code"), {
                text: pixCode,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff"
            });
        }
    }, 100);
    
    setTimeout(() => {
        const copyButton = document.getElementById('copy-pix-code');
        if (copyButton) {
            copyButton.addEventListener('click', function() {
                navigator.clipboard.writeText(pixCode).then(() => {
                    showAlert('Código Pix copiado para a área de transferência!', 'success');
                }).catch(err => {
                    console.error('Erro ao copiar:', err);
                    showAlert('Erro ao copiar código. Tente novamente.', 'error');
                });
            });
        }
    }, 200);
    
    showModal('pix-modal');
}

function generatePixCode(amount) {
    if (isNaN(amount) || amount <= 0) {
        amount = 0.01;
    }
    
    const transactionId = Math.random().toString(36).substring(2, 15).toUpperCase();
    const merchantName = "CAMARIM BOUTIQUE";
    const merchantCity = "SAO PAULO";
    
    return `00020126580014BR.GOV.BCB.PIX0136${merchantName}520400005303986540${amount.toFixed(2)}5802BR5913${merchantName}6009${merchantCity}622905${transactionId}6304`;
}

function confirmPixPayment() {
    if (appState.currentSaleData) {
        confirmSale(appState.currentSaleData);
        hideModal('pix-modal');
    }
}

// ============================================
// 18. BANCO DE DADOS
// ============================================

function showDatabaseStatus() {
    console.group('📊 Status do Banco de Dados');
    console.log('DatabaseManager disponível:', typeof databaseManager !== 'undefined');
    console.log('DatabaseManager inicializado:', databaseManager?.initialized || false);
    console.log('Produtos no sistema:', systemData.products.length);
    console.log('Vendas no sistema:', systemData.sales.length);
    console.groupEnd();
}

async function updateDatabaseInfo() {
    try {
        if (!databaseManager) {
            console.warn('⚠️ databaseManager não disponível para updateDatabaseInfo');
            return;
        }
        
        const info = await databaseManager.getDatabaseInfo();
        
        const dbStatus = document.getElementById('db-status');
        const dbType = document.getElementById('db-type');
        const dbStorage = document.getElementById('db-storage');
        const dbUsage = document.getElementById('db-usage');
        
        if (dbStatus) dbStatus.textContent = info?.status || 'LocalStorage';
        if (dbType) {
            const isIndexedDB = info?.status === 'IndexedDB';
            dbType.innerHTML = isIndexedDB ? 
                '<span class="positive"><i class="fas fa-check"></i> Otimizado</span>' :
                '<span class="warning"><i class="fas fa-exclamation-triangle"></i> Fallback</span>';
        }
        if (dbStorage) dbStorage.textContent = info?.storage || 'N/A';
        if (dbUsage) dbUsage.textContent = info?.status === 'IndexedDB' ? 'Ativo' : 'Fallback';
        
        const infoContainer = document.getElementById('db-info-container');
        if (infoContainer) {
            let infoHTML = '';
            
            if (info) {
                const isIndexedDB = info.status === 'IndexedDB';
                
                infoHTML = `
                    <div class="alert ${isIndexedDB ? 'alert-success' : 'alert-warning'}">
                        <i class="fas fa-${isIndexedDB ? 'check-circle' : 'exclamation-triangle'}"></i>
                        <strong>Status:</strong> ${isIndexedDB ? 
                            'Usando IndexedDB (recomendado)' : 
                            'Usando localStorage (modo fallback)'}
                    </div>
                    
                    <div class="calculation-box">
                        <h4>Informações Detalhadas</h4>
                        <div class="calculation-row">
                            <span>Sistema de armazenamento:</span>
                            <span>${info.status}</span>
                        </div>
                        <div class="calculation-row">
                            <span>Produtos cadastrados:</span>
                            <span>${systemData.products.length}</span>
                        </div>
                        <div class="calculation-row">
                            <span>Vendas registradas:</span>
                            <span>${systemData.sales.length}</span>
                        </div>
                `;
                
                if (info.storage && info.storage !== 'N/A') {
                    infoHTML += `
                        <div class="calculation-row">
                            <span>Armazenamento usado:</span>
                            <span>${info.storage}</span>
                        </div>
                    `;
                }
                
                infoHTML += `
                        <div class="calculation-row">
                            <span>Última atualização:</span>
                            <span>${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                `;
            } else {
                infoHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Informações do banco não disponíveis</strong>
                    </div>
                `;
            }
            
            infoContainer.innerHTML = DOMPurify.sanitize(infoHTML);
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar informações do banco:', error);
    }
}

// ============================================
// 19. UTILITÁRIOS
// ============================================

function showModal(modalId) {
    const sanitizedId = DOMPurify.sanitize(modalId);
    const modal = document.getElementById(sanitizedId);
    if (modal) {
        modal.classList.add('active');
    }
}

function hideModal(modalId) {
    const sanitizedId = DOMPurify.sanitize(modalId);
    const modal = document.getElementById(sanitizedId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function showAlert(message, type = 'success') {
    const sanitizedMessage = DOMPurify.sanitize(message);
    
    let alertElement, messageElement;
    
    if (appState.currentView === 'products') {
        alertElement = document.getElementById('product-alert');
        messageElement = document.getElementById('alert-message');
    } else if (appState.currentView === 'new-product') {
        alertElement = document.getElementById('new-product-alert');
        messageElement = document.getElementById('new-alert-message');
    } else if (appState.currentView === 'reports') {
        alertElement = document.getElementById('pdf-report-alert');
        messageElement = document.getElementById('pdf-report-message');
    } else if (appState.currentView === 'database') {
        alertElement = document.getElementById('db-alert');
        messageElement = document.getElementById('db-alert-message');
    } else {
        const tempAlert = document.createElement('div');
        tempAlert.className = `alert alert-${type}`;
        tempAlert.innerHTML = DOMPurify.sanitize(`
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${sanitizedMessage}</span>
        `);
        tempAlert.style.position = 'fixed';
        tempAlert.style.top = '20px';
        tempAlert.style.right = '20px';
        tempAlert.style.zIndex = '10000';
        tempAlert.style.maxWidth = '400px';
        tempAlert.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        document.body.appendChild(tempAlert);
        
        setTimeout(() => {
            tempAlert.remove();
        }, 5000);
        
        return;
    }
    
    if (alertElement && messageElement) {
        alertElement.className = `alert alert-${type}`;
        
        const icon = alertElement.querySelector('i');
        icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}`;
        
        messageElement.textContent = sanitizedMessage;
        alertElement.classList.remove('d-none');
        
        setTimeout(() => {
            alertElement.classList.add('d-none');
        }, 5000);
    }
}

function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }
    value = Math.max(0, value);
    return value.toFixed(2).replace('.', ',');
}

function getCategoryName(categoryCode) {
    const categories = {
        'Skincare': 'Skincare',
        'Makeup': 'Maquiagem',
        'Acessories': 'Acessórios'
    };
    
    const sanitizedCode = DOMPurify.sanitize(categoryCode);
    return categories[sanitizedCode] || sanitizedCode;
}

function sanitizeNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return 0;
    }
    if (Math.abs(value) > 1000000000) {
        return 0;
    }
    return value;
}

// Exportar funções principais para uso global
window.CamarimSystem = {
    showView,
    saveData,
    updateDashboard,
    showAlert,
    formatCurrency
};

console.log('✅ Sistema Camarim inicializado com sucesso!');
