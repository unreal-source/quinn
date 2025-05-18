import pino from 'pino'

const localConfig = {
  target: 'pino-pretty',
  options: {
    translateTime: 'HH:MM:ss Z',
    ignore: 'pid,hostname'
  }
}

const axiomConfig = {
  target: '@axiomhq/pino',
  options: {
    dataset: Bun.env.AXIOM_DATASET,
    token: Bun.env.AXIOM_TOKEN
  }
}

const localTransport = pino.transport(localConfig)
const axiomTransport = pino.transport(axiomConfig)

const log = Bun.env.AXIOM_TOKEN ? pino(axiomTransport) : pino(localTransport)
const fastifyOptions = Bun.env.AXIOM_TOKEN ? { transport: axiomConfig } : { transport: localConfig }

export { log, fastifyOptions }
