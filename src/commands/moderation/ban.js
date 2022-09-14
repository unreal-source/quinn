import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import log from '../../utilities/logger.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Ban extends SlashCommand {
  constructor () {
    super({
      name: 'ban',
      description: 'Ban a user',
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'The user you want to ban',
          required: true
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'messages',
          description: 'How much of their recent message history to delete',
          required: true,
          choices: [
            { name: 'Don\'t delete any', value: 0 },
            { name: 'Previous 24 hours', value: 1 },
            { name: 'Previous 7 days', value: 7 }
          ]
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for banning them, if any',
          required: true
        }
      ],
      defaultMemberPermissions: PermissionFlagsBits.BanMembers
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const messages = interaction.options.getInteger('messages')
    const reason = interaction.options.getString('reason')
    const prisma = new PrismaClient()

    log.info({ event: 'command-used', command: this.name, channel: interaction.channel })

    if (!member) {
      return interaction.reply({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
    }

    if (member.id === this.client.user.id) {
      return interaction.reply({ content: 'Nice try, human.', ephemeral: true })
    }

    if (member.id === interaction.member.id) {
      return interaction.reply({ content: 'You can\'t ban yourself.', ephemeral: true })
    }

    if (member.bannable) {
      const incident = await prisma.case.create({
        data: {
          action: 'Banned',
          member: member.user.tag,
          memberId: member.id,
          moderator: interaction.member.user.tag,
          moderatorId: interaction.member.id,
          reason
        }
      })

      const strikes = await prisma.case.findMany({
        where: {
          memberId: member.id,
          strike: {
            is: { isActive: true }
          }
        }
      })

      await Promise.all(strikes.map(strike => {
        return prisma.strike.update({
          where: { id: strike.id },
          data: { isActive: false }
        })
      }))

      // We can't notify members after they leave, so we have to do it before banning
      const notification = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('Banned from the server')
        .setDescription(`**Reason:** ${reason}\n—\nYou may appeal the ban by filling out [this form](${process.env.BAN_APPEAL_LINK}). Our staff will review your appeal and respond as soon as possible.`)
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }

      await member.ban({ days: messages, reason })
      await interaction.reply({ content: `${member.user.tag} was banned from the server.`, ephemeral: true })

      const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
      const moderationLogEmbed = new EmbedBuilder()
        .setAuthor({ name: '⛔ Banned' })
        .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}`)
        .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
        .setThumbnail(member.displayAvatarURL())
        .setTimestamp()

      const moderationLogEntry = await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

      await prisma.case.update({
        where: { id: incident.id },
        data: { reference: moderationLogEntry.url }
      })

      prisma.$disconnect()
    } else {
      return interaction.reply({ content: 'I don\'t have permission to ban that member.', ephemeral: true })
    }
  }
}

export default Ban
