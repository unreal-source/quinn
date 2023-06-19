import { MessageCommand } from 'hiei.js'
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, channelMention, roleMention, userMention, time } from 'discord.js'
import { createModalCollector, getUsername } from '../../utilities/discord-util.js'
import log from '../../utilities/logger.js'

class ReportToModerators extends MessageCommand {
  constructor () {
    super({
      name: 'Report to Moderators',
      defaultMemberPermissions: PermissionFlagsBits.SendMessages
    })
  }

  async run (interaction, message) {
    const reportModal = new ModalBuilder()
      .setCustomId('reportModal')
      .setTitle('Report to Moderators')

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for reporting this content')
      .setStyle(TextInputStyle.Paragraph)

    const firstRow = new ActionRowBuilder().addComponents(reasonInput)
    reportModal.addComponents(firstRow)

    log.info({ event: 'command-used', command: this.name, channel: interaction.channel.name })

    await interaction.showModal(reportModal)

    const collector = createModalCollector(this.client, interaction)

    collector.on('collect', async i => {
      if (i.customId === 'reportModal') {
        const reason = i.fields.getTextInputValue('reason')
        const reportChannel = interaction.guild.channels.cache.get(process.env.USER_REPORTS_CHANNEL)
        const reportEntry = new EmbedBuilder()
          .setAuthor({ name: '⚠️ Reported Message' })
          .setDescription(`**Author:** ${getUsername(message.member)}\n**Author ID:** ${message.author.id}\n**Content:** ${message.content}\n**Timestamp:** ${time(message.createdAt)} • ${time(message.createdAt, 'R')}\n[Jump to Message](${message.url})`)

        await reportChannel.send({ content: `${roleMention(process.env.MODERATOR_ROLE)} → **${userMention(i.member.id)} reported a message in ${channelMention(message.channel.id)}.**\nReason: ${reason}\n`, embeds: [reportEntry] })

        log.info({ event: 'user-report', channel: interaction.channel.name })

        return i.reply({ content: 'Thank you for submitting your report. A moderator will review it as soon as possible. ', ephemeral: true })
      }
    })
  }
}

export default ReportToModerators
