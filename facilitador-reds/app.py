"""
Facilitador REDS → CNVD/CNMP
Servidor web local para extração de dados de REDS.
Roda EXCLUSIVAMENTE em localhost (127.0.0.1) — nenhum dado sai da máquina.
"""

import os
import sys
import json
import tempfile
import webbrowser
import threading
import secrets
from flask import Flask, request, jsonify, render_template, send_from_directory

# Importar o módulo de extração
from extrator import processar_reds

# Configuração do Flask
app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# Chave secreta para sessões (gerada a cada execução)
app.secret_key = secrets.token_hex(32)

# Configurações de segurança
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # Limite de 50MB por upload
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp(prefix='facilitador_reds_')

EXTENSOES_PERMITIDAS = {'pdf'}


def extensao_permitida(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in EXTENSOES_PERMITIDAS


# ============================================================
# HEADERS DE SEGURANÇA
# ============================================================

@app.after_request
def adicionar_headers_seguranca(response):
    """Adiciona headers de segurança a todas as respostas."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self' data:; "
        "connect-src 'self'"
    )
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response


# ============================================================
# ROTAS
# ============================================================

@app.route('/')
def index():
    """Página principal."""
    return render_template('index.html')


@app.route('/processar', methods=['POST'])
def processar():
    """Recebe o PDF e retorna os dados extraídos."""
    if 'arquivo' not in request.files:
        return jsonify({'erro': 'Nenhum arquivo enviado.'}), 400

    arquivo = request.files['arquivo']

    if arquivo.filename == '':
        return jsonify({'erro': 'Nenhum arquivo selecionado.'}), 400

    if not extensao_permitida(arquivo.filename):
        return jsonify({'erro': 'Formato não permitido. Envie apenas arquivos PDF.'}), 400

    # Salvar temporariamente
    caminho_temp = os.path.join(app.config['UPLOAD_FOLDER'], 'reds_temp.pdf')
    try:
        arquivo.save(caminho_temp)

        # Processar
        resultado = processar_reds(caminho_temp)

        return jsonify(resultado)

    except Exception as e:
        return jsonify({'erro': f'Erro ao processar o arquivo: {str(e)}'}), 500

    finally:
        # Remover arquivo temporário imediatamente
        try:
            if os.path.exists(caminho_temp):
                os.remove(caminho_temp)
        except:
            pass


@app.route('/health')
def health():
    """Endpoint de verificação de saúde."""
    return jsonify({'status': 'ok', 'mensagem': 'Facilitador REDS operacional'})


# ============================================================
# INICIALIZAÇÃO
# ============================================================

def abrir_navegador(porta):
    """Abre o navegador após um breve delay."""
    import time
    time.sleep(1.5)
    webbrowser.open(f'http://127.0.0.1:{porta}')


def main():
    porta = 5000

    # Verificar se a porta está disponível
    import socket
    while porta < 5100:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('127.0.0.1', porta))
            sock.close()
            break
        except OSError:
            porta += 1

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║          FACILITADOR REDS → CNVD/CNMP                       ║
║                                                              ║
║  Servidor rodando em: http://127.0.0.1:{porta}                ║
║                                                              ║
║  ⚠  PROCESSAMENTO 100% LOCAL — Nenhum dado sai da máquina   ║
║  ⚠  Feche esta janela para encerrar o servidor               ║
╚══════════════════════════════════════════════════════════════╝
""")

    # Abrir navegador automaticamente
    thread_navegador = threading.Thread(target=abrir_navegador, args=(porta,), daemon=True)
    thread_navegador.start()

    # Rodar servidor APENAS em localhost
    app.run(
        host='127.0.0.1',
        port=porta,
        debug=False,
        use_reloader=False
    )


if __name__ == '__main__':
    main()
