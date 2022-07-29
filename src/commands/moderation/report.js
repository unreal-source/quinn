import { MessageCommand } from 'hiei.js'
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, channelMention, userMention, time } from 'discord.js'
import { createModalCollector } from '../../utilities/discord-util.js'

class ReportToModerators extends MessageCommand {
  constructor () {
    super({ name: 'Report to Moderators' })
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

    await interaction.showModal(reportModal)

    const collector = createModalCollector(this.client, interaction)

    collector.on('collect', async i => {
      if (i.customId === 'reportModal') {
        const reason = i.fields.getTextInputValue('reason')
        const reportChannel = interaction.guild.channels.cache.get(process.env.USER_REPORTS_CHANNEL)
        const reportEntry = new EmbedBuilder()
          .setAuthor({ name: '⚠️ Reported Message' })
          .setDescription(`**Author:** ${message.author.tag}\n**Author ID:** ${message.author.id}\n**Content:** ${message.content}\n**Timestamp:** ${time(message.createdAt)} • ${time(message.createdAt, 'R')}\n[Jump to Message](${message.url})`)

        await reportChannel.send({ content: `${userMention(i.member.id)} reported a message in ${channelMention(message.channel.id)}. Reason:\n> ${reason}\n_ _`, embeds: [reportEntry] })
        return i.reply({ content: 'Thank you for submitting your report. A moderator will review it as soon as possible. ', ephemeral: true })
      }
    })
  }
}

export default ReportToModerators
