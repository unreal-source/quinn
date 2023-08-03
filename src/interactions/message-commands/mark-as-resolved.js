import { MessageCommand } from 'hiei.js'
import { PermissionFlagsBits, time } from 'discord.js'
import { getUsername } from '../../utilities/discord-util.js'
import log from '../../utilities/logger.js'

class MarkAsResolved extends MessageCommand {
  constructor () {
    super({
      name: 'Mark as Resolved',
      defaultMemberPermissions: PermissionFlagsBits.BanMembers
    })
  }

  async run (interaction, message) {
    log.info({ event: 'command-used', command: this.name, channel: interaction.channel.name })

    const content = message.content

    if (content.includes('Resolved by')) {
      return interaction.reply({ content: 'This report is already resolved.', ephemeral: true })
    }

    const now = new Date()

    await message.edit(`~~${content}~~\n:white_check_mark: _Resolved by ${getUsername(interaction.user)} ${time(now)}_`)
    return interaction.reply({ content: 'Successfully marked as resolved.', ephemeral: true })
  }
}

export default MarkAsResolved
