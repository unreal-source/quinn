import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Undo extends SlashCommand {
  constructor () {
    super({
      name: 'undo',
      description: 'Undo a moderator action',
      options: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'timeout',
          description: 'Cancel a timeout',
          options: [
            {
              type: ApplicationCommandOptionType.User,
              name: 'user',
              description: 'The timed out user',
              required: true
            },
            {
              type: ApplicationCommandOptionType.String,
              name: 'reason',
              description: 'The reason for undoing this timeout',
              required: true
            }
          ]
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'strike',
          description: 'Remove a strike',
          options: [
            {
              type: ApplicationCommandOptionType.Integer,
              name: 'case',
              description: 'The case number for the strike',
              required: true
            },
            {
              type: ApplicationCommandOptionType.String,
              name: 'reason',
              description: 'The reason for undoing this strike',
              required: true
            }
          ]
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'ban',
          description: 'Revoke a ban',
          options: [
            {
              type: ApplicationCommandOptionType.String,
              name: 'user',
              description: 'The ID of the banned user',
              required: true
            },
            {
              type: ApplicationCommandOptionType.String,
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

          await prisma.$disconnect()

          const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
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
        const prisma = new PrismaClient()
        const record = await prisma.case.findUnique({
          where: { id: caseNumber },
          include: { strike: true }
        })

        if (!record) {
          return interaction.reply({ content: 'Case not found.', ephemeral: true })
        }

        if (!record.strike) {
          return interaction.reply({ content: `Case #${record.id} is not a strike.`, ephemeral: true })
        }

        if (!record.strike.isActive) {
          return interaction.reply({ content: 'Strike already removed.', ephemeral: true })
        }

        if (record.memberId === interaction.member.id) {
          return interaction.reply({ content: 'You can\'t remove your own strike.', ephemeral: true })
        }

        await prisma.strike.update({
          where: { id: caseNumber },
          data: {
            isActive: false
          }
        })

        const strikesRemaining = await prisma.case.count({
          where: {
            memberId: record.memberId,
            strike: { isActive: true }
          }
        })

        await interaction.reply({ content: `${record.member} lost a strike. They have ${strikesRemaining} strikes remaining.`, ephemeral: true })

        const incident = await prisma.case.create({
          data: {
            action: 'Strike removed',
            member: record.member,
            memberId: record.memberId,
            moderator: interaction.member.user.tag,
            moderatorId: interaction.member.id,
            reason: reason
          }
        })

        await prisma.$disconnect()

        const member = await interaction.guild.members.fetch(incident.memberId)
        const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
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
          .setTitle(`You lost a strike • ${strikesRemaining} remaining`)
          .addFields(
            { name: 'Reason', value: reason })
          .setFooter({ text: `Case #${incident.id}` })
          .setTimestamp()

        try {
          await member.send({ embeds: [notification] })
        } catch (e) {
          await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
        }
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

          await prisma.$disconnect()

          const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
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
