import { Listener } from 'hiei.js'

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
    return memberLog.send({ content: `:green_circle: <@${member.user.id}> joined the community` })
  }
}

export default MemberJoin
