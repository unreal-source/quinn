import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Kick extends SlashCommand {
  constructor () {
    super({
      name: 'kick',
      description: 'Kick a user',
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'The user you want to kick',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for kicking them, if any'
        }
      ]
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const reason = interaction.options.getString('reason')
    const prisma = new PrismaClient()

    if (!member) {
      return interaction.reply({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
    }

    if (member.id === this.client.user.id) {
      return interaction.reply({ content: 'Nice try, human.', ephemeral: true })
    }

    if (member.id === interaction.member.id) {
      return interaction.reply({ content: 'You can\'t kick yourself.', ephemeral: true })
    }

    if (member.kickable) {
      const incident = await prisma.case.create({
        data: {
          action: 'Kicked',
          member: member.user.tag,
          memberId: member.id,
          moderator: interaction.member.user.tag,
          moderatorId: interaction.member.id,
          reason
        }
      })

      await prisma.$disconnect()

      // We can't notify members after they leave, so we have to do it before kicking
      const notification = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('Kicked from the server')
        .setDescription(`**Reason:** ${reason}`)
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }

      await member.kick(reason)
      await interaction.reply({ content: `${member.user.tag} was kicked from the server.`, ephemeral: true })

      const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
      const moderationLogEntry = new EmbedBuilder()
        .setAuthor({ name: '🥾 Kicked' })
        .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}`)
        .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
        .setThumbnail(member.displayAvatarURL())
        .setTimestamp()

      moderationLog.send({ embeds: [moderationLogEntry] })
    } else {
      return interaction.reply({ content: 'I don\'t have permission to kick that member.', ephemeral: true })
    }
  }
}

export default Kick
