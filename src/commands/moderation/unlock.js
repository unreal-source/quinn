import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'

class UnlockChannel extends SlashCommand {
  constructor () {
    super({
      name: 'unlock',
      description: 'Restore chatting and reacting permissions in a text channel',
      options: [
        {
          type: ApplicationCommandOptionType.Channel,
          name: 'channel',
          description: 'The channel you want to unlock',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for unlocking this channel',
          required: true
        }
      ],
      defaultMemberPermissions: PermissionFlagsBits.BanMembers
    })
  }

  async run (interaction) {
    const channel = interaction.options.getChannel('channel')
    const reason = interaction.options.getString('reason')
    const overwrites = channel.permissionOverwrites

    // abort if channel is not visible to @everyone
    if (overwrites.cache.get(interaction.guild.id).deny.has(PermissionFlagsBits.ViewChannel)) {
      return interaction.reply({ content: `${channel} is not visible to regular members so there's no need to unlock it.`, ephemeral: true })
    }

    // abort if channel already restricts chat and reactions for @everyone
    if (overwrites.cache.get(interaction.guild.id).allow.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions])) {
      return interaction.reply({ content: `${channel} is already unlocked.`, ephemeral: true })
    }

    await channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: true,
      AddReactions: true
    })

    const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
    const moderationLogEntry = new EmbedBuilder()
      .setAuthor({ name: '🔓 Channel unlocked' })
      .setDescription(`**Channel:** #${channel.name}\n**Reason:** ${reason ?? 'No reason given'}`)
      .setFooter({ text: interaction.member.user.tag })
      .setTimestamp()

    await moderationLog.send({ embeds: [moderationLogEntry] })
    await channel.send({ content: ':unlock: Channel unlocked by a moderator. You may resume chatting.' })
    return interaction.reply({ content: `${channel} successfully unlocked`, ephemeral: true })
  }
}

export default UnlockChannel
