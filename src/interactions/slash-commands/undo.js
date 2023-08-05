import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import { getUsername } from '../../utilities/discord-util.js'
import log from '../../utilities/logger.js'
import prisma from '../utilities/prisma-client.js'

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
      ],
      defaultMemberPermissions: PermissionFlagsBits.BanMembers
    })
  }

  async run (interaction) {
    const subcommand = interaction.options.getSubcommand()

    log.info({ event: 'command-used', command: this.name, channel: interaction.channel.name })

    await interaction.deferReply({ ephemeral: true })

    switch (subcommand) {
      case 'timeout': {
        const member = interaction.options.getMember('user')
        const reason = interaction.options.getString('reason')

        if (!member) {
          return interaction.followUp({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
        }

        if (member.id === this.client.user.id) {
          return interaction.followUp({ content: 'Nice try, human.', ephemeral: true })
        }

        if (member.id === interaction.member.id) {
          return interaction.followUp({ content: 'You can\'t cancel your own timeout.', ephemeral: true })
        }

        if (member.isCommunicationDisabled()) {
          await member.timeout(null, reason)
          await interaction.followUp({ content: `${getUsername(member)} is no longer timed out.`, ephemeral: true })

          const incident = await prisma.case.create({
            data: {
              action: 'Timeout cancelled',
              member: getUsername(member),
              memberId: member.id,
              moderator: getUsername(interaction.member),
              moderatorId: interaction.member.id,
              reason
            }
          })

          const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
          const moderationLogEmbed = new EmbedBuilder()
            .setAuthor({ name: '↩️ Timeout cancelled' })
            .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}`)
            .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
            .setThumbnail(member.displayAvatarURL())
            .setTimestamp()

          const moderationLogEntry = await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

          await prisma.case.update({
            where: { id: incident.id },
            data: { reference: moderationLogEntry.url }
          })

          const notification = new EmbedBuilder()
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTitle('Timeout cancelled')
            .setDescription(`**Reason:** ${reason}`)
            .setTimestamp()

          try {
            await member.send({ embeds: [notification] })
          } catch (e) {
            await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
          }
        } else {
          return interaction.followUp({ content: `${getUsername(member)} isn not timed out.`, ephemeral: true })
        }
        break
      }

      case 'strike': {
        const caseNumber = interaction.options.getInteger('case')
        const reason = interaction.options.getString('reason')
        const record = await prisma.case.findUnique({
          where: { id: caseNumber },
          include: { strike: true }
        })

        if (!record) {
          return interaction.followUp({ content: 'Case not found.', ephemeral: true })
        }

        if (!record.strike) {
          return interaction.followUp({ content: `Case ${record.id} is not a strike.`, ephemeral: true })
        }

        if (!record.strike.isActive) {
          return interaction.followUp({ content: 'Strike already removed.', ephemeral: true })
        }

        if (record.memberId === interaction.member.id) {
          return interaction.followUp({ content: 'You can\'t remove your own strike.', ephemeral: true })
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

        await interaction.followUp({ content: `${record.member} lost a strike. They have ${strikesRemaining} strikes remaining.`, ephemeral: true })

        const incident = await prisma.case.create({
          data: {
            action: 'Strike removed',
            member: record.member,
            memberId: record.memberId,
            moderator: getUsername(interaction.member),
            moderatorId: interaction.member.id,
            reason
          }
        })

        const member = await interaction.guild.members.fetch(incident.memberId)
        const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
        const moderationLogEmbed = new EmbedBuilder()
          .setAuthor({ name: '↩️ Strike removed' })
          .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}`)
          .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
          .setThumbnail(member.displayAvatarURL())
          .setTimestamp()

        const moderationLogEntry = await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

        await prisma.case.update({
          where: { id: incident.id },
          data: { reference: moderationLogEntry.url }
        })

        const notification = new EmbedBuilder()
          .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTitle('One of your strikes was removed')
          .setDescription(`${strikesRemaining === 0 ? 'No strikes remaining. ' : `${strikesRemaining} strikes remaining`}\n\n**Reason:** ${reason}`)
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
          return interaction.followUp({ content: 'Nice try, human.', ephemeral: true })
        }

        if (id === interaction.member.id) {
          return interaction.followUp({ content: 'You can\'t revoke your own ban.', ephemeral: true })
        }

        try {
          const ban = await interaction.guild.bans.fetch(id)

          await interaction.guild.members.unban(id)
          await interaction.followUp({ content: `${ban.user.tag} is no longer banned. Please remember to notify them.`, ephemeral: true })

          const incident = await prisma.case.create({
            data: {
              action: 'Ban revoked',
              member: ban.user.tag,
              memberId: ban.user.id,
              moderator: getUsername(interaction.member),
              moderatorId: interaction.member.id,
              reason
            }
          })

          const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
          const moderationLogEmbed = new EmbedBuilder()
            .setAuthor({ name: '↩️ Ban revoked' })
            .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}`)
            .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
            .setThumbnail(ban.user.displayAvatarURL())
            .setTimestamp()

          const moderationLogEntry = await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

          await prisma.case.update({
            where: { id: incident.id },
            data: { reference: moderationLogEntry.url }
          })
        } catch {
          try {
            const member = await interaction.guild.members.fetch(id)
            return interaction.followUp({ content: `${getUsername(member)} is not banned.`, ephemeral: true })
          } catch {
            return interaction.followUp({ content: `${id} is not a valid user ID.`, ephemeral: true })
          }
        }
        break
      }
    }
  }
}

export default Undo
