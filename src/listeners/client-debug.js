import { Listener } from 'hiei.js'

class ClientDebug extends Listener {
  constructor () {
    super({
      name: 'ClientDebug',
      emitter: 'client',
      event: 'debug'
    })
  }

  run (info) {
    return console.log(`DEBUG: ${info}`)
  }
}

export default ClientDebug
