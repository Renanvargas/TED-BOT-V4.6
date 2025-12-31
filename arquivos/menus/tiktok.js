// CASE TIKTOK / TTKMP4
// Arquivo isolado e autossuficiente

const fs = require('fs');
const axios = require('axios');

const SESSION_PATH = './session';

function isFatalSessionError(err) {
  const msg = String(err);
  return (
    msg.includes('Over 2000 messages') ||
    msg.includes('Failed to decrypt message') ||
    msg.includes('SessionError') ||
    msg.includes('fillMessageKeys') ||
    msg.includes('maybeStepRatchet')
  );
}

function resetSessionAndRestart() {
  try {
    if (fs.existsSync(SESSION_PATH)) {
      fs.rmSync(SESSION_PATH, { recursive: true, force: true });
    }
  } catch {}
  process.exit(1);
}

module.exports = async function caseTikTok({
  sock,
  from,
  args,
  sasah,
  prefix,
  API_KEY_TED
}) {
  const reply = (txt) => {
    return sock.sendMessage(from, { text: txt }, { quoted: sasah });
  };

  try {
    const url = args[0];
    if (!url) {
      return reply(`❌ Informe o link do TikTok.\nExemplo: ${prefix}ttk https://vm.tiktok.com/...`);
    }

    const response = await axios.get('https://tedzinho.com.br/api/download/tiktok', {
      params: { apikey: API_KEY_TED, url },
      timeout: 20000
    });

    const data = response.data;
    if (data.status !== 'OK' || !data.resultado) {
      return reply('⚠️ Não foi possível obter o vídeo.');
    }

    const r = data.resultado;
    const author = r.author?.nickname || 'Desconhecido';
    const user = r.author?.uniqueId || 'unknown';
    const desc = r.desc || 'Vídeo TikTok';

    let videoUrl = null;
    if (Array.isArray(r.video?.playAddr) && r.video.playAddr.length) {
      videoUrl = r.video.playAddr[0];
    } else if (Array.isArray(r.video?.downloadAddr) && r.video.downloadAddr.length) {
      videoUrl = r.video.downloadAddr[0];
    }

    if (!videoUrl) {
      return reply('❌ Link do vídeo indisponível.');
    }

    const videoBuffer = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.tiktok.com/' }
    }).then(r => r.data);

    await sock.sendMessage(from, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      fileName: `${user}.mp4`,
      caption: `🎬 *Vídeo TikTok*\n👤 Autor: ${author}\n🔗 @${user}\n📝 ${desc}`
    }, { quoted: sasah });

  } catch (e) {
    if (isFatalSessionError(e)) {
      await reply('⚠️ Sessão do WhatsApp corrompida.\n🔄 Reiniciando conexão...');
      resetSessionAndRestart();
      return;
    }

    await reply('❌ Erro ao baixar o vídeo do TikTok.');
  }
};
