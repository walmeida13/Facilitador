/**
 * Facilitador REDS → CNVD/CNMP
 * JavaScript da interface — processamento 100% local
 */

// ============================================================
// ELEMENTOS DO DOM
// ============================================================

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const btnRemover = document.getElementById('btn-remover');
const btnProcessar = document.getElementById('btn-processar');
const uploadSection = document.getElementById('upload-section');
const resultadoSection = document.getElementById('resultado-section');
const mensagemErro = document.getElementById('mensagem-erro');
const avisoOcr = document.getElementById('aviso-ocr');

let arquivoSelecionado = null;


// ============================================================
// DRAG & DROP + SELEÇÃO DE ARQUIVO
// ============================================================

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        selecionarArquivo(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selecionarArquivo(e.target.files[0]);
    }
});

btnRemover.addEventListener('click', () => {
    limparSelecao();
});

btnProcessar.addEventListener('click', () => {
    processarArquivo();
});


function selecionarArquivo(file) {
    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        mostrarErro('Formato não permitido. Envie apenas arquivos PDF.');
        return;
    }

    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
        mostrarErro('Arquivo muito grande. O limite é 50MB.');
        return;
    }

    arquivoSelecionado = file;
    fileName.textContent = `${file.name} (${formatarTamanho(file.size)})`;
    fileInfo.style.display = 'flex';
    dropZone.style.display = 'none';
    btnProcessar.disabled = false;
    esconderErro();
}


function limparSelecao() {
    arquivoSelecionado = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    dropZone.style.display = 'block';
    btnProcessar.disabled = true;
    esconderErro();
}


function formatarTamanho(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


// ============================================================
// PROCESSAMENTO
// ============================================================

async function processarArquivo() {
    if (!arquivoSelecionado) return;

    // UI: estado de loading
    const btnText = btnProcessar.querySelector('.btn-text');
    const btnLoading = btnProcessar.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    btnProcessar.disabled = true;
    esconderErro();

    try {
        const formData = new FormData();
        formData.append('arquivo', arquivoSelecionado);

        const response = await fetch('/processar', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.erro) {
            mostrarErro(data.erro);
            return;
        }

        // Preencher resultados
        preencherResultados(data);

        // Mostrar seção de resultados
        uploadSection.style.display = 'none';
        resultadoSection.style.display = 'block';

        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        mostrarErro('Erro de comunicação com o servidor. Verifique se o servidor está rodando.');
        console.error('Erro:', error);
    } finally {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnProcessar.disabled = false;
    }
}


// ============================================================
// PREENCHIMENTO DOS RESULTADOS
// ============================================================

function preencherResultados(data) {
    // Aviso OCR
    if (data.usou_ocr) {
        avisoOcr.style.display = 'block';
    } else {
        avisoOcr.style.display = 'none';
    }

    // Dados Gerais
    setText('val-numero-reds', data.dados_gerais.numero_reds);
    setText('val-ambiente', data.dados_gerais.ambiente_agressao);
    setText('val-vinculo', data.dados_gerais.vinculo_agressor_vitima);
    setText('val-data-fato', data.dados_gerais.data_fato);
    setText('val-hora-fato', data.dados_gerais.hora_fato);
    setText('val-data-autuacao', data.dados_gerais.data_autuacao);
    setText('val-uf-fato', data.dados_gerais.uf_fato);
    setText('val-cidade-fato', data.dados_gerais.cidade_fato);

    // Vítima
    setText('val-vitima-nome', data.vitima.nome_civil);
    setText('val-vitima-nome-social', data.vitima.nome_social);
    setText('val-vitima-cpf', data.vitima.cpf);
    setText('val-vitima-pai', data.vitima.nome_pai);
    setText('val-vitima-mae', data.vitima.nome_mae);
    setText('val-vitima-nascimento', data.vitima.data_nascimento);
    setText('val-vitima-genero', data.vitima.genero);
    setText('val-vitima-cor', data.vitima.cor_raca);
    setText('val-vitima-orientacao', data.vitima.orientacao_sexual);

    // Agressor
    setText('val-agressor-nome', data.agressor.nome_civil);
    setText('val-agressor-nome-social', data.agressor.nome_social);
    setText('val-agressor-cpf', data.agressor.cpf);
    setText('val-agressor-pai', data.agressor.nome_pai);
    setText('val-agressor-mae', data.agressor.nome_mae);
    setText('val-agressor-nascimento', data.agressor.data_nascimento);
    setText('val-agressor-genero', data.agressor.genero);
    setText('val-agressor-cor', data.agressor.cor_raca);
    setText('val-agressor-orientacao', data.agressor.orientacao_sexual);
}


function setText(id, valor) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = valor || '';
    }
}


// ============================================================
// FUNÇÕES DE CÓPIA
// ============================================================

function copiarCampo(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const texto = el.textContent.trim();
    if (!texto) {
        mostrarToast('Campo vazio');
        return;
    }

    navigator.clipboard.writeText(texto).then(() => {
        // Feedback visual no botão
        const btn = el.parentElement.querySelector('.btn-copiar');
        if (btn) {
            const textoOriginal = btn.textContent;
            btn.textContent = '✓';
            btn.classList.add('copiado');
            setTimeout(() => {
                btn.textContent = textoOriginal;
                btn.classList.remove('copiado');
            }, 1500);
        }
        mostrarToast('Copiado!');
    }).catch(() => {
        // Fallback para navegadores antigos
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        mostrarToast('Copiado!');
    });
}


function copiarTudo() {
    const secoes = [
        { titulo: '=== DADOS GERAIS DA OCORRÊNCIA ===', campos: [
            { label: 'Número da Ocorrência (REDS)', id: 'val-numero-reds' },
            { label: 'Ambiente da Agressão', id: 'val-ambiente' },
            { label: 'Vínculo do Agressor com a Vítima', id: 'val-vinculo' },
            { label: 'Data do Fato', id: 'val-data-fato' },
            { label: 'Hora do Fato', id: 'val-hora-fato' },
            { label: 'Data da Autuação', id: 'val-data-autuacao' },
            { label: 'UF do Fato', id: 'val-uf-fato' },
            { label: 'Cidade do Fato', id: 'val-cidade-fato' },
        ]},
        { titulo: '\n=== DADOS DA VÍTIMA ===', campos: [
            { label: 'Nome Civil', id: 'val-vitima-nome' },
            { label: 'Nome Social', id: 'val-vitima-nome-social' },
            { label: 'CPF', id: 'val-vitima-cpf' },
            { label: 'Nome do Pai', id: 'val-vitima-pai' },
            { label: 'Nome da Mãe', id: 'val-vitima-mae' },
            { label: 'Data de Nascimento', id: 'val-vitima-nascimento' },
            { label: 'Gênero', id: 'val-vitima-genero' },
            { label: 'Cor/Raça', id: 'val-vitima-cor' },
            { label: 'Orientação Sexual', id: 'val-vitima-orientacao' },
        ]},
        { titulo: '\n=== DADOS DO AGRESSOR ===', campos: [
            { label: 'Nome Civil', id: 'val-agressor-nome' },
            { label: 'Nome Social', id: 'val-agressor-nome-social' },
            { label: 'CPF', id: 'val-agressor-cpf' },
            { label: 'Nome do Pai', id: 'val-agressor-pai' },
            { label: 'Nome da Mãe', id: 'val-agressor-mae' },
            { label: 'Data de Nascimento', id: 'val-agressor-nascimento' },
            { label: 'Gênero', id: 'val-agressor-genero' },
            { label: 'Cor/Raça', id: 'val-agressor-cor' },
            { label: 'Orientação Sexual', id: 'val-agressor-orientacao' },
        ]},
    ];

    let textoCompleto = '';
    for (const secao of secoes) {
        textoCompleto += secao.titulo + '\n';
        for (const campo of secao.campos) {
            const el = document.getElementById(campo.id);
            const valor = el ? el.textContent.trim() : '';
            textoCompleto += `${campo.label}: ${valor || '—'}\n`;
        }
    }

    navigator.clipboard.writeText(textoCompleto).then(() => {
        mostrarToast('Todos os dados copiados!');
    }).catch(() => {
        mostrarToast('Erro ao copiar. Tente copiar campo a campo.');
    });
}


// ============================================================
// NOVO PROCESSAMENTO
// ============================================================

function novoProcessamento() {
    resultadoSection.style.display = 'none';
    uploadSection.style.display = 'block';
    limparSelecao();

    // Limpar todos os campos de resultado
    const valores = document.querySelectorAll('.valor');
    valores.forEach(v => v.textContent = '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ============================================================
// UTILITÁRIOS
// ============================================================

function mostrarErro(msg) {
    mensagemErro.textContent = msg;
    mensagemErro.style.display = 'block';
}

function esconderErro() {
    mensagemErro.style.display = 'none';
}

let toastTimeout;
function mostrarToast(msg) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    toastText.textContent = msg;
    toast.style.display = 'block';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}
