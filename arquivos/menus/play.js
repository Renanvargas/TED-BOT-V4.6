const axios = require("axios");

module.exports = async function playCommand(sock, from, Info, args, prefix, API_KEY_TED) {
    const reply = (texto) => sock.sendMessage(from, { text: texto }, { quoted: Info });

    try {
        const query = args.join(" ");
        if (!query) return reply(`❌ Cadê o nome da música?\nExemplo: ${prefix}play Casa do Seu Zé`);

        // ✅ Função de formatação revisada
        const formatarNumero = (num) => {
            if (!num) return "0";
            num = typeof num === "string" ? parseInt(num.replace(/\D/g, "")) : num;
            if (isNaN(num)) return "0";

            if (num < 1000) return num.toString(); // Ex: 100 → 100
            if (num < 1_000_000) {
                const k = (num / 1000);
                return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "K"; // Ex: 1200 → 1.2K
            }
            if (num < 1_000_000_000) {
                const m = (num / 1_000_000);
                return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + "M"; // Ex: 1.2M
            }
            const b = (num / 1_000_000_000);
            return (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)) + "B"; // Ex: 2B
        };

        const enviarMusica = async (dados, apiName, versao, arquivoField = "arquivo") => {
            const title = dados.title || dados.titulo || "Sem título";
            const author = dados.channel || dados.autor || dados.author?.name || "Desconhecido";
            const duration = dados.timestamp || dados.duracao || dados.duration?.timestamp || "Desconhecida";
            const thumbnail = dados.thumbnails?.[0] || dados.thumbnail || dados.image || "https://files.catbox.moe/427zyd.jpg";
            const views = formatarNumero(dados.viewsCount || dados.views || 0);
            const publicado = dados.uploadDate || dados.publicado || dados.ago || "Desconhecido";
            const linkVideo = dados.externalUrls?.video || dados.videoUrl || dados.url || "N/A";
            const arquivo = dados[arquivoField] || dados.audioUrl;

            const legenda = `🎵 *${title}*\n👤 *Canal:* ${author}\n⏱️ *Duração:* ${duration}\n👀 *Visualizações:* ${views}\n📅 *Publicado:* ${publicado}\n🔗 *Link:* ${linkVideo}\n📡 *Rota usada: ${versao}*`;

            await sock.sendMessage(from, { image: { url: thumbnail }, caption: legenda, headerType: 4 }, { quoted: Info });

            const audioBuffer = await axios.get(arquivo, { responseType: "arraybuffer" }).then(r => r.data).catch(() => null);
            if (!audioBuffer) return reply("❌ Falha ao baixar o áudio.");

            await sock.sendMessage(from, { audio: audioBuffer, mimetype: "audio/mpeg", fileName: `${title}.mp3`, ptt: false }, { quoted: Info });
        };

        // ✅ Ordem das rotas
        const rotas = [
            { nome: "V6", emoji: "1️⃣" },
            { nome: "V5", url: `https://tedzinho.com.br/api/download/play_audio/v5?apikey=${API_KEY_TED}&nome_url=${encodeURIComponent(query)}`, emoji: "2️⃣" },
            { nome: "V3", url: `https://tedzinho.com.br/api/download/play_audio/v3?apikey=${API_KEY_TED}&nome_url=${encodeURIComponent(query)}`, emoji: "3️⃣" },
            { nome: "V8", url: `https://tedzinho.com.br/api/download/play_audio/v8?apikey=${API_KEY_TED}&nome_url=${encodeURIComponent(query)}`, emoji: "4️⃣" },
        ];

        let rotaUsada = null;

        for (let i = 0; i < rotas.length; i++) {
            const r = rotas[i];
            await sock.sendMessage(from, { react: { text: r.emoji, key: Info.key } });

            try {
                // 🔹 Primeira rota: V6
                if (r.nome === "V6") {
                    const apiURL = `https://tedzinho.com.br/api/download/play_audio/v6?apikey=${API_KEY_TED}&nome_url=${encodeURIComponent(query)}`;

                    const res = await axios.get(apiURL);
                    const data = res.data;

                    if (!data || data.status !== "OK" || !data.resultado) throw new Error("Sem resultados");

                    const r4 = data.resultado;
                    const titulo = r4.title || 'Áudio Desconhecido';
                    const canal = r4.channel || 'Desconhecido';
                    const duracao = r4.timestamp || 'N/D';
                    const views = formatarNumero(r4.viewsCount || r4.views || 0);
                    const publicado = r4.uploadDate || 'N/D';
                    const thumb = r4.thumbnails?.[0] || null;
                    const videoUrl = r4.externalUrls?.video || '';
                    const audioPage = r4.dl_link?.url;

                    const caption =
                        `🎧 *TOCANDO AGORA*\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `📀 *Título:* ${titulo}\n` +
                        `👤 *Artista/Canal:* ${canal}\n` +
                        `⏰ *Duração:* ${duracao}\n` +
                        `👁️ *Visualizações:* ${views}\n` +
                        `📅 *Publicado:* ${publicado}\n` +
                        `🔗 *YouTube:* ${videoUrl}\n` +
                        `📡 *Rota usada:* ${r.nome}\n` +
                        `━━━━━━━━━━━━━━━━━━━━`;

                    if (thumb) {
                        await sock.sendMessage(from, { image: { url: thumb }, caption }, { quoted: Info });
                    } else {
                        await reply(caption);
                    }

                    // 🔽 Download do áudio
                    const redirect = await axios.get(audioPage, {
                        maxRedirects: 0,
                        validateStatus: (s) => s >= 200 && s < 400,
                    }).catch(err => err.response);

                    const finalURL = redirect?.headers?.location || audioPage;
                    if (!finalURL) throw new Error("Sem URL final");

                    await sock.sendMessage(from, {
                        audio: { url: finalURL },
                        mimetype: 'audio/mpeg',
                        fileName: `${titulo.substring(0, 50)}.mp3`,
                        ptt: false
                    }, { quoted: Info });

                    rotaUsada = "V6";
                    break;
                }

                // 🔹 Outras rotas (V5, V3, V8)
                const res = await axios.get(r.url);
                const resultado = res.data.resultado;
                if (resultado && (resultado.arquivo || resultado.dl_link)) {
                    rotaUsada = r.nome;
                    const campoArquivo = resultado.arquivo ? "arquivo" : "dl_link";
                    await enviarMusica(resultado, "Tedzinho API", r.nome, campoArquivo);
                    break;
                }

            } catch (e) {
                console.error(`Erro na rota ${r.nome}:`, e.message);
            }
        }

        if (!rotaUsada) return reply("❌ Nenhuma rota funcionou.");

    } catch (e) {
        console.error(e);
        await reply("❌ Erro ao processar sua música.");
    }
};