import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'

class LockChannel extends SlashCommand {
  constructor () {
    super({
      name: 'lock',
      description: 'Restrict chatting and reacting permissions in a text channel',
      options: [
        {
          type: ApplicationCommandOptionType.Channel,
          name: 'channel',
          description: 'The channel you want to lock',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for locking this channel',
          required: true
        }
      ]
    })
  }

  async run (interaction) {
    const channel = interaction.options.getChannel('channel')
    const reason = interaction.options.getString('reason')
    const overwrites = channel.permissionOverwrites

    // abort if channel is not visible to @everyone
    if (overwrites.cache.get(interaction.guild.id).deny.has(PermissionFlagsBits.ViewChannel)) {
      return interaction.reply({ content: `${channel} is not visible to regular members so there's no need to lock it.`, ephemeral: true })
    }

    // abort if channel already restricts chat and reactions for @everyone
    if (overwrites.cache.get(interaction.guild.id).deny.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions])) {
      return interaction.reply({ content: `${channel} is already locked.`, ephemeral: true })
    }

    await channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: false,
      AddReactions: false
    })

    const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
    const moderationLogEntry = new EmbedBuilder()
      .setAuthor({ name: '🔒 Channel locked' })
      .setDescription(`**Channel:** #${channel.name}\n**Reason:** ${reason ?? 'No reason given'}`)
      .setFooter({ text: interaction.member.user.tag })
      .setTimestamp()

    await moderationLog.send({ embeds: [moderationLogEntry] })
    await channel.send({ content: ':lock: Channel locked by a moderator. Chat and reactions are restricted.' })
    return interaction.reply({ content: `${channel} successfully locked`, ephemeral: true })
  }
}

export default LockChannel
