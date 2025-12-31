const axios = require("axios");

const MEDIA_CACHE_PATH = "./database/assets/webp/tmp/tmp2/tmp6/media_cache_8573.json";

async function playpriCommand(sock, from, Info, args, prefix, API_KEY_TED) {
    const emojiSuccess = ["💥", "✨", "🌟", "🔥", "💫", "💢", "💦"];
    const randomEmoji = emojiSuccess[Math.floor(Math.random() * emojiSuccess.length)];
    
    try {
        const reply = (text) => sock.sendMessage(from, { text }, { quoted: Info });
        
        const query = args.join(" ");
        if (!query) {
            await sock.sendMessage(from, { 
                react: { text: "❌", key: Info.key } 
            });
            return reply(`Uso: ${prefix}play <nome da música>`);
        }
        
        await sock.sendMessage(from, { 
            react: { text: "⏳", key: Info.key } 
        });
        
        const apiUrl = `https://systemzone.store/api/play?text=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        if (!data || data.status !== true || !data.download_url) {
            await sock.sendMessage(from, { 
                react: { text: "❌", key: Info.key } 
            });
            return reply("❌ Música não encontrada!");
        }

        const views = data.views ? new Intl.NumberFormat('pt-BR').format(data.views) : "N/A";
        const caption = `🎧 *TOCANDO AGORA* 🎧
━━━━━━━━━━━━━━━━━━━━
📀 *Título:* ${data.title}
👤 *Artista:* ${data.author}
⏰ *Duração:* ${data.duration || "N/A"}
👁️ *Visualizações:* ${views}
🔗 *YouTube:* ${data.youtube_url || "N/A"}
━━━━━━━━━━━━━━━━━━━━`;
        
        if (data.thumbnail) {
            await sock.sendMessage(from, {
                image: { url: data.thumbnail },
                caption
            }, { quoted: Info });
        }
        
        const audioRes = await axios.get(data.download_url, { responseType: 'arraybuffer' });
        
        await sock.sendMessage(from, {
            audio: audioRes.data,
            mimetype: 'audio/mpeg',
            fileName: `${data.title.substring(0, 40)}.mp3`,
            ptt: false
        }, { quoted: Info });
        
        await sock.sendMessage(from, { 
            react: { text: randomEmoji, key: Info.key } 
        });
        
    } catch (error) {
        await sock.sendMessage(from, { 
            react: { text: "❌", key: Info.key } 
        });
        await sock.sendMessage(from, { 
            text: "❌ Erro ao buscar a música."
        }, { quoted: Info });
    }
}

module.exports = playpriCommand;
playpriCommand.mediaStorage = MEDIA_CACHE_PATH;