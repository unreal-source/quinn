import pino from 'pino'
const transport = pino.transport({
  target: '@axiomhq/pino',
  options: {
    dataset: process.env.AXIOM_DATASET,
    token: process.env.AXIOM_TOKEN
  }
})

const localLog = {
  info: console.log,
  warn: console.warn,
  error: console.error
}

const log = process.env.AXIOM_TOKEN ? pino(transport) : localLog

export default log
