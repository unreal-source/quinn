import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits, time } from 'discord.js'
import ms from 'ms'
import log from '../../utilities/logger.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Strike extends SlashCommand {
  constructor () {
    super({
      name: 'strike',
      description: 'Give someone a strike',
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'The user you want to give a strike to',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for this strike, if any',
          required: true
        }
      ],
      defaultMemberPermissions: PermissionFlagsBits.BanMembers
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const reason = interaction.options.getString('reason')
    const now = new Date()
    const expiration = new Date(now.setMilliseconds(now.getMilliseconds() + ms(process.env.STRIKE_DURATION)))
    const prisma = new PrismaClient()

    log.info({ event: 'command-used', command: this.name, channel: interaction.channel })

    if (!member) {
      return interaction.reply({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
    }

    if (member.id === this.client.user.id) {
      return interaction.reply({ content: 'Nice try, human.', ephemeral: true })
    }

    if (member.id === interaction.member.id) {
      return interaction.reply({ content: 'You can\'t give yourself a strike.', ephemeral: true })
    }

    const incident = await prisma.case.create({
      data: {
        action: 'Strike added',
        member: member.user.tag,
        memberId: member.id,
        moderator: interaction.member.user.tag,
        moderatorId: interaction.member.id,
        reason,
        strike: {
          create: {
            expiration,
            isActive: true
          }
        }
      },
      include: { strike: true }
    })

    const activeStrikes = await prisma.case.count({
      where: {
        action: 'Strike added',
        memberId: member.id,
        strike: {
          isActive: true
        }
      }
    })

    const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)

    // Strike 1 - Timeout for 10 mins
    if (activeStrikes === 1) {
      await member.timeout(ms(process.env.STRIKE_ONE_TIMEOUT_DURATION), reason)
      await interaction.reply({ content: `${member.user.tag} received strike ${activeStrikes} and was timed out for ${process.env.STRIKE_ONE_TIMEOUT_DURATION}.`, ephemeral: true })

      const moderationLogEmbed = new EmbedBuilder()
        .setAuthor({ name: `🚩 Strike 1 • Timed out for ${process.env.STRIKE_ONE_TIMEOUT_DURATION}` })
        .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}\n**Expiration:** ${time(incident.strike.expiration, 'R')}`)
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
        .setTitle(`Strike 1 • Timed out for ${process.env.STRIKE_ONE_TIMEOUT_DURATION}`)
        .setDescription(`**Reason:** ${reason}\n**Expiration:** ${time(incident.strike.expiration, 'f')}`)
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }

      await prisma.$disconnect()
    }

    // Strike 2 - Timeout for 1 hour
    if (activeStrikes === 2) {
      await member.timeout(ms(process.env.STRIKE_TWO_TIMEOUT_DURATION), reason)
      await interaction.reply({ content: `${member.user.tag} received strike ${activeStrikes} and was timed out for ${process.env.STRIKE_TWO_TIMEOUT_DURATION}.`, ephemeral: true })

      const moderationLogEmbed = new EmbedBuilder()
        .setAuthor({ name: `🚩 Strike 2 • Timed out for ${process.env.STRIKE_TWO_TIMEOUT_DURATION}` })
        .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}\n**Expiration:** ${time(incident.strike.expiration, 'R')}`)
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
        .setTitle(`Strike 2 • Timed out for ${process.env.STRIKE_TWO_TIMEOUT_DURATION}`)
        .setDescription(`**Reason:** ${reason}\n**Expiration:** ${time(incident.strike.expiration, 'f')}`)
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }

      await prisma.$disconnect()
    }

    // Strike 3 - Banned
    if (activeStrikes === 3) {
      if (member.bannable) {
        const notification = new EmbedBuilder()
          .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTitle('Strike 3 • Banned from the server')
          .setDescription(`**Reason:** ${reason}\n—\nYou may appeal the ban by filling out [this form](${process.env.BAN_APPEAL_LINK}). Our staff will review your appeal and respond as soon as possible.`)
          .setTimestamp()

        try {
          await member.send({ embeds: [notification] })
        } catch (e) {
          await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
        }

        await member.ban({ days: 1, reason })
        await interaction.reply({ content: `${member.user.tag} received strike ${activeStrikes} and was banned from the server.`, ephemeral: true })

        const moderationLogEmbed = new EmbedBuilder()
          .setAuthor({ name: '🚩 Strike 3 • Banned from the server' })
          .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}\n**Expiration:** ${time(incident.strike.expiration, 'R')}`)
          .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
          .setThumbnail(member.displayAvatarURL())
          .setTimestamp()

        const moderationLogEntry = await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

        await prisma.case.update({
          where: { id: incident.id },
          data: { reference: moderationLogEntry.url }
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

        await prisma.$disconnect()
      } else {
        return interaction.reply({ content: 'I don\'t have permission to ban that member.', ephemeral: true })
      }
    }
  }
}

export default Strike
