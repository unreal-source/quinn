import { SlashCommand } from 'hiei.js'
import { PermissionFlagsBits } from 'discord.js'
import log from '../../utilities/logger.js'

class BotPing extends SlashCommand {
  constructor () {
    super({
      name: 'ping',
      description: 'Check the bot\'s latency and websocket heartbeat',
      defaultMemberPermissions: PermissionFlagsBits.ManageGuild
    })
  }

  async run (interaction) {
    const response = await interaction.reply({ content: ':ping_pong: Ping...', ephemeral: true, fetchReply: true })
    const heartbeat = this.client.ws.ping
    const latency = response.createdTimestamp - interaction.createdTimestamp
    const status = {
      0: 'Ready',
      1: 'Connecting',
      2: 'Reconnecting',
      3: 'Idle',
      4: 'Nearly',
      5: 'Disconnected',
      6: 'WaitingForGuilds',
      7: 'Identifying',
      8: 'Resuming'
    }

    log.info({ event: 'command-used', command: this.name, channel: interaction.channel.name })

    return interaction.editReply({ content: `:ping_pong: Ping... Pong! Roundtrip latency is \`${latency}ms\`. Heartbeat is \`${heartbeat}ms\`. Status is \`${status[this.client.ws.status]}\`.` })
  }
}

export default BotPing
