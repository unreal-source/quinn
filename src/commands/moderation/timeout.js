import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder, time } from 'discord.js'
import ms from 'ms'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class Timeout extends SlashCommand {
  constructor () {
    super({
      name: 'timeout',
      description: 'Timeout a user',
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'The user you want to time out',
          required: true
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'duration',
          description: 'How long they should be timed out for',
          required: true,
          choices: [
            { name: '60 secs', value: '60 secs' },
            { name: '5 mins', value: '5 mins' },
            { name: '10 mins', value: '10 mins' },
            { name: '1 hour', value: '1 hour' },
            { name: '1 day', value: '1 day' },
            { name: '1 week', value: '1 week' }
          ]
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for timing them out, if any'
        }
      ]
    })
  }

  async run (interaction) {
    const member = interaction.options.getMember('user')
    const duration = interaction.options.getString('duration')
    const reason = interaction.options.getString('reason')
    const prisma = new PrismaClient()

    if (!member) {
      return interaction.reply({ content: 'That user is not in the server. If they still appear as an option, try refreshing your client.', ephemeral: true })
    }

    if (member.id === this.client.user.id) {
      return interaction.reply({ content: 'Nice try, human.', ephemeral: true })
    }

    if (member.id === interaction.member.id) {
      return interaction.reply({ content: 'You can\'t time yourself out.', ephemeral: true })
    }

    if (member.isCommunicationDisabled()) {
      return interaction.reply({ content: `${member.user.tag} is already timed out until ${time(member.communicationDisabledUntil)}.`, ephemeral: true })
    }

    await member.timeout(ms(duration), reason)
    await interaction.reply({ content: `${member.user.tag} was timed out for ${duration}.`, ephemeral: true })

    const incident = await prisma.case.create({
      data: {
        action: 'Timed out',
        member: member.user.tag,
        memberId: member.id,
        moderator: interaction.member.user.tag,
        moderatorId: interaction.member.id,
        reason,
        timeout: {
          create: { duration }
        }
      }
    })

    const moderationLogChannel = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
    const moderationLogEmbed = new EmbedBuilder()
      .setAuthor({ name: `⏳ Timed out for ${duration}` })
      .setDescription(`**Member:** ${incident.member}\n**Member ID:** ${incident.memberId}\n**Reason:** ${incident.reason}`)
      .setFooter({ text: `Case ${incident.id} • ${incident.moderator}` })
      .setThumbnail(member.displayAvatarURL())
      .setTimestamp()

    const moderationLogEntry = await moderationLogChannel.send({ embeds: [moderationLogEmbed] })

    await prisma.case.update({
      where: { id: incident.id },
      data: { reference: moderationLogEntry.url }
    })

    await prisma.$disconnect()

    const notification = new EmbedBuilder()
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setTitle(`Timed out for ${duration}`)
      .setDescription(`**Reason:** ${reason}`)
      .setTimestamp()

    try {
      await member.send({ embeds: [notification] })
    } catch (e) {
      await interaction.followUp({ content: ':warning: The user wasn\'t notified because they\'re not accepting direct messages.', ephemeral: true })
    }
  }
}

export default Timeout
