import { SlashCommand } from 'hiei.js'
import { importJson } from '../../utilities/json-util'

class BotVersion extends SlashCommand {
  constructor () {
    super({
      name: 'version',
      description: 'Check which version of the bot is running'
    })
  }

  async run (interaction) {
    const meta = importJson('../../../package.json')
    return interaction.reply({ content: `Current version is \`${meta.version}\``, ephemeral: true })
  }
}

export default BotVersion
