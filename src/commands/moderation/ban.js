import { SlashCommand } from 'hiei.js'
import { EmbedBuilder } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Ban extends SlashCommand {
  constructor () {
    super({
      name: 'ban',
      description: 'Ban a user',
      options: [
        {
          type: 'USER',
          name: 'user',
          description: 'The user you want to ban',
          required: true
        },
        {
          type: 'INTEGER',
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
          type: 'STRING',
          name: 'reason',
          description: 'The reason for banning them, if any'
        }
      ]
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const messages = interaction.options.getInteger('messages')
    const reason = interaction.options.getString('reason')
    const prisma = new PrismaClient()

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
          reason: reason
        }
      })

      // We can't notify members after they leave, so we have to do it before banning
      const notification = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('You were banned from the server')
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'How to Appeal', value: 'If you want to challenge this decision, you can appeal it [here](). Our staff will review your appeal and respond as soon as possible.' })
        .setFooter({ text: `Case #${incident.id}` })
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }

      await member.ban({ days: messages, reason: reason })
      await interaction.reply({ content: `${member.user.tag} was banned from the server.`, ephemeral: true })

      const moderationLog = interaction.guild.channels.cache.get(process.env.MOD_LOG_CHANNEL)
      const moderationLogEntry = new EmbedBuilder()
        .setAuthor({ name: `🚫 ${incident.action}` })
        .setTitle(incident.member)
        .setThumbnail(member.displayAvatarURL())
        .addFields(
          { name: 'Moderator', value: incident.moderator },
          { name: 'Reason', value: incident.reason })
        .setFooter({ text: `Case #${incident.id}` })
        .setTimestamp()

      moderationLog.send({ embeds: [moderationLogEntry] })
    } else {
      return interaction.reply({ content: 'I don\'t have permission to ban that member.', ephemeral: true })
    }
  }
}

export default Ban
