import { Listener } from 'hiei.js'
import { time } from 'discord.js'
import ms from 'ms'
import pkg from '@prisma/client'
const { PrismaClient } = pkg

class MemberJoin extends Listener {
  constructor () {
    super({
      name: 'MemberJoin',
      emitter: 'client',
      event: 'guildMemberAdd'
    })
  }

  async run (member) {
    const memberLog = await this.client.channels.fetch(process.env.MEMBER_LOG_CHANNEL)
    const newMemberAgeLimit = new Date(Date.now() - ms(process.env.NEW_MEMBER_AGE_LIMIT))
    const prisma = new PrismaClient()
    const settings = await prisma.settings.findUnique({
      where: { guild: member.guild.id }
    })

    if (settings.shield) {
      await member.kick()
      return memberLog.send({ content: `:shield: Shield prevented <@${member.user.id}> from joining the community` })
    }

    if (member.joinedTimestamp > newMemberAgeLimit) {
      return memberLog.send({ content: `:new: <@${member.user.id}> joined the community • Account created ${time(member.user.createdTimestam, 'R')}` })
    }

    return memberLog.send({ content: `:green_circle: <@${member.user.id}> joined the community` })
  }
}

export default MemberJoin
