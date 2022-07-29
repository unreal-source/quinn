import { Listener } from 'hiei.js'

class VoiceJoin extends Listener {
  constructor () {
    super({
      name: 'VoiceJoin',
      emitter: 'client',
      event: 'voiceStateUpdate'
    })
  }

  async run (oldState, newState) {
    if (oldState.channel === newState.channel) {
      return
    }

    const voiceLog = await this.client.channels.fetch(process.env.VOICE_LOG_CHANNEL)
    const isModerator = newState.member.roles.cache.some(role => role.id === process.env.MODERATOR_ROLE)
    const username = isModerator ? `:shield: **${newState.member.displayName}**` : `<@${newState.member.id}>`

    if (oldState.channel === null && newState.channel !== null) {
      voiceLog.send({ content: `${username} joined ${newState.channel}` })
    }
  }
}

export default VoiceJoin
