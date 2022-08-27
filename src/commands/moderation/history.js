import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, time } from 'discord.js'
import { sortByKey } from '../../utilities/array-util.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class History extends SlashCommand {
  constructor () {
    super({
      name: 'history',
      description: 'See a user\'s moderation history',
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'The user who\'s history you want to see',
          required: true
        }
      ]
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const prisma = new PrismaClient()

    if (!member) {
      return interaction.reply({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
    }

    const records = await prisma.case.findMany({
      where: { memberId: member.id },
      include: { strike: true }
    })

    if (records.length !== 0) {
      const timeouts = records.filter(record => record.action === 'Timed out')
      const strikes = records.filter(record => record.action === 'Strike added')
      const activeStrikes = strikes.filter(record => record.strike.isActive === true)
      const kicks = records.filter(record => record.action === 'Kicked')
      const bans = records.filter(record => record.action === 'Banned')

      const timeoutsSummary = timeouts.length !== 1 ? `${timeouts.length} timeouts` : '1 timeout'
      const kicksSummary = kicks.length !== 1 ? `${kicks.length} kicks` : '1 kick'
      const strikesSummary = strikes.length !== 1 ? `${strikes.length} strikes (${activeStrikes.length} active)` : `1 strike (${activeStrikes.length} active)`
      const bansSummary = bans.length !== 1 ? `${bans.length} bans` : '1 ban'

      const sortedRecords = sortByKey(records, 'createdAt')
      const history = sortedRecords.map((record, index) => {
        return `[${record.id}](${record.reference}) • ${record.action} by ${record.moderator} ${time(record.createdAt, 'R')}\nReason: ${record.reason}`
      }).join('\n\n')

      const historyEmbed = new EmbedBuilder()
        .setTitle(member.user.tag)
        .setDescription(`${timeoutsSummary} • ${strikesSummary} • ${kicksSummary} • ${bansSummary}\n—\n${history}`)
        .setThumbnail(member.displayAvatarURL())

      return interaction.reply({ embeds: [historyEmbed], ephemeral: true })
    }

    return interaction.reply({ content: `${member.user.tag} has no history.`, ephemeral: true })
  }
}

export default History
