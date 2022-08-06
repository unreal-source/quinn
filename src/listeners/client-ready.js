import { Listener } from 'hiei.js'
import Cron from 'croner'
import { EmbedBuilder } from 'discord.js'
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

    // Remove expired strikes
    // Cron('0 * * * *', () => {
    //   console.log('This job runs every hour')
    // })

    // Monitor for unusually high number of member joins
    // Cron('* * * * *', async () => {
    //   console.log('This job runs every minute')
    // })

    Cron('* * * * *', async () => {
      const guild = await this.client.guilds.fetch(process.env.GUILD)
      const now = new Date()
      const prisma = new PrismaClient()
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
        await prisma.$disconnect()
        return console.log('No expired strikes')
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
          .setDescription(strikesRemaining === 0 ? 'You have no strikes remaining. ' : `You have ${strikesRemaining} strikes remaining`)
          .setTimestamp()

        try {
          await member.send({ embeds: [notification] })
        } catch (e) {
          console.error(e)
        }

        await prisma.$disconnect()
      }
    })
  }
}

export default ClientReady
