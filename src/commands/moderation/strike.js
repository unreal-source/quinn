import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { time } from '@discordjs/builders'
import ms from 'ms'
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
          description: 'The reason for this strike, if any'
        }
      ]
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const reason = interaction.options.getString('reason')
    const now = new Date()
    const expiration = new Date(now.setDate(now.getDate() + 30))
    const prisma = new PrismaClient()

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
        reason: reason,
        strike: {
          create: {
            expiration: expiration,
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

    const moderationLog = interaction.guild.channels.cache.get(process.env.MOD_LOG_CHANNEL)

    // Strike 1 - Timeout for 10 mins
    if (activeStrikes === 1) {
      await member.timeout(ms(process.env.STRIKE_ONE_TIMEOUT_DURATION), reason)
      await interaction.reply({ content: `${member.user.tag} was given strike ${activeStrikes} and was timed out for ${process.env.STRIKE_ONE_TIMEOUT_DURATION}.`, ephemeral: true })

      const moderationLogEntry = new EmbedBuilder()
        .setAuthor({ name: '🚩 Strike 1 • Timed out for 10 mins' })
        .setTitle(incident.member)
        .setThumbnail(member.displayAvatarURL())
        .addFields(
          { name: 'Moderator', value: incident.moderator },
          { name: 'Reason', value: incident.reason },
          { name: 'Expiration', value: time(incident.strike.expiration, 'R') })
        .setFooter({ text: `Case #${incident.id}` })
        .setTimestamp()

      await moderationLog.send({ embeds: [moderationLogEntry] })

      const notification = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('Strike 1 • You were timed out for 10 mins')
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Expiration', value: time(incident.strike.expiration, 'R') })
        .setFooter({ text: `Case #${incident.id}` })
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }
    }

    // Strike 2 - Timeout for 1 hour
    if (activeStrikes === 2) {
      await member.timeout(ms(process.env.STRIKE_TWO_TIMEOUT_DURATION), reason)
      await interaction.reply({ content: `${member.user.tag} got strike ${activeStrikes} and was timed out for ${process.env.STRIKE_TWO_TIMEOUT_DURATION}.`, ephemeral: true })

      const moderationLogEntry = new EmbedBuilder()
        .setAuthor({ name: '🚩 Strike 2 • Timed out for 1 hour' })
        .setTitle(incident.member)
        .setThumbnail(member.displayAvatarURL())
        .addFields(
          { name: 'Moderator', value: incident.moderator },
          { name: 'Reason', value: incident.reason },
          { name: 'Expiration', value: time(incident.strike.expiration, 'R') })
        .setFooter({ text: `Case #${incident.id}` })
        .setTimestamp()

      await moderationLog.send({ embeds: [moderationLogEntry] })

      const notification = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('Strike 2 • You were timed out for 1 hour')
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Expiration', value: time(incident.strike.expiration, 'R') })
        .setFooter({ text: `Case #${incident.id}` })
        .setTimestamp()

      try {
        await member.send({ embeds: [notification] })
      } catch (e) {
        await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
      }
    }

    // Strike 3 - Banned
    if (activeStrikes === 3) {
      if (member.bannable) {
        const notification = new EmbedBuilder()
          .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTitle('Strike 3 • You were banned from the server')
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Expiration', value: time(incident.strike.expiration, 'R') })
          .setFooter({ text: `Case #${incident.id}` })
          .setTimestamp()

        try {
          await member.send({ embeds: [notification] })
        } catch (e) {
          await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
        }

        await member.ban({ days: 1, reason: reason })
        await interaction.reply({ content: `${member.user.tag} got strike ${activeStrikes} and was banned from the server.`, ephemeral: true })

        const moderationLogEntry = new EmbedBuilder()
          .setAuthor({ name: '🚩 Strike 3 • Banned from the server' })
          .setTitle(incident.member)
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: 'Moderator', value: incident.moderator },
            { name: 'Reason', value: incident.reason },
            { name: 'Expiration', value: time(incident.strike.expiration, 'R') })
          .setFooter({ text: `Case #${incident.id}` })
          .setTimestamp()

        await moderationLog.send({ embeds: [moderationLogEntry] })
      } else {
        return interaction.reply({ content: 'I don\'t have permission to ban that member.', ephemeral: true })
      }
    }
  }
}

export default Strike
