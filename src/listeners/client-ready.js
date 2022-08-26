import { Listener } from 'hiei.js'
import Cron from 'croner'
import { EmbedBuilder, roleMention } from 'discord.js'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class ClientReady extends Listener {
  constructor () {
    super({
      name: 'ClientReady',
      emitter: 'client',
      event: 'ready',
      once: true
    })
  }

  async run () {
    await this.client.guilds.cache.each(guild => console.log(`${this.client.user.tag} connected to ${guild.name}`))

    const guild = await this.client.guilds.fetch(process.env.GUILD)
    const prisma = new PrismaClient()
    let memberCount = guild.memberCount

    // Remove expired strikes
    Cron('0 * * * *', async () => {
      const now = new Date()
      const activeStrikes = await prisma.case.findMany({
        where: {
          action: 'Strike added',
          strike: {
            isActive: true
          }
        },
        include: { strike: true }
      })

      const expiredStrikes = activeStrikes.filter(record => record.strike.expiration <= now)

      if (expiredStrikes.length === 0) {
        return prisma.$disconnect()
      }

      for await (const strike of expiredStrikes) {
        await prisma.strike.update({
          where: { id: strike.id },
          data: {
            isActive: false
          }
        })

        const member = await guild.members.fetch(strike.memberId)
        const strikesRemaining = await prisma.case.count({
          where: {
            action: 'Strike added',
            memberId: member.id,
            strike: {
              isActive: true
            }
          }
        })

        const notification = new EmbedBuilder()
          .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
          .setTitle('One of your strikes expired')
          .setDescription(strikesRemaining === 0 ? 'No strikes remaining. ' : `${strikesRemaining} strikes remaining`)
          .setTimestamp()

        try {
          await member.send({ embeds: [notification] })
        } catch (e) {
          console.error(e)
        }

        prisma.$disconnect()
      }
    })

    // Monitor for unusually high number of member joins
    Cron('* * * * *', async () => {
      const currentMemberCount = this.client.guilds.cache.get(process.env.GUILD).memberCount
      const difference = currentMemberCount - memberCount

      if (difference >= process.env.SUSPICIOUS_JOIN_COUNT) {
        const channel = guild.channels.cache.get(process.env.ALERTS_CHANNEL)
        channel.send({ content: `:warning: ${roleMention(process.env.MODERATOR_ROLE)} ${difference} new members joined the server in the last 1 minute.` })
      }

      memberCount = currentMemberCount
    })
  }
}

export default ClientReady
