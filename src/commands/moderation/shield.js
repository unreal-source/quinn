import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Shield extends SlashCommand {
  constructor () {
    super({
      name: 'shield',
      description: 'Prevent new members from joining the server',
      options: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'on',
          description: 'Prevent new members from joining the server',
          options: [
            {
              type: ApplicationCommandOptionType.String,
              name: 'reason',
              description: 'The reason for enabling shield',
              required: true
            }
          ]
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'off',
          description: 'Allow new members to join the server again',
          options: [
            {
              type: ApplicationCommandOptionType.String,
              name: 'reason',
              description: 'The reason for disabling shield',
              required: true
            }
          ]
        }
      ]
    })
  }

  async run (interaction) {
    const subcommand = interaction.options.getSubcommand()
    const prisma = new PrismaClient()

    switch (subcommand) {
      case 'on': {
        const reason = interaction.options.getString('reason')
        const settings = await prisma.settings.findUnique({
          where: { guild: interaction.guild.id }
        })

        if (settings.shield) {
          return interaction.reply({ content: 'Shield is already enabled.', ephemeral: true })
        }

        await prisma.settings.upsert({
          where: { guild: interaction.guild.id },
          update: { shield: true },
          create: {
            guild: interaction.guild.id,
            shield: true
          }
        })

        const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
        const moderationLogEmbed = new EmbedBuilder()
          .setAuthor({ name: '🛡️ Shield enabled' })
          .setDescription(`**Reason:** ${reason}`)
          .setFooter({ text: interaction.member.user.tag })
          .setTimestamp()

        await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

        interaction.reply({ content: 'Shield enabled. New members who join the server will be automatically kicked until the shield is disabled.', ephemeral: true })
        await prisma.$disconnect()
        break
      }

      case 'off': {
        const reason = interaction.options.getString('reason')
        const settings = await prisma.settings.findUnique({
          where: { guild: interaction.guild.id }
        })

        if (!settings.shield) {
          return interaction.reply({ content: 'Shield is already disabled.', ephemeral: true })
        }

        await prisma.settings.upsert({
          where: { guild: interaction.guild.id },
          update: { shield: false },
          create: {
            guild: interaction.guild.id,
            shield: false
          }
        })

        const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
        const moderationLogEmbed = new EmbedBuilder()
          .setAuthor({ name: '🛡️ Shield disabled' })
          .setDescription(`**Reason:** ${reason}`)
          .setFooter({ text: interaction.member.user.tag })
          .setTimestamp()

        await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

        interaction.reply({ content: 'Shield disabled. New members may now join the server again.', ephemeral: true })
        await prisma.$disconnect()
        break
      }
    }
  }
}

export default Shield
