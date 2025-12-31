const axios = require('axios');
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'pinterest',
  alias: ['pin'],
  description: 'Busca e envia imagens do Pinterest em carrossel',
  category: 'Mídia',

  async execute(sock, from, Info, args, body, command, prefix) {
    const react = async (emoji) => {
      try {
        await sock.sendMessage(from, { react: { text: emoji, key: Info.key } });
      } catch {}
    };

    try {
      let query = args?.join(' ') || body?.slice(command.length + prefix.prefix.length).trim();
      if (!query) {
        await react('❌');
        return sock.sendMessage(from, { 
          text: `❌ Digite o termo de pesquisa\nExemplo: ${prefix}pinterest gatos`
        }, { quoted: Info });
      }

      await react('⏳');

      const API_URL = `https://tedzinho.com.br/api/pesquisa/pinterest?apikey=J&query=${encodeURIComponent(query)}`;
      const res = await axios.get(API_URL);
      const data = res.data;

      if (!data?.resultado?.length) {
        await react('❌');
        return sock.sendMessage(from, { text: '⚠️ Nenhum resultado encontrado no Pinterest.' }, { quoted: Info });
      }

      const imagens = data.resultado;
      const cards = [];

      // Cria até 10 cards para o carrossel
      for (let i = 0; i < Math.max(1, Math.min(10, imagens.length)); i++) {
        const img = imagens[i];

        const media = await prepareWAMessageMedia(
          { image: { url: img.image } },
          { upload: sock.waUploadToServer }
        );

        const card = {
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: `📌 *Pinterest ${i + 1}*\n🔍 ${query}\n👤 ${img.fullname || "Desconhecido"}`
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            title: "Resultado do Pinterest",
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🔗 Abrir no navegador",
                  url: img.source
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "⭐ Curtir",
                  id: `like_${i}`
                })
              }
            ]
          })
        };
        cards.push(card);
      }

      // Envia apenas o carrossel
      const carouselMessage = generateWAMessageFromContent(from, {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: { text: `🖼️ Resultados para *${query}*` },
              carouselMessage: { cards },
              footer: { text: "Use ➡️ para navegar entre as imagens" },
            }
          }
        }
      }, { quoted: Info });

      await sock.relayMessage(from, carouselMessage.message, { messageId: carouselMessage.key.id });
      await react('✅');

    } catch (err) {
      console.error("Erro no comando pinterest:", err);
      await react('❌');
      await sock.sendMessage(from, { text: "❌ Erro ao buscar imagens do Pinterest." }, { quoted: Info });
    }
  }
};