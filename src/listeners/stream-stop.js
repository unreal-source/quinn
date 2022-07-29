import { Listener } from 'hiei.js'

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
    const isModerator = newState.member.roles.cache.some(role => role.id === process.env.MODERATOR_ROLE)
    const username = isModerator ? `:shield: **${newState.member.displayName}**` : `<@${newState.member.id}>`

    if (oldState.streaming && !newState.streaming) {
      voiceLog.send({ content: `${username} stopped streaming in ${newState.channel}` })
    }
  }
}

export default StreamStop
