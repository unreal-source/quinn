import { SlashCommand } from 'hiei.js'
import { EmbedBuilder } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Undo extends SlashCommand {
  constructor () {
    super({
      name: 'undo',
      description: 'Undo a moderator action',
      options: [
        {
          type: 'SUB_COMMAND',
          name: 'timeout',
          description: 'Cancel a timeout',
          options: [
            {
              type: 'USER',
              name: 'user',
              description: 'The timed out user',
              required: true
            },
            {
              type: 'STRING',
              name: 'reason',
              description: 'The reason for undoing this timeout',
              required: true
            }
          ]
        },
        {
          type: 'SUB_COMMAND',
          name: 'strike',
          description: 'Remove a strike',
          options: [
            {
              type: 'INTEGER',
              name: 'case',
              description: 'The case number for the strike',
              required: true
            },
            {
              type: 'STRING',
              name: 'reason',
              description: 'The reason for undoing this strike',
              required: true
            }
          ]
        },
        {
          type: 'SUB_COMMAND',
          name: 'ban',
          description: 'Revoke a ban',
          options: [
            {
              type: 'STRING',
              name: 'user',
              description: 'The ID of the banned user',
              required: true
            },
            {
              type: 'STRING',
              name: 'reason',
              description: 'The reason for undoing this ban',
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
      case 'timeout': {
        const member = interaction.options.getMember('user')
        const reason = interaction.options.getString('reason')

        if (!member) {
          return interaction.reply({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
        }

        if (member.id === this.client.user.id) {
          return interaction.reply({ content: 'Nice try, human.', ephemeral: true })
        }

        if (member.id === interaction.member.id) {
          return interaction.reply({ content: 'You can\'t cancel your own timeout.', ephemeral: true })
        }

        if (member.isCommunicationDisabled()) {
          await member.timeout(null, reason)
          await interaction.reply({ content: `${member.user.tag} is no longer timed out.`, ephemeral: true })

          const incident = await prisma.case.create({
            data: {
              action: 'Timeout cancelled',
              member: member.user.tag,
              memberId: member.id,
              moderator: interaction.member.user.tag,
              moderatorId: interaction.member.id,
              reason: reason
            }
          })

          const moderationLog = interaction.guild.channels.cache.get(process.env.MOD_LOG_CHANNEL)
          const moderationLogEntry = new EmbedBuilder()
            .setAuthor({ name: `↩️ ${incident.action}` })
            .setTitle(incident.member)
            .setThumbnail(member.displayAvatarURL())
            .addFields(
              { name: 'Moderator', value: incident.moderator },
              { name: 'Reason', value: incident.reason })
            .setFooter({ text: `#${incident.id}` })
            .setTimestamp()

          moderationLog.send({ embeds: [moderationLogEntry] })

          const notification = new EmbedBuilder()
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTitle('Your timeout was cancelled')
            .addFields(
              { name: 'Reason', value: reason })
            .setFooter({ text: `Case #${incident.id}` })
            .setTimestamp()

          try {
            await member.send({ embeds: [notification] })
          } catch (e) {
            await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
          }
        } else {
          return interaction.reply({ content: `${member.user.tag} isn not timed out.`, ephemeral: true })
        }

        break
      }

      case 'strike': {
        const caseNumber = interaction.options.getInteger('case')
        const reason = interaction.options.getString('reason')

        // Cache, bot, self guards
        // Check if case is an active strike or member has any strikes
        // If yes: set strike to inactive, notify moderator, create case, create mod log, notify member
        // If no: notify moderator "that case is not an active strike" or "that member has no strikes"
        break
      }

      case 'ban': {
        const id = interaction.options.getString('user')
        const reason = interaction.options.getString('reason')

        if (id === this.client.user.id) {
          return interaction.reply({ content: 'Nice try, human.', ephemeral: true })
        }

        if (id === interaction.member.id) {
          return interaction.reply({ content: 'You can\'t revoke your own ban.', ephemeral: true })
        }

        try {
          const ban = await interaction.guild.bans.fetch(id)

          await interaction.guild.members.unban(id)
          await interaction.reply({ content: `${ban.user.tag} is no longer banned. Please remember to notify them.`, ephemeral: true })

          const incident = await prisma.case.create({
            data: {
              action: 'Ban revoked',
              member: ban.user.tag,
              memberId: ban.user.id,
              moderator: interaction.member.user.tag,
              moderatorId: interaction.member.id,
              reason: reason
            }
          })

          const moderationLog = interaction.guild.channels.cache.get(process.env.MOD_LOG_CHANNEL)
          const moderationLogEntry = new EmbedBuilder()
            .setAuthor({ name: `↩️ ${incident.action}` })
            .setTitle(incident.member)
            .setThumbnail(ban.user.displayAvatarURL())
            .addFields(
              { name: 'Moderator', value: incident.moderator },
              { name: 'Reason', value: incident.reason })
            .setFooter({ text: `#${incident.id}` })
            .setTimestamp()

          moderationLog.send({ embeds: [moderationLogEntry] })
        } catch {
          try {
            const member = await interaction.guild.members.fetch(id)
            return interaction.reply({ content: `${member.user.tag} is not banned.`, ephemeral: true })
          } catch {
            return interaction.reply({ content: `${id} is not a valid user ID.`, ephemeral: true })
          }
        }
        break
      }
    }
  }
}

export default Undo
