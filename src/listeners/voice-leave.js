import { Listener } from 'hiei.js'
import { isStaff } from '../utilities/discord-util.js'

class VoiceLeave extends Listener {
  constructor () {
    super({
      name: 'VoiceLeave',
      emitter: 'client',
      event: 'voiceStateUpdate'
    })
  }

  async run (oldState, newState) {
    if (oldState.channel === newState.channel) {
      return
    }

    const voiceLog = await this.client.channels.fetch(process.env.VOICE_LOG_CHANNEL)
    const canStream = newState.member.roles.cache.some(role => role.id === process.env.STREAMING_ROLE)
    const username = isStaff(newState.member) ? `:shield: **${newState.member.displayName}**` : `<@${newState.member.id}>`

    if (oldState.channel !== null && newState.channel === null) {
      if (canStream) {
        await newState.member.roles.remove(process.env.STREAMING_ROLE)
      }

      voiceLog.send({ content: `${username} left ${oldState.channel}` })
    }

    if (oldState.channel !== newState.channel && oldState.channel !== null && newState.channel !== null) {
      if (canStream) {
        await newState.member.roles.remove(process.env.STREAMING_ROLE)
      }

      voiceLog.send({ content: `${username} moved from ${oldState.channel} to ${newState.channel}` })
    }
  }
}

export default VoiceLeave
