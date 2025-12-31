// ./arquivos/menus/welcome2.js

module.exports = async function handleWelcome2Command(sock, Info, from, args, prefix, groupState, groupManager, logger, getPermissions, BOT_PHONE, sasah) {
  try {
    // ✅ Correção: detectar se é grupo corretamente
    const isGroup = from.endsWith("@g.us");

    if (!isGroup) {
      return sock.sendMessage(from, { text: "❌ Só funciona em grupos." }, { quoted: sasah });
    }

    // 🔒 Verificar permissões de administrador ou dono
    const perms = await getPermissions(sock, from, Info.key.participant, BOT_PHONE);
    if (!perms.isAdmin && !perms.isOwnerGroup) {
      return sock.sendMessage(from, { text: "❌ Apenas administradores podem usar este comando." }, { quoted: sasah });
    }

    // 🔧 Obter estado atual do grupo
    const opt = (args[0] || "").toLowerCase();
    // NOTA: A chave do estado do grupo foi alterada de 'welcome' para 'welcome2'
    const groupData = groupState.get(from) || { welcome2: false };

    // ✅ Ativar / Desativar o sistema
    if (opt === "on" || opt === "off") {
      // Usa a nova chave 'welcome2'
      groupData.welcome2 = opt === "on";
      groupState.set(from, groupData);

      logger.log("CONFIG_CHANGED", {
        // Descrição do log atualizada
        setting: "Boas-vindas 2 do grupo",
        // Usa a nova chave 'welcome2'
        value: groupData.welcome2,
        groupId: from,
        groupName: perms.groupName,
        changer: Info.pushName,
        privateId: Info.key.participant || Info.key.remoteJid,
        phoneNumber: (Info.key.participant || Info.key.remoteJid).split("@")[0]
      });

      await groupManager.saveGroupData(sock, from, "settings_changed");

      return sock.sendMessage(from, { 
        // Mensagem atualizada e usa a nova chave 'welcome2'
        text: `🎉 Sistema de boas-vindas 2 do grupo ${groupData.welcome2 ? "✅ ATIVADO" : "❌ DESATIVADO"}`
      }, { quoted: sasah });
    }

    // 📊 Mostrar status atual
    if (opt === "status") {
      return sock.sendMessage(from, {
        // Usa a nova chave 'welcome2' e muda o título
        text: `🎚️ *Status do sistema de boas-vindas 2:*\n• Grupo: ${groupData.welcome2 ? "✅ ON" : "❌ OFF"}`
      }, { quoted: sasah });
    }

    // 🧪 Teste de boas-vindas
    if (opt === "test") {
      const sender = Info.key.participant || Info.key.remoteJid;
      const senderNumber = String(sender).split("@")[0];
      const fallbackImg = "https://i.ibb.co/znmQqZk/placeholder.jpg";
      const ppUser  = await sock.profilePictureUrl(sender, "image").catch(() => null);
      const ppGroup = await sock.profilePictureUrl(from, "image").catch(() => null);
      const thumb   = ppUser || ppGroup || fallbackImg;

      return sock.sendMessage(from, {
        // Texto de preview atualizado
        text: `Olá @${senderNumber}, isto é um *preview* do sistema de boas-vindas 2.`,
        mentions: [sender],
        contextInfo: {
          mentionedJid: [sender],
          externalAdReply: {
            title: "👋 Seja Bem-vindo!",
            body: `${senderNumber}@s.whatsapp.net`,
            mediaType: 1,
            renderLargerThumbnail: true,
            thumbnailUrl: thumb,
            sourceUrl: ""
          }
        }
      }, { quoted: sasah });
    }

    // 📘 Menu de ajuda
    return sock.sendMessage(from, { 
      // Comandos de ajuda atualizados para 'welcome2'
      text: `⚙️ *Configurar boas-vindas 2 do grupo*\n\n• ${prefix}welcome2 on\n• ${prefix}welcome2 off\n• ${prefix}welcome2 status\n• ${prefix}welcome2 test`
    }, { quoted: sasah });

  } catch (err) {
    // Erro atualizado para 'welcome2'
    console.error("❌ Erro no comando 'welcome2':", err);
    return sock.sendMessage(from, { text: "⚠️ Ocorreu um erro ao executar o comando de boas-vindas 2." }, { quoted: sasah });
  }
};
