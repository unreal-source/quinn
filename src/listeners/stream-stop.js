import { Listener } from 'hiei.js'
import { isStaff } from '../utilities/discord-util.js'

class StreamStop extends Listener {
  constructor () {
    super({
      name: 'StreamStop',
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

    if (oldState.streaming && !newState.streaming) {
      voiceLog.send({ content: `${username} stopped streaming in ${newState.channel}` })
    }
  }
}

export default StreamStop
