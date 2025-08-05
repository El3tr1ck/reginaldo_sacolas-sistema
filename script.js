document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES E VARIÁVEIS GLOBAIS ---
    const { jsPDF } = window.jspdf;
    const SECRET_KEY = 'regisacolas642';
    let html5QrCode;
    let scannedEncryptedData = null;

    // MUDANÇA CRÍTICA: Variáveis para armazenar os dados e o resultado da criptografia
    let currentReceiptData = null;
    let currentEncryptedData = null; // Armazena o texto criptografado

    // --- SELETORES DE ELEMENTOS DO DOM ---
    const priceWordInput = document.getElementById('price_word');
    const priceWordMode = document.getElementById('price_word_mode');
    const dateInput = document.getElementById('date');
    const dateMode = document.getElementById('date_mode');
    const overlays = document.querySelectorAll('.overlay');
    const previewOverlay = document.getElementById('preview-overlay');
    const scannerOverlay = document.getElementById('scanner-overlay');
    const decryptOverlay = document.getElementById('decrypt-overlay');
    const showPreviewBtn = document.getElementById('show-preview-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const decryptBtn = document.getElementById('decrypt-btn');
    const closeButtons = document.querySelectorAll('.close-modal-btn');
    const qrReaderDiv = document.getElementById('qr-reader');
    const secretKeyInput = document.getElementById('secret-key-input');
    const decryptionResultDiv = document.getElementById('decryption-result');

    // --- FUNÇÕES DE LÓGICA ---
    
    function updateInputVisibility(inputElement, modeSelector) {
        inputElement.style.display = modeSelector.value === 'auto' ? 'none' : 'block';
    }

    function numeroParaExtenso(numero) {
        if (numero === null || isNaN(numero)) return "";
        const valor = parseFloat(numero).toFixed(2).split('.'), inteiros = valor[0], centavos = valor[1];
        const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"], dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"], dezenasEspeciais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"], centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
        function porExtenso(n) {
            if (n < 10) return unidades[n];
            if (n < 20) return dezenasEspeciais[n - 10];
            if (n < 100) return dezenas[Math.floor(n / 10)] + (n % 10 !== 0 ? " e " + unidades[n % 10] : "");
            if (n === 100) return "cem";
            if (n < 1000) return centenas[Math.floor(n / 100)] + (n % 100 !== 0 ? " e " + porExtenso(n % 100) : "");
            if (n === 1000) return "mil";
            if (n < 1000000) return (Math.floor(n / 1000) > 1 ? porExtenso(Math.floor(n / 1000)) + " mil" : "mil") + (n % 1000 !== 0 ? " e " + porExtenso(n % 1000) : "");
            return "";
        }
        let resultado = [];
        if (inteiros > 0) resultado.push(porExtenso(parseInt(inteiros)), parseInt(inteiros) === 1 ? "real" : "reais");
        if (centavos > 0) {
            if (inteiros > 0) resultado.push("e");
            resultado.push(porExtenso(parseInt(centavos)), parseInt(centavos) === 1 ? "centavo" : "centavos");
        }
        return resultado.length > 0 ? resultado.join(" ").charAt(0).toUpperCase() + resultado.join(" ").slice(1) : "Zero reais";
    }

    function getFormData() {
        const uniqueId = crypto.randomUUID().slice(0, 8).toUpperCase();
        const name = document.getElementById("name").value;
        const price = document.getElementById("price").value;
        const product = document.getElementById("product").value;
        const signature = document.getElementById("signature").value;
        const isFiado = document.getElementById("venda_fiada").checked;

        let price_word;
        if (priceWordMode.value === 'auto') {
            const priceNumeric = parseFloat(price.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
            price_word = !isNaN(priceNumeric) ? numeroParaExtenso(priceNumeric) : 'Valor inválido';
        } else {
            price_word = priceWordInput.value;
        }

        let date;
        if (dateMode.value === 'auto') {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear());
            date = `${day}/${month}/${year}`;
        } else {
            date = dateInput.value;
        }

        return { name, price, price_word, product, date, signature, uniqueId, isFiado };
    }

    function encryptData(data) {
        const dataToEncrypt = {
            id: data.uniqueId,
            sig: data.signature,
            date: data.date,
            ref: data.product,
            val: data.price,
            fiado: data.isFiado,
            link: "https://el3tr1ck.github.io/reginaldo_sacolas-sistema/reginaldo_sacolas.html"
        };
        const jsonString = JSON.stringify(dataToEncrypt);
        return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    }

    function showPreview() {
        // Gera os dados e criptografa ELES UMA ÚNICA VEZ
        currentReceiptData = getFormData();
        currentEncryptedData = encryptData(currentReceiptData);
        
        const previewContainer = document.getElementById('html-preview-container');
        
        // Usa o resultado da criptografia que foi armazenado
        const qr = qrcode(0, 'L');
        qr.addData(currentEncryptedData);
        qr.make();
        const qrImgTag = qr.createImgTag(3, 6); 
        
        previewContainer.innerHTML = `
            <div class="preview-header">Reginaldo Sacolas</div>
            <hr class="preview-line" />
            <div class="preview-content">
              <div class="preview-row">
                <div class="preview-field half-width"><span class="preview-label">Nome do mercado:</span><div class="preview-value">${currentReceiptData.name || ' '}</div></div>
                <div class="preview-field half-width"><span class="preview-label">Valor:</span><div class="preview-value">${currentReceiptData.price || ' '}</div></div>
              </div>
              <div class="preview-row"><div class="preview-field full-width"><span class="preview-label">Valor por extenso:</span><div class="preview-value">${currentReceiptData.price_word || ' '}</div></div></div>
              <div class="preview-row"><div class="preview-field full-width"><span class="preview-label">Referente a:</span><div class="preview-value">${currentReceiptData.product || ' '}</div></div></div>
              <div class="preview-row">
                <div class="preview-field half-width"><span class="preview-label">Data:</span><div class="preview-value">${currentReceiptData.date || ' '}</div></div>
                <div class="preview-field half-width"><span class="preview-label">Assinatura:</span><div class="preview-value">${currentReceiptData.signature || ' '}</div></div>
              </div>
              <div class="preview-row"><div class="preview-field full-width"><span class="preview-label">Status:</span><div class="preview-value" style="font-weight: bold; color: ${currentReceiptData.isFiado ? 'var(--primary-color)' : '#333'}">${currentReceiptData.isFiado ? 'VENDA FIADA' : 'Pagamento à vista'}</div></div></div>
              <div class="preview-row" style="margin-top: auto; align-items: flex-end;">
                  <div class="preview-field"><span class="preview-label">ID Recibo:</span><div class="preview-value" style="font-size:9px;">${currentReceiptData.uniqueId}</div></div>
                  <div style="margin-left: auto;">${qrImgTag}</div>
              </div>
            </div>
        `;
        previewOverlay.style.display = 'flex';
    }

    // MUDANÇA CRÍTICA: A FUNÇÃO AGORA RECEBE O TEXTO JÁ CRIPTOGRAFADO
    function generateFinalPDF(data, encryptedString) {
        const jsPDFDoc = new jsPDF({ orientation: 'l', unit: 'mm', format: [105, 80] }); 
        
        jsPDFDoc.setFont("helvetica", "bold"); 
        jsPDFDoc.setTextColor(200, 0, 0); 
        jsPDFDoc.setFontSize(12);
        jsPDFDoc.text("Reginaldo Sacolas", 52.5, 10, { align: "center" }); 
        jsPDFDoc.setDrawColor(200, 0, 0); 
        jsPDFDoc.line(5, 13, 100, 13);

        function drawField(label, value, x, y, width, options = {}) {
            jsPDFDoc.setFontSize(7);
            jsPDFDoc.setTextColor(150, 0, 0);
            jsPDFDoc.setFont('helvetica', 'normal');
            jsPDFDoc.text(label, x, y);
            const textColor = options.textColor || [0, 0, 0];
            jsPDFDoc.setTextColor(textColor[0], textColor[1], textColor[2]);
            jsPDFDoc.setFontSize(8);
            jsPDFDoc.setFont('helvetica', 'bold');
            const textLines = jsPDFDoc.splitTextToSize(value || ' ', width - 2);
            const boxHeight = (textLines.length * 4) + 2;
            jsPDFDoc.roundedRect(x - 1, y + 1, width, boxHeight, 1, 1);
            jsPDFDoc.text(textLines, x + 1, y + 4.5);
            return y + boxHeight + 3;
        }
        
        let yPos = 20;
        let nextY_Nome = drawField("Nome do mercado:", data.name, 7, yPos, 48);
        let nextY_Valor = drawField("Valor:", data.price, 58, yPos, 38);
        yPos = Math.max(nextY_Nome, nextY_Valor);
        yPos = drawField("Valor por extenso:", data.price_word, 7, yPos, 90);
        yPos = drawField("Referente a:", data.product, 7, yPos, 90);
        let yPosDepoisDeData = drawField("Data:", data.date, 7, yPos, 48);
        let yPosDepoisDeAssinatura = drawField("Assinatura:", data.signature, 58, yPos, 38);
        let yPosProximaLinha = Math.max(yPosDepoisDeData, yPosDepoisDeAssinatura);
        
        const qrYPos = yPosProximaLinha - 3;
        
        // USA O TEXTO CRIPTOGRAFADO QUE VEIO COMO PARÂMETRO
        const qr = qrcode(0, 'L');
        qr.addData(encryptedString); // NÃO CRIPTOGRAFA DE NOVO
        qr.make();
        const qrImgData = qr.createDataURL(2, 0);
        jsPDFDoc.addImage(qrImgData, 'PNG', 7, qrYPos, 17, 17);
        
        jsPDFDoc.setFontSize(5);
        jsPDFDoc.setTextColor(100,100,100);
        jsPDFDoc.text("Verifique a autenticidade", 7, qrYPos + 20);

        const statusText = data.isFiado ? 'VENDA FIADA' : 'Pagamento à vista';
        const statusColor = data.isFiado ? [200, 0, 0] : [0, 0, 0];
        drawField("Status:", statusText, 58, yPosProximaLinha, 38, { textColor: statusColor });

        jsPDFDoc.setFontSize(6);
        jsPDFDoc.setTextColor(100, 100, 100);
        jsPDFDoc.setFont('helvetica', 'normal');
        jsPDFDoc.text(`ID do Recibo: ${data.uniqueId}`, 100, 75, { align: 'right' });

        return jsPDFDoc;
    }

    // --- LÓGICA DO SCANNER E DESCRIPTOGRAFIA ---
    function startScanner() {
        scannerOverlay.style.display = 'flex';
        html5QrCode = new Html5Qrcode("qr-reader");
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
            stopScanner();
            scannedEncryptedData = decodedText; 
            decryptOverlay.style.display = 'flex';
            secretKeyInput.focus();
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                document.getElementById('scanner-status').textContent = "Erro ao iniciar a câmera. Verifique as permissões.";
            });
    }
    
    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                scannerOverlay.style.display = 'none';
            }).catch(err => console.error("Falha ao parar o scanner.", err));
        }
        scannerOverlay.style.display = 'none';
    }
    
    function decryptAndDisplay() {
        const enteredKey = secretKeyInput.value;
        if (!enteredKey || !scannedEncryptedData) {
            decryptionResultDiv.innerHTML = '<strong>Erro:</strong> Chave ou dado escaneado ausente.';
            decryptionResultDiv.className = 'result-error';
            return;
        }
        try {
            const bytes = CryptoJS.AES.decrypt(scannedEncryptedData, enteredKey);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedString) { 
                throw new Error("Chave incorreta ou dados corrompidos.");
            }
            const data = JSON.parse(decryptedString);
            decryptionResultDiv.className = 'result-ok';
            decryptionResultDiv.innerHTML = `
                <strong>Recibo Válido!</strong><br>
                <hr>
                <strong>ID:</strong> ${data.id}<br>
                <strong>Assinatura:</strong> ${data.sig}<br>
                <strong>Data:</strong> ${data.date}<br>
                <strong>Valor:</strong> ${data.val}<br>
                <strong>Referente a:</strong> ${data.ref}<br>
                <strong>Status:</strong> <span style="font-weight:bold; color: ${data.fiado ? 'var(--primary-color)' : '#333'}">${data.fiado ? 'VENDA FIADA' : 'Pagamento à vista'}</span><br>
                <strong>Link:</strong> <a href="${data.link}" target="_blank">Ver Projeto</a>
            `;
        } catch (e) {
            decryptionResultDiv.className = 'result-error';
            decryptionResultDiv.innerHTML = `<strong>Falha na Verificação:</strong><br>A chave secreta está incorreta ou o QR Code é inválido.`;
        }
    }

    // --- EVENT LISTENERS ---
    
    showPreviewBtn.addEventListener('click', showPreview);
    
    downloadPdfBtn.addEventListener('click', () => {
        // AGORA REUTILIZA OS DADOS E O TEXTO CRIPTOGRAFADO DA PRÉ-VISUALIZAÇÃO
        if (!currentReceiptData || !currentEncryptedData) {
            alert("Por favor, gere uma pré-visualização primeiro clicando em 'Exibir Impressão'.");
            return;
        }
        // Passa ambos para a função do PDF
        const finalDoc = generateFinalPDF(currentReceiptData, currentEncryptedData);
        finalDoc.save(`recibo_${currentReceiptData.name.replace(/ /g, '_')}_${currentReceiptData.uniqueId}.pdf`);
    });

    priceWordMode.addEventListener('change', () => updateInputVisibility(priceWordInput, priceWordMode));
    dateMode.addEventListener('change', () => updateInputVisibility(dateInput, dateMode));

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'none';
            if(targetId === 'scanner-overlay') stopScanner(); 
            if(targetId === 'decrypt-overlay') { 
                secretKeyInput.value = '';
                decryptionResultDiv.innerHTML = '';
            }
        });
    });
    
    overlays.forEach(overlay => {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.style.display = 'none';
                if(overlay.id === 'scanner-overlay') stopScanner();
                if(overlay.id === 'decrypt-overlay') {
                    secretKeyInput.value = '';
                    decryptionResultDiv.innerHTML = '';
                }
            }
        });
    });

    cameraBtn.addEventListener('click', startScanner);
    decryptBtn.addEventListener('click', decryptAndDisplay);
    secretKeyInput.addEventListener('keyup', (event) => {
        if(event.key === 'Enter') decryptAndDisplay();
    });

    // --- INICIALIZAÇÃO ---
    updateInputVisibility(priceWordInput, priceWordMode);
    updateInputVisibility(dateInput, dateMode);
});
