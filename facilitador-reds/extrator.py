"""
Módulo de extração de dados de REDS (Boletim de Ocorrência) para o CNVD/CNMP.
Processamento 100% local — nenhum dado sai da máquina.
"""

import re
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from PIL import Image, ImageFilter, ImageEnhance
import io
import os
import tempfile


# ============================================================
# LISTAS DE OPÇÕES DO CNVD/CNMP
# ============================================================

AMBIENTES_AGRESSAO = [
    "Residência comum com o agressor",
    "Residência exclusiva da vítima",
    "Residência exclusiva do agressor",
    "Residência de terceiros",
    "Profissional",
    "Local público",
    "Meio eletrônico",
    "Outros",
]

VINCULOS_AGRESSOR_VITIMA = [
    "Agregado(a) na unidade doméstica",
    "Cônjuge / Companheiro(a)",
    "Namorado(a)",
    "Ex-cônjuge / Ex-companheiro(a)",
    "Ex-namorado(a)",
    "Pai", "Mãe", "Padrastro", "Madrasta",
    "Filho(a)", "Irmão / Irmã", "Avô / Avó",
    "Tio(a)", "Primo(a)", "Enteado(a)", "Cunhado(a)",
    "Genro / Nora", "Sogro(a)", "Amigo(a)", "Vizinho(a)",
    "Empregador(a)", "Outros",
]

COR_RACA_OPCOES = ["Amarelo", "Branco", "Indígena", "Não informado", "Pardo", "Preto"]
ORIENTACAO_SEXUAL_OPCOES = ["Assexual", "Bissexual", "Heterossexual", "Homossexual", "Não informada"]
GENERO_OPCOES = ["Feminino", "Masculino", "Outros"]


# ============================================================
# MAPEAMENTOS REDS → CNVD
# ============================================================

MAPA_CUTIS_COR_RACA = {
    "PARDA": "Pardo", "PARDO": "Pardo",
    "NEGRA": "Preto", "NEGRO": "Preto", "PRETA": "Preto", "PRETO": "Preto",
    "BRANCA": "Branco", "BRANCO": "Branco",
    "AMARELA": "Amarelo", "AMARELO": "Amarelo",
    "INDIGENA": "Indígena", "INDÍGENA": "Indígena",
    "IGNORADO": "Não informado", "IGNORADA": "Não informado",
    "NAO INFORMADO": "Não informado", "NÃO INFORMADO": "Não informado",
    "XXXX": "Não informado", "": "Não informado",
}

MAPA_ORIENTACAO_SEXUAL = {
    "HETEROSSEXUAL": "Heterossexual", "HOMOSSEXUAL": "Homossexual",
    "BISSEXUAL": "Bissexual", "ASSEXUAL": "Assexual",
    "IGNORADO": "Não informada", "IGNORADA": "Não informada",
    "NAO INFORMADO": "Não informada", "NÃO INFORMADO": "Não informada",
    "NAO INFORMADA": "Não informada", "NÃO INFORMADA": "Não informada",
    "XXXX": "Não informada", "": "Não informada",
}

MAPA_SEXO_GENERO = {
    "MASCULINO": "Masculino", "FEMININO": "Feminino",
    "OUTROS": "Outros", "OUTRO": "Outros",
    "IGNORADO": "Outros", "NAO SE APLICA": "Outros",
    "NÃO SE APLICA": "Outros", "": "Outros",
}

MAPA_RELACAO_VINCULO = {
    "CO-HABITACAO": "Agregado(a) na unidade doméstica",
    "CO-HABITAÇÃO": "Agregado(a) na unidade doméstica",
    "COABITACAO": "Agregado(a) na unidade doméstica",
    "COABITAÇÃO": "Agregado(a) na unidade doméstica",
    "HOSPITALIDADE": "Agregado(a) na unidade doméstica",
    "RELACOES DOMESTICAS": "Agregado(a) na unidade doméstica",
    "RELAÇÕES DOMÉSTICAS": "Agregado(a) na unidade doméstica",
    "DOMESTICAS": "Agregado(a) na unidade doméstica",
    "DOMÉSTICAS": "Agregado(a) na unidade doméstica",
    "AGREGADO": "Agregado(a) na unidade doméstica",
    "CONJUGE": "Cônjuge / Companheiro(a)",
    "CÔNJUGE": "Cônjuge / Companheiro(a)",
    "COMPANHEIRO": "Cônjuge / Companheiro(a)",
    "COMPANHEIRA": "Cônjuge / Companheiro(a)",
    "MARIDO": "Cônjuge / Companheiro(a)",
    "ESPOSA": "Cônjuge / Companheiro(a)",
    "ESPOSO": "Cônjuge / Companheiro(a)",
    "CONVIVENTE": "Cônjuge / Companheiro(a)",
    "AMÁSIO": "Cônjuge / Companheiro(a)",
    "AMASIO": "Cônjuge / Companheiro(a)",
    "AMÁSIA": "Cônjuge / Companheiro(a)",
    "AMASIA": "Cônjuge / Companheiro(a)",
    "NAMORADO": "Namorado(a)", "NAMORADA": "Namorado(a)",
    "EX-CONJUGE": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-CÔNJUGE": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-COMPANHEIRO": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-COMPANHEIRA": "Ex-cônjuge / Ex-companheiro(a)",
    "EX CONJUGE": "Ex-cônjuge / Ex-companheiro(a)",
    "EX CÔNJUGE": "Ex-cônjuge / Ex-companheiro(a)",
    "EX COMPANHEIRO": "Ex-cônjuge / Ex-companheiro(a)",
    "EX COMPANHEIRA": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-MARIDO": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-ESPOSA": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-CONVIVENTE": "Ex-cônjuge / Ex-companheiro(a)",
    "EX-NAMORADO": "Ex-namorado(a)", "EX-NAMORADA": "Ex-namorado(a)",
    "EX NAMORADO": "Ex-namorado(a)", "EX NAMORADA": "Ex-namorado(a)",
    "PAI": "Pai", "MAE": "Mãe", "MÃE": "Mãe",
    "PADRASTO": "Padrastro", "MADRASTA": "Madrasta",
    "FILHO": "Filho(a)", "FILHA": "Filho(a)",
    "IRMAO": "Irmão / Irmã", "IRMÃ": "Irmão / Irmã",
    "IRMÃO": "Irmão / Irmã", "IRMA": "Irmão / Irmã",
    "AVO": "Avô / Avó", "AVÔ": "Avô / Avó", "AVÓ": "Avô / Avó",
    "TIO": "Tio(a)", "TIA": "Tio(a)",
    "PRIMO": "Primo(a)", "PRIMA": "Primo(a)",
    "ENTEADO": "Enteado(a)", "ENTEADA": "Enteado(a)",
    "CUNHADO": "Cunhado(a)", "CUNHADA": "Cunhado(a)",
    "GENRO": "Genro / Nora", "NORA": "Genro / Nora",
    "SOGRO": "Sogro(a)", "SOGRA": "Sogro(a)",
    "AMIGO": "Amigo(a)", "AMIGA": "Amigo(a)",
    "VIZINHO": "Vizinho(a)", "VIZINHA": "Vizinho(a)",
    "EMPREGADOR": "Empregador(a)", "EMPREGADORA": "Empregador(a)",
    "OUTRO PARENTESCO": "Outros",
    "OUTROS": "Outros", "OUTRO": "Outros",
    "CONHECIDOS": "Outros", "DESCONHECIDO": "Outros",
}


# ============================================================
# FUNÇÕES DE EXTRAÇÃO DE TEXTO
# ============================================================

def extrair_texto_pdf_nativo(pdf_path):
    """Extrai texto de PDF nativo usando pdfplumber."""
    texto_completo = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for pagina in pdf.pages:
                texto = pagina.extract_text()
                if texto:
                    texto_completo += texto + "\n\n"
    except Exception as e:
        print(f"Erro ao extrair texto nativo: {e}")
    return texto_completo


def preprocessar_imagem(imagem):
    """Pré-processa imagem para melhorar OCR."""
    img_gray = imagem.convert('L')
    try:
        import numpy as np
        img_array = np.array(img_gray)
        if np.std(img_array) < 50:
            img_gray = ImageEnhance.Contrast(img_gray).enhance(2.0)
        if np.mean(np.array(img_gray)) < 100:
            img_gray = ImageEnhance.Brightness(img_gray).enhance(1.5)
    except ImportError:
        pass
    img_gray = img_gray.filter(ImageFilter.SHARPEN)
    return img_gray


def extrair_texto_ocr(pdf_path):
    """Extrai texto de PDF escaneado usando OCR."""
    texto_completo = ""
    try:
        imagens = convert_from_path(pdf_path, dpi=300)
        for imagem in imagens:
            img_processada = preprocessar_imagem(imagem)
            texto = pytesseract.image_to_string(
                img_processada, lang='por+eng', config='--psm 6'
            )
            texto_completo += texto + "\n\n"
    except Exception as e:
        print(f"Erro no OCR: {e}")
    return texto_completo


def extrair_texto(pdf_path):
    """Extrai texto do PDF, usando OCR se necessário."""
    texto = extrair_texto_pdf_nativo(pdf_path)
    texto_limpo = re.sub(r'\s+', '', texto)
    if len(texto_limpo) < 200:
        texto = extrair_texto_ocr(pdf_path)
        return texto, True
    return texto, False


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def limpar(texto):
    if not texto:
        return ""
    return re.sub(r'\s+', ' ', texto).strip()


def eh_invalido(valor):
    if not valor:
        return True
    v = valor.strip().upper()
    return v in ["XXXX", "XXXXX", "XX", "X", "---", "N/A", ""]


# ============================================================
# PARSING DOS DADOS GERAIS
# ============================================================

def extrair_numero_reds(texto):
    match = re.search(r'N[º°]\s*(\d{4}-\d{9,12}-\d{3})', texto)
    if match:
        return match.group(1)
    match2 = re.search(r'(\d{4}-\d{9,}-\d{3})', texto)
    return match2.group(1) if match2 else ""


def extrair_data_hora_fato(texto):
    linhas = texto.split('\n')
    for i, linha in enumerate(linhas):
        if 'DATA/HORA DO FATO' in linha.upper():
            if i + 1 < len(linhas):
                proxima = linhas[i + 1].strip()
                match = re.search(r'(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})', proxima)
                if match:
                    return match.group(1), match.group(2)
            break
    return "", ""


def extrair_data_registro(texto):
    linhas = texto.split('\n')
    for i, linha in enumerate(linhas):
        if 'DATA DO REGISTRO' in linha.upper():
            if i + 1 < len(linhas):
                match = re.search(r'(\d{2}/\d{2}/\d{4})', linhas[i + 1])
                if match:
                    return match.group(1)
            break
    return ""


def extrair_municipio_uf_fato(texto):
    """Extrai município e UF do local do fato (seção DADOS DA OCORRÊNCIA)."""
    linhas = texto.split('\n')
    in_ocorrencia = False
    ufs = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO"

    for i, linha in enumerate(linhas):
        if 'DADOS DA OCORR' in linha.upper():
            in_ocorrencia = True
        if in_ocorrencia and 'QUALIFICA' in linha.upper() and 'ENVOLVIDOS' in linha.upper():
            break
        if in_ocorrencia and re.search(r'MUNIC[IÍ]PIO', linha, re.IGNORECASE) and re.search(r'\bUF\b', linha, re.IGNORECASE) and re.search(r'PA[IÍ]S', linha, re.IGNORECASE):
            if i + 1 < len(linhas):
                proxima = linhas[i + 1].strip()
                match = re.match(rf'(.+?)\s+({ufs})\s+BRASIL', proxima, re.IGNORECASE)
                if match:
                    return match.group(2).upper(), limpar(match.group(1)).title()
    return "", ""


def extrair_descricao_lugar(texto):
    linhas = texto.split('\n')
    for i, linha in enumerate(linhas):
        if 'DESCRI' in linha.upper() and 'LUGAR' in linha.upper():
            if i + 1 < len(linhas):
                partes = re.split(r'\s{2,}', linhas[i + 1].strip())
                if partes and not eh_invalido(partes[0]):
                    return limpar(partes[0])
            break
    return ""


def extrair_alvo_evento(texto):
    linhas = texto.split('\n')
    for i, linha in enumerate(linhas):
        if 'ALVO DO EVENTO' in linha.upper():
            if i + 1 < len(linhas):
                return limpar(linhas[i + 1])
            break
    return ""


def extrair_causa_presumida(texto):
    linhas = texto.split('\n')
    for i, linha in enumerate(linhas):
        if 'CAUSA PRESUMIDA' in linha.upper():
            if i + 1 < len(linhas):
                return limpar(linhas[i + 1])
            break
    return ""


def extrair_relacao_formulario_risco(texto):
    """Extrai relação do formulário de avaliação de risco."""
    linhas = texto.split('\n')
    for i, linha in enumerate(linhas):
        if 'RELA' in linha.upper() and 'ENTRE' in linha.upper() and 'AGRESSOR' in linha.upper():
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                if len(valores) >= 2:
                    return limpar(valores[-1])
                elif len(valores) == 1:
                    return limpar(valores[0])
            break
    return ""


# ============================================================
# EXTRAÇÃO DE ENVOLVIDOS — ABORDAGEM POR POSIÇÃO
# ============================================================

def dividir_em_envolvidos(texto):
    """Divide o texto em seções de envolvidos usando posições dos marcadores.
    Cada ENVOLVIDO N pode aparecer múltiplas vezes (continuação em outra página).
    Concatenamos todos os blocos do mesmo número.
    """
    matches = list(re.finditer(r'ENVOLVIDO\s+(\d+)', texto))

    if not matches:
        return {}

    envolvidos = {}
    for idx, match in enumerate(matches):
        num = match.group(1)
        start = match.end()
        # O fim é o início do próximo ENVOLVIDO ou o fim do texto
        if idx + 1 < len(matches):
            end = matches[idx + 1].start()
        else:
            end = len(texto)

        bloco = texto[start:end]

        if num in envolvidos:
            envolvidos[num] += "\n" + bloco
        else:
            envolvidos[num] = bloco

    return envolvidos


def parsear_envolvido(bloco):
    """Parseia um bloco de texto de um envolvido."""
    linhas = bloco.split('\n')
    dados = {
        'tipo_envolvimento': '',
        'sexo': '',
        'nome_completo': '',
        'data_nascimento': '',
        'cpf': '',
        'estado_civil': '',
        'orientacao_sexual': '',
        'identidade_genero': '',
        'cutis': '',
        'mae': '',
        'pai': '',
        'relacao_vitima_autor': '',
        'endereco': '',
        'bairro': '',
        'municipio': '',
        'uf': '',
    }

    for i, linha in enumerate(linhas):
        lu = linha.upper().strip()

        # SEXO TIPO ENVOLVIMENTO ...
        if lu.startswith('SEXO') and 'TIPO ENVOLVIMENTO' in lu:
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                if len(valores) >= 2:
                    dados['sexo'] = limpar(valores[0])
                    dados['tipo_envolvimento'] = limpar(valores[1])
                elif len(valores) == 1:
                    # Pode estar tudo junto com espaço simples
                    parts = linhas[i + 1].strip().split()
                    if parts:
                        dados['sexo'] = parts[0]
                        dados['tipo_envolvimento'] = ' '.join(parts[1:])

        # NOME COMPLETO
        elif lu == 'NOME COMPLETO':
            if i + 1 < len(linhas):
                val = limpar(linhas[i + 1])
                if not eh_invalido(val) and not any(k in val.upper() for k in ['NACIONALIDADE', 'DIGITADOR', 'REGISTRO']):
                    dados['nome_completo'] = val

        # NACIONALIDADE DATA NASCIMENTO NATURALIDADE / UF
        elif 'NACIONALIDADE' in lu and 'DATA NASCIMENTO' in lu:
            if i + 1 < len(linhas):
                dn = re.search(r'(\d{2}/\d{2}/\d{4})', linhas[i + 1])
                if dn:
                    dados['data_nascimento'] = dn.group(1)

        # IDADE APARENTE GRAU DA LESÃO ESTADO CIVIL
        elif 'ESTADO CIVIL' in lu and ('IDADE' in lu or 'GRAU' in lu):
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                if valores:
                    ec = limpar(valores[-1])
                    if not eh_invalido(ec):
                        dados['estado_civil'] = ec

        # ORIENTAÇÃO SEXUAL IDENTIDADE DE GÊNERO
        elif 'ORIENTA' in lu and 'SEXUAL' in lu:
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                if len(valores) >= 2:
                    dados['orientacao_sexual'] = limpar(valores[0])
                    dados['identidade_genero'] = limpar(valores[1])
                elif len(valores) == 1:
                    # Tentar separar por espaço simples se contém termos conhecidos
                    val = linhas[i + 1].strip()
                    for termo_os in ['IGNORADO', 'HETEROSSEXUAL', 'HOMOSSEXUAL', 'BISSEXUAL', 'ASSEXUAL']:
                        if val.upper().startswith(termo_os):
                            dados['orientacao_sexual'] = termo_os
                            resto = val[len(termo_os):].strip()
                            if resto:
                                dados['identidade_genero'] = resto
                            break

        # CUTIS OCUPAÇÃO ATUAL
        elif lu.startswith('CUTIS'):
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                if len(valores) >= 2:
                    if not eh_invalido(valores[0]):
                        dados['cutis'] = limpar(valores[0])
                elif len(valores) == 1:
                    # Tentar separar: PARDA DESEMPREGADO
                    val = linhas[i + 1].strip()
                    for cor in ['PARDA', 'PARDO', 'NEGRA', 'NEGRO', 'PRETA', 'PRETO', 'BRANCA', 'BRANCO', 'AMARELA', 'AMARELO', 'INDIGENA', 'INDÍGENA', 'IGNORADO', 'IGNORADA']:
                        if val.upper().startswith(cor):
                            dados['cutis'] = cor
                            break
                    if not dados['cutis'] and not eh_invalido(val):
                        dados['cutis'] = val.split()[0] if val.split() else ''

        # MÃE (exatamente a label)
        elif lu in ('MÃE', 'MAE'):
            if i + 1 < len(linhas):
                val = limpar(linhas[i + 1])
                if not eh_invalido(val) and 'PAI' != val.upper().strip():
                    dados['mae'] = val

        # PAI (exatamente a label)
        elif lu == 'PAI':
            if i + 1 < len(linhas):
                val = limpar(linhas[i + 1])
                if not eh_invalido(val) and 'TIPO DO DOC' not in val.upper():
                    dados['pai'] = val

        # NÚMERO DOCUMENTO IDENTIDADE ÓRGÃO EXPEDIDOR UF CPF / CNPJ
        elif 'CPF' in lu and 'CNPJ' in lu and ('NÚMERO' in lu or 'NUMERO' in lu or 'ÓRGÃO' in lu or 'ORGAO' in lu):
            if i + 1 < len(linhas):
                cpf_match = re.findall(r'\b(\d{11})\b', linhas[i + 1])
                if cpf_match:
                    d = cpf_match[-1]
                    dados['cpf'] = f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"

        # RELAÇÃO VÍTIMA / AUTOR
        elif 'RELA' in lu and ('TIMA' in lu or 'VITIMA' in lu) and 'AUTOR' in lu:
            if i + 1 < len(linhas):
                val = limpar(linhas[i + 1])
                if not eh_invalido(val) and not any(k in val.upper() for k in ['MÃE', 'MAE', 'NACIONALIDADE']):
                    dados['relacao_vitima_autor'] = val

        # ENDEREÇO (AV., RUA, ETC) NÚMERO KM COMPLEMENTO
        elif 'ENDERE' in lu and ('AV.' in lu or 'RUA' in lu):
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                partes_validas = [v for v in valores if not eh_invalido(v)]
                if partes_validas:
                    dados['endereco'] = ', '.join(partes_validas)

        # BAIRRO MUNICÍPIO UF
        elif re.match(r'BAIRRO\s+MUNIC', lu):
            if i + 1 < len(linhas):
                valores = re.split(r'\s{2,}', linhas[i + 1].strip())
                if len(valores) >= 3:
                    if not eh_invalido(valores[0]):
                        dados['bairro'] = limpar(valores[0])
                    if not eh_invalido(valores[1]):
                        dados['municipio'] = limpar(valores[1])
                    dados['uf'] = limpar(valores[2])
                elif len(valores) == 1:
                    # Pode estar tudo junto com espaço simples
                    # Tentar extrair UF no final (2 letras maiúsculas)
                    val = linhas[i + 1].strip()
                    uf_match = re.search(r'\s+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*$', val)
                    if uf_match:
                        dados['uf'] = uf_match.group(1)
                        antes_uf = val[:uf_match.start()].strip()
                        # Tentar separar bairro e município
                        # Heurística: o município geralmente é a última palavra(s) antes da UF
                        dados['bairro'] = antes_uf

    return dados


# ============================================================
# MAPEAMENTO INTELIGENTE
# ============================================================

def mapear_vinculo(relacao_reds, relacao_risco=""):
    for relacao in [relacao_reds, relacao_risco]:
        if not relacao:
            continue
        relacao_upper = relacao.upper().strip()
        for chave, valor in MAPA_RELACAO_VINCULO.items():
            if chave in relacao_upper:
                return valor

    combinada = ((relacao_reds or "") + " " + (relacao_risco or "")).upper()
    if any(t in combinada for t in ["CONJUGE", "CÔNJUGE", "COMPANHEIRO", "COMPANHEIRA"]):
        return "Ex-cônjuge / Ex-companheiro(a)" if "EX" in combinada else "Cônjuge / Companheiro(a)"
    if "NAMORAD" in combinada:
        return "Ex-namorado(a)" if "EX" in combinada else "Namorado(a)"
    if any(t in combinada for t in ["CO-HABITA", "COABITA", "DOMESTICA", "DOMÉSTICA"]):
        return "Agregado(a) na unidade doméstica"
    return "Outros"


def mapear_ambiente(descricao_lugar, alvo_evento, endereco_autor, endereco_vitima, causa_presumida=""):
    lugar = (descricao_lugar or "").upper()
    alvo = (alvo_evento or "").upper()
    causa = (causa_presumida or "").upper()

    if any(t in lugar for t in ["VIA PUB", "PRACA", "PRAÇA", "PARQUE", "TERMINAL"]):
        return "Local público"
    if any(t in lugar for t in ["COMERCIO", "COMÉRCIO", "EMPRESA", "TRABALHO", "ESCRITORIO", "ESCRITÓRIO", "LOJA"]):
        return "Profissional"
    if any(t in lugar for t in ["INTERNET", "REDE SOCIAL", "WHATSAPP", "ELETRONICO", "ELETRÔNICO", "VIRTUAL"]):
        return "Meio eletrônico"
    if "TERCEIRO" in lugar:
        return "Residência de terceiros"
    if any(t in lugar for t in ["BAR", "RESTAURANTE", "HOTEL", "MOTEL"]):
        return "Local público"

    if any(t in lugar for t in ["CASA", "RESID", "APARTAMENTO", "APTO", "CHACARA", "CHÁCARA"]):
        if endereco_autor and endereco_vitima:
            ea = re.sub(r'\s+', '', endereco_autor.upper())
            ev = re.sub(r'\s+', '', endereco_vitima.upper())
            if ea and ev and _enderecos_similares(ea, ev):
                return "Residência comum com o agressor"
            elif ea and ev:
                return "Residência exclusiva da vítima"
        if "MORADOR" in alvo:
            return "Residência comum com o agressor"
        if "FAMILIAR" in causa or "DOMEST" in causa:
            return "Residência comum com o agressor"
        return "Residência comum com o agressor"

    return "Outros"


def _enderecos_similares(end1, end2):
    nums1 = re.findall(r'\d+', end1)
    nums2 = re.findall(r'\d+', end2)
    if nums1 and nums2 and nums1[0] == nums2[0]:
        p1 = set(re.findall(r'[A-Z]{3,}', end1))
        p2 = set(re.findall(r'[A-Z]{3,}', end2))
        if len(p1 & p2) >= 2:
            return True
    p1 = set(re.findall(r'[A-Z]{3,}', end1))
    p2 = set(re.findall(r'[A-Z]{3,}', end2))
    if p1 and p2:
        menor = min(len(p1), len(p2))
        if menor > 0 and len(p1 & p2) / menor >= 0.6:
            return True
    return False


def mapear_cor_raca(cutis):
    if not cutis:
        return "Não informado"
    return MAPA_CUTIS_COR_RACA.get(cutis.upper().strip(), "Não informado")


def mapear_orientacao_sexual(orientacao):
    if not orientacao:
        return "Não informada"
    return MAPA_ORIENTACAO_SEXUAL.get(orientacao.upper().strip(), "Não informada")


def mapear_genero(sexo):
    if not sexo:
        return "Outros"
    return MAPA_SEXO_GENERO.get(sexo.upper().strip(), "Outros")


# ============================================================
# FUNÇÃO PRINCIPAL
# ============================================================

def processar_reds(pdf_path):
    """Processa um arquivo REDS e retorna os dados estruturados para o CNVD."""

    texto, usou_ocr = extrair_texto(pdf_path)

    if not texto or len(texto.strip()) < 50:
        return {"erro": "Não foi possível extrair texto do PDF. O arquivo pode estar corrompido ou protegido."}

    # Dados gerais
    numero_reds = extrair_numero_reds(texto)
    data_fato, hora_fato = extrair_data_hora_fato(texto)
    data_registro = extrair_data_registro(texto)
    uf_fato, municipio_fato = extrair_municipio_uf_fato(texto)
    descricao_lugar = extrair_descricao_lugar(texto)
    alvo_evento = extrair_alvo_evento(texto)
    causa_presumida = extrair_causa_presumida(texto)
    relacao_risco = extrair_relacao_formulario_risco(texto)

    # Envolvidos
    envolvidos = dividir_em_envolvidos(texto)

    autor = None
    vitima = None

    for num in sorted(envolvidos.keys(), key=int):
        bloco = envolvidos[num]
        dados = parsear_envolvido(bloco)
        tipo = dados.get('tipo_envolvimento', '').upper()

        if 'AUTOR' in tipo and autor is None:
            autor = dados
        elif ('VITIMA' in tipo or 'VÍTIMA' in tipo) and vitima is None:
            vitima = dados

    # Montar resultado
    endereco_autor = ""
    if autor:
        endereco_autor = ' '.join(filter(None, [autor.get('endereco', ''), autor.get('bairro', ''), autor.get('municipio', '')]))
    endereco_vitima = ""
    if vitima:
        endereco_vitima = ' '.join(filter(None, [vitima.get('endereco', ''), vitima.get('bairro', ''), vitima.get('municipio', '')]))

    relacao_vitima = vitima.get('relacao_vitima_autor', '') if vitima else ''

    resultado = {
        "usou_ocr": usou_ocr,
        "dados_gerais": {
            "numero_reds": numero_reds,
            "data_fato": data_fato,
            "hora_fato": hora_fato,
            "data_autuacao": data_registro,
            "uf_fato": uf_fato,
            "cidade_fato": municipio_fato,
            "ambiente_agressao": mapear_ambiente(descricao_lugar, alvo_evento, endereco_autor, endereco_vitima, causa_presumida),
            "vinculo_agressor_vitima": mapear_vinculo(relacao_vitima, relacao_risco),
        },
        "vitima": {
            "nome_civil": vitima.get('nome_completo', '') if vitima else '',
            "nome_social": "",
            "cpf": vitima.get('cpf', '') if vitima else '',
            "nome_pai": vitima.get('pai', '') if vitima else '',
            "nome_mae": vitima.get('mae', '') if vitima else '',
            "data_nascimento": vitima.get('data_nascimento', '') if vitima else '',
            "genero": mapear_genero(vitima.get('sexo', '')) if vitima else 'Feminino',
            "cor_raca": mapear_cor_raca(vitima.get('cutis', '')) if vitima else 'Não informado',
            "orientacao_sexual": mapear_orientacao_sexual(vitima.get('orientacao_sexual', '')) if vitima else 'Não informada',
        },
        "agressor": {
            "nome_civil": autor.get('nome_completo', '') if autor else '',
            "nome_social": "",
            "cpf": autor.get('cpf', '') if autor else '',
            "nome_pai": autor.get('pai', '') if autor else '',
            "nome_mae": autor.get('mae', '') if autor else '',
            "data_nascimento": autor.get('data_nascimento', '') if autor else '',
            "genero": mapear_genero(autor.get('sexo', '')) if autor else 'Masculino',
            "cor_raca": mapear_cor_raca(autor.get('cutis', '')) if autor else 'Não informado',
            "orientacao_sexual": mapear_orientacao_sexual(autor.get('orientacao_sexual', '')) if autor else 'Não informada',
        },
    }

    return resultado


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Uso: python extrator.py <caminho_do_pdf>")
        sys.exit(1)

    resultado = processar_reds(sys.argv[1])
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
