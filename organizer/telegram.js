const axios = require('axios');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, 'config.json');

function getConfig() {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath));
}

function enviarTelegram(msg) {
  const config = getConfig();
  if (!config.telegram_token || !config.chat_id) {
    console.warn('Telegram não configurado corretamente');
    return;
  }

  const url = `https://api.telegram.org/bot${config.telegram_token}/sendMessage`;
  axios.post(url, {
    chat_id: config.chat_id,
    text: msg,
    parse_mode: 'Markdown'
  }).then(() => {
    console.log('✅ Notificação Telegram enviada');
  }).catch(err => {
    console.error('Erro ao enviar Telegram:', err.message);
  });
}

module.exports = { enviarTelegram };