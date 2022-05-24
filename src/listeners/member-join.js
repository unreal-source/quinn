import { Listener } from 'hiei.js'
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
    const prisma = new PrismaClient()
    const settings = await prisma.settings.findUnique({
      where: { guild: member.guild.id }
    })

    if (settings.shield) {
      await member.kick()
      return memberLog.send({ content: `:warning: Shield prevented <@${member.user.id}> from joining the community` })
    }

    return memberLog.send({ content: `:green_circle: <@${member.user.id}> joined the community` })
  }
}

export default MemberJoin
