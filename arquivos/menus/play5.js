const axios = require("axios");
const url = require("url");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function play5Command(sock, from, Info, args, prefix) {

    const API_BASE_URL = "http://node.tedzinho.com.br:1150";
    const SEARCH_API_URL = "https://systemzone.store/api/ytsearch";

    const reply = (txt) =>
        sock.sendMessage(from, { text: txt }, { quoted: Info });

    // Função para baixar áudio em buffer
    async function baixarAudio(url) {
        const res = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 60_000
        });
        return Buffer.from(res.data);
    }

    // Função para gerenciar o download via API
    async function iniciarDownloadTedzinho(youtubeUrl, type = 'mp3', abr = '320') {
        let apiUrl = '';
        let queryParams = new url.URLSearchParams({ url: youtubeUrl });

        if (type === 'mp3') {
            apiUrl = `${API_BASE_URL}/audio`;
            queryParams.set('ext', 'mp3');
            queryParams.set('abr', abr);
        } else {
            throw new Error("Tipo de áudio não suportado.");
        }

        const initialResp = await axios.get(`${apiUrl}?${queryParams.toString()}`, { timeout: 30_000 });
        const data = initialResp.data;

        if (initialResp.status !== 200 && initialResp.status !== 202) {
            throw new Error(data.error || `Erro na API: Status ${initialResp.status}`);
        }

        if (data.status === true && data.cached === true) {
            return data.download_url;
        }
        
        if (data.status !== 'processing' || !data.task_id) {
            throw new Error(data.error || 'Resposta inesperada da API.');
        }

        const taskId = data.task_id;
        let downloadUrl = null;
        const maxAttempts = 30; 

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const statusResp = await axios.get(`${API_BASE_URL}/status/${taskId}`, { timeout: 10_000 });
            const statusData = statusResp.data;

            if (statusData.status === 'completed') {
                downloadUrl = statusData.download_url;
                break;
            } else if (statusData.status === 'failed') {
                throw new Error(`Erro no processamento: ${statusData.error || 'Desconhecido'}`);
            }
        }

        if (!downloadUrl) {
            throw new Error(`Tempo limite excedido.`);
        }

        return downloadUrl;
    }

    try {
        const userInput = args.join(" ");
        let youtubeUrl = userInput;
        let metadata = {};
        
        const isUrl = userInput.includes("youtu.be") || userInput.includes("youtube.com");

        if (!userInput) {
            return reply(`❌ Por favor, envie o link do YouTube ou o nome da música. Exemplo: ${prefix}play5 Tz da Coronel`);
        }

        if (isUrl) {
            metadata = {
                titulo: "Música do YouTube",
                autor: "URL Fornecida",
                duracao: "N/D",
                publicado: "N/D",
                thumb: null,
                rotaUsada: "Download Direto"
            };
            reply("⚠️ Processando URL fornecida...");
        } else {
            await sock.sendMessage(from, { react: { text: "🔍", key: Info.key } });

            const maxTentativas = 10;
            const intervalo = 5000;

            for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
                try {
                    const searchResp = await axios.get(`${SEARCH_API_URL}?text=${encodeURIComponent(userInput)}`, { timeout: 15_000 });
                    const searchData = searchResp.data;

                    if (searchResp.status === 200 && searchData.status === 'sucesso' && searchData.resultados?.length > 0) {
                        const firstResult = searchData.resultados[0];
                        youtubeUrl = firstResult.youtube_url;
                        
                        metadata = {
                            titulo: firstResult.title,
                            autor: firstResult.author,
                            duracao: firstResult.duration,
                            publicado: firstResult.publish_date,
                            thumb: firstResult.thumbnail,
                            rotaUsada: "SystemZone + Tedzinho"
                        };
                        break;
                    }
                } catch (e) {
                    // Erro de busca silencioso, apenas tenta novamente
                }

                if (tentativa < maxTentativas) await sleep(intervalo);
            }

            if (!metadata.titulo) {
                throw new Error(`Não foi possível encontrar resultados para sua busca.`);
            }
        }

        await sock.sendMessage(from, { react: { text: "📥", key: Info.key } });
        const finalDownloadUrl = await iniciarDownloadTedzinho(youtubeUrl, 'mp3', '320');
        const audioBuffer = await baixarAudio(finalDownloadUrl);

        await sock.sendMessage(from, { react: { text: "🎧", key: Info.key } });

        const previewBody = `Canal: ${metadata.autor}\n⏱️ Duração: ${metadata.duracao}\n📅 Publicado: ${metadata.publicado}`;

        await sock.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${metadata.titulo.substring(0, 50)}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: metadata.titulo,
                    body: previewBody,
                    thumbnailUrl: metadata.thumb,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    sourceUrl: youtubeUrl
                }
            }
        }, { quoted: Info });

        await sock.sendMessage(from, { react: { text: "🎵", key: Info.key } });

    } catch (e) {
        await sock.sendMessage(from, { react: { text: "❌", key: Info.key } });
        reply("❌ Erro: " + e.message);
    }
};
