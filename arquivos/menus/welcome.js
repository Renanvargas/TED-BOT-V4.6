// ./arquivos/menus/welcome.js

module.exports = async function handleWelcomeCommand(sock, Info, from, args, prefix, groupState, groupManager, logger, getPermissions, BOT_PHONE, sasah) {
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
    const groupData = groupState.get(from) || { welcome: false };

    // ✅ Ativar / Desativar o sistema
    if (opt === "on" || opt === "off") {
      groupData.welcome = opt === "on";
      groupState.set(from, groupData);

      logger.log("CONFIG_CHANGED", {
        setting: "Boas-vindas do grupo",
        value: groupData.welcome,
        groupId: from,
        groupName: perms.groupName,
        changer: Info.pushName,
        privateId: Info.key.participant || Info.key.remoteJid,
        phoneNumber: (Info.key.participant || Info.key.remoteJid).split("@")[0]
      });

      await groupManager.saveGroupData(sock, from, "settings_changed");

      return sock.sendMessage(from, { 
        text: `🎉 Sistema de boas-vindas do grupo ${groupData.welcome ? "✅ ATIVADO" : "❌ DESATIVADO"}`
      }, { quoted: sasah });
    }

    // 📊 Mostrar status atual
    if (opt === "status") {
      return sock.sendMessage(from, {
        text: `🎚️ *Status do sistema de boas-vindas:*\n• Grupo: ${groupData.welcome ? "✅ ON" : "❌ OFF"}`
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
        text: `Olá @${senderNumber}, isto é um *preview* do sistema de boas-vindas.`,
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
      text: `⚙️ *Configurar boas-vindas do grupo*\n\n• ${prefix}welcome on\n• ${prefix}welcome off\n• ${prefix}welcome status\n• ${prefix}welcome test`
    }, { quoted: sasah });

  } catch (err) {
    console.error("❌ Erro no comando 'welcome':", err);
    return sock.sendMessage(from, { text: "⚠️ Ocorreu um erro ao executar o comando de boas-vindas." }, { quoted: sasah });
  }
};