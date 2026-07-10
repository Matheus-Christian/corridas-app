function formatEMV(id, value) {
  const len = String(value).length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function computeCRC16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates a valid PIX EMV Copia e Cola payload.
 * 
 * @param {string} key PIX key (Email, CPF, CNPJ, Phone or Random Key)
 * @param {number|null} amount Optional transaction amount
 * @param {string} merchantName Merchant Name (default: 'Caronas App')
 * @param {string} merchantCity Merchant City (default: 'SAO PAULO')
 * @param {string} txId Transaction ID (default: '***')
 * @returns {string} Fully formed PIX Copia e Cola payload
 */
export function generatePixPayload(key, amount = null, merchantName = 'Caronas App', merchantCity = 'SAO PAULO', txId = '***') {
  let sanitizedKey = key.trim().replace(/\s+/g, '');
  
  const gui = formatEMV('00', 'br.gov.bcb.pix');
  const keyEMV = formatEMV('01', sanitizedKey);
  const merchantAccountInfo = formatEMV('26', gui + keyEMV);
  
  const payloadFormat = formatEMV('00', '01');
  const categoryCode = formatEMV('52', '0000');
  const currency = formatEMV('53', '986');
  
  let amountEMV = '';
  if (amount !== null && amount !== undefined) {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      const formattedAmount = numAmount.toFixed(2);
      amountEMV = formatEMV('54', formattedAmount);
    }
  }
  
  const countryCode = formatEMV('58', 'BR');
  
  // Normalize merchant name and city (no accents, uppercase, clean characters, length limit)
  const normalizedName = merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 25);
  const normalizedCity = merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 15);
    
  const nameEMV = formatEMV('59', normalizedName || 'CARONAS APP');
  const cityEMV = formatEMV('60', normalizedCity || 'SAO PAULO');
  
  const additionalData = formatEMV('62', formatEMV('05', txId || '***'));
  
  let payload = payloadFormat + merchantAccountInfo + categoryCode + currency + amountEMV + countryCode + nameEMV + cityEMV + additionalData + '6304';
  const crc = computeCRC16(payload);
  return payload + crc;
}
