import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import log from '../../utilities/logger.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Reason extends SlashCommand {
  constructor () {
    super({
      name: 'reason',
      description: 'Update the reason for a moderation case',
      options: [
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'case',
          description: 'The case number',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The new reason',
          required: true
        }
      ],
      defaultMemberPermissions: PermissionFlagsBits.BanMembers
    })
  }

  async run (interaction) {
    const caseNumber = interaction.options.getInteger('case')
    const newReason = interaction.options.getString('reason')
    const prisma = new PrismaClient()
    const originalCase = await prisma.case.findUnique({
      where: { id: caseNumber }
    })

    log.info({ event: 'command-used', command: this.name, channel: interaction.channel })

    if (!originalCase) {
      return interaction.reply({ content: 'Case not found.', ephemeral: true })
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseNumber },
      data: {
        reason: newReason
      }
    })

    await prisma.$disconnect()

    const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
    const moderationLogEntry = new EmbedBuilder()
      .setAuthor({ name: '📝 Reason updated' })
      .setDescription(`**Case:** ${updatedCase.id}\n**Old Reason:** ${originalCase.reason}\n**New Reason:** ${updatedCase.reason}`)
      .setFooter({ text: interaction.member.user.tag })
      .setTimestamp()

    moderationLog.send({ embeds: [moderationLogEntry] })

    return interaction.reply({ content: `Updated reason for case ${caseNumber}`, ephemeral: true })
  }
}

export default Reason
