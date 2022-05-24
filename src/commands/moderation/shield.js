import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Shield extends SlashCommand {
  constructor () {
    super({
      name: 'shield',
      description: 'Enable to prevent new members from joining the server',
      options: [
        {
          type: ApplicationCommandOptionType.Boolean,
          name: 'toggle',
          description: 'Turn the shield on or off',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for enabling/disabling the shield',
          required: true
        }
      ]
    })
  }

  async run (interaction) {
    const toggle = interaction.options.getBoolean('toggle')
    const reason = interaction.options.getString('reason')
    const state = {
      true: 'Shield enabled. New members who join the server will be automatically kicked until the shield is disabled.',
      false: 'Shield disabled. New members may now join the server again.'
    }

    const prisma = new PrismaClient()
    await prisma.settings.upsert({
      where: { guild: interaction.guild.id },
      update: { shield: toggle },
      create: {
        guild: interaction.guild.id,
        shield: toggle
      }
    })

    await prisma.$disconnect()

    const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
    const moderationLogEmbed = new EmbedBuilder()
      .setAuthor({ name: `🛡️ Shield ${toggle ? 'enabled' : 'disabled'}` })
      .setDescription(`**Reason:** ${reason}`)
      .setFooter({ text: interaction.member.user.tag })
      .setTimestamp()

    await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

    return interaction.reply({ content: state[toggle], ephemeral: true })
  }
}

export default Shield
