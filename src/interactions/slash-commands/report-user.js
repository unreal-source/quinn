import { UserCommand } from 'hiei.js'
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, channelMention, roleMention, userMention } from 'discord.js'
import { createModalCollector, getUsername } from '../../utilities/discord-util.js'
import log from '../../utilities/logger.js'

class ReportUser extends UserCommand {
  constructor () {
    super({
      name: 'Report User',
      defaultMemberPermissions: PermissionFlagsBits.Connect
    })
  }

  async run (interaction, user) {
    log.info({ event: 'command-used', command: this.name, channel: interaction.channel.name })

    const reportModal = new ModalBuilder()
      .setCustomId('reportUserModal')
      .setTitle('Report User')

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Why are you reporting this user?')
      .setStyle(TextInputStyle.Paragraph)

    const firstRow = new ActionRowBuilder().addComponents(reasonInput)
    reportModal.addComponents(firstRow)

    await interaction.showModal(reportModal)

    const collector = createModalCollector(this.client, interaction)

    collector.on('collect', async i => {
      if (i.customId === 'reportUserModal') {
        const member = interaction.options.getMember('user')
        const reason = i.fields.getTextInputValue('reason')
        const reportChannel = interaction.guild.channels.cache.get(process.env.USER_REPORTS_CHANNEL)
        const reportEntry = new EmbedBuilder()
          .setAuthor({ name: '⚠️ Reported User' })
          .setDescription(`**Username:** ${getUsername(member)}\n**Display Name:** ${member.displayName}\n**User ID:** ${member.id}`)

        await reportChannel.send({ content: `${roleMention(process.env.MODERATOR_ROLE)} → **${userMention(i.member.id)} reported a user in ${channelMention(interaction.channel.id)}.**\nReason: ${reason}\n`, embeds: [reportEntry] })

        log.info({ event: 'user-reported', channel: interaction.channel.name })

        return i.reply({ content: 'Thank you for submitting your report. A moderator will review it as soon as possible. ', ephemeral: true })
      }
    })
  }
}

export default ReportUser
