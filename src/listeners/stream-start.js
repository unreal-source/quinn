import { Listener } from 'hiei.js'
import { isStaff } from '../utilities/discord-util.js'

class StreamStart extends Listener {
  constructor () {
    super({
      name: 'StreamStart',
      emitter: 'client',
      event: 'voiceStateUpdate'
    })
  }

  async run (oldState, newState) {
    if (oldState.streaming === newState.streaming) {
      return
    }

    const voiceLog = await this.client.channels.fetch(process.env.VOICE_LOG_CHANNEL)
    const username = isStaff(newState.member) ? `:shield: **${newState.member.displayName}**` : `<@${newState.member.id}>`

    if (!oldState.streaming && newState.streaming) {
      voiceLog.send({ content: `${username} started streaming in ${newState.channel}` })
    }
  }
}

export default StreamStart
