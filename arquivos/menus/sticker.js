const fs = require('fs');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const webp = require('node-webpmux');

module.exports = {
  name: 'sticker',
  alias: ['s', 'stickergifp', 'figura', 'f', 'figu', 'st', 'stk', 'fgif', 'fsticker'],
  description: 'Cria figurinha esticada a partir de imagem ou vídeo',
  category: 'Utilidades',

  async execute(sock, from, Info, args, command, config) {
    try {
      const quoted = Info.message?.extendedTextMessage?.contextInfo?.quotedMessage || {};
      const msgContent = Info.message || {};
      const pushname = Info.pushName || 'Usuário';
      const nomebot = config.NomeDoBot || config.nomebot || 'Bot';

      // 🔹 Nome do grupo
      let groupName = 'Grupo';
      try {
        if (from.endsWith('@g.us')) {
          const metadata = await sock.groupMetadata(from);
          groupName = metadata?.subject || 'Grupo';
        }
      } catch {}

      // 🔹 Texto padrão do pack
      let packName = `📛 Bot: ${nomebot}\n👤 Solicitante: ${pushname}\n👑 Grupo: ${groupName}`;
      let authorName = `🤖 ${nomebot}`;

      // 🔹 Personalização manual
      if (args.length > 0) {
        const text = args.join(" ");
        const parts = text.split(/[|/]/).map(p => p.trim());
        packName = `📛 Bot: ${parts[0] || nomebot}\n👤 Solicitante: ${parts[1] || pushname}\n👑 Grupo: ${parts[2] || groupName}`;
      }

      packName = packName.substring(0, 80);
      authorName = authorName.substring(0, 30);

      const isImage = !!msgContent.imageMessage || !!quoted.imageMessage;
      const isVideo = !!msgContent.videoMessage || !!quoted.videoMessage;
      if (!isImage && !isVideo) {
        return sock.sendMessage(from, {
          text: "❌ Envie ou marque uma imagem/vídeo (até 10s) para criar figurinha."
        }, { quoted: Info });
      }

      const mediaType = isImage ? "image" : "video";
      const mediaObj = isImage
        ? (msgContent.imageMessage || quoted.imageMessage)
        : (msgContent.videoMessage || quoted.videoMessage);

      // 🔹 Duração máxima
      if (mediaType === "video" && mediaObj.seconds > 10) {
        return sock.sendMessage(from, { text: "❌ O vídeo precisa ter no máximo 10 segundos." }, { quoted: Info });
      }

      await sock.sendMessage(from, { react: { text: "⏳", key: Info.key } });

      // 🔹 Baixa mídia
      const stream = await downloadContentFromMessage(mediaObj, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');
      const timestamp = Date.now();
      const inputFile = `./temp/input_${timestamp}.${isImage ? 'jpg' : 'mp4'}`;
      const outputFile = `./temp/output_${timestamp}.webp`;
      const finalFile = `./temp/final_${timestamp}.webp`;

      fs.writeFileSync(inputFile, buffer);

      // ⚙️ ESCALA FIXA 512x512 (esticada)
      const ffmpegCommand = mediaType === 'image'
        ? `ffmpeg -i "${inputFile}" -vf "scale=512:512:flags=lanczos,format=rgba" -vcodec libwebp -lossless 1 -qscale 70 -preset picture -an -vsync 0 -y "${outputFile}"`
        : `ffmpeg -i "${inputFile}" -vf "fps=15,scale=512:512:flags=lanczos,format=rgba" -vcodec libwebp -qscale 70 -preset default -loop 0 -an -vsync 0 -t 10 -y "${outputFile}"`;

      await execAsync(ffmpegCommand);
      if (!fs.existsSync(outputFile)) throw new Error('Falha ao criar figurinha.');

      // 🔹 Adiciona EXIF (informações do pack)
      const img = new webp.Image();
      await img.load(outputFile);

      const exifData = {
        "sticker-pack-id": `pack-${timestamp}`,
        "sticker-pack-name": packName,
        "sticker-pack-publisher": authorName,
        "emojis": ["🔥"]
      };

      const exifHeader = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
      ]);
      const jsonBuffer = Buffer.from(JSON.stringify(exifData), 'utf8');
      exifHeader.writeUInt32LE(jsonBuffer.length, 14);
      const fullExif = Buffer.concat([exifHeader, jsonBuffer]);
      img.exif = fullExif;

      await img.save(finalFile);

      await sock.sendMessage(from, { sticker: fs.readFileSync(finalFile) }, { quoted: Info });
      await sock.sendMessage(from, { react: { text: "✅", key: Info.key } });

      // Limpeza
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
      fs.unlinkSync(finalFile);

    } catch (err) {
      console.error('❌ Erro no comando sticker:', err);
      await sock.sendMessage(from, { react: { text: "❌", key: Info.key } });
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao gerar a figurinha." }, { quoted: Info });
    }
  }
};