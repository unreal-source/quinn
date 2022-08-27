import { SlashCommand } from 'hiei.js'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'

class Purge extends SlashCommand {
  constructor () {
    super({
      name: 'purge',
      description: 'Bulk delete messages in the current text channel',
      options: [
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'quantity',
          description: 'The number of messages you want to delete',
          required: true
        },
        {
          type: ApplicationCommandOptionType.User,
          name: 'author',
          description: 'Only delete messages from this user'
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'reason',
          description: 'The reason for purging these messages, if any',
          required: true
        }
      ]
    })
  }

  async run (interaction) {
    const quantity = interaction.options.getInteger('quantity')
    const author = interaction.options.getMember('author')
    const reason = interaction.options.getString('reason')

    if (author) {
      const messages = await interaction.channel.messages.fetch()
      const messagesByAuthor = await messages.filter(m => m.author.id === author.id).first(quantity)

      await interaction.channel.bulkDelete(messagesByAuthor)
      await interaction.reply({ content: `Deleted ${quantity} messages by ${author.user.tag}`, ephemeral: true })

      const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
      const moderationLogEntry = new EmbedBuilder()
        .setAuthor({ name: `🧹 ${quantity} messages deleted` })
        .setDescription(`**Channel:** ${interaction.channel}\n**Author:** ${author.user.tag}\n**Author ID:** ${author.id}\n**Reason:** ${reason}`)
        .setFooter({ text: interaction.user.tag })
        .setTimestamp()

      return moderationLog.send({ embeds: [moderationLogEntry] })
    }

    await interaction.channel.bulkDelete(quantity)
    await interaction.reply({ content: `Deleted ${quantity} messages`, ephemeral: true })

    const moderationLog = interaction.guild.channels.cache.get(process.env.MODERATION_LOG_CHANNEL)
    const moderationLogEntry = new EmbedBuilder()
      .setAuthor({ name: `🧹 ${quantity} messages deleted` })
      .setDescription(`**Channel:** ${interaction.channel}\n**Reason:** ${reason}`)
      .setFooter({ text: interaction.user.tag })
      .setTimestamp()

    return moderationLog.send({ embeds: [moderationLogEntry] })
  }
}

export default Purge
