import pino from 'pino'
const transport = pino.transport({
  target: 'pino-loki',
  options: {
    batching: true,
    interval: 4,
    labels: {
      application: 'Quinn'
    },
    host: process.env.LOKI_HOST,
    basicAuth: {
      username: process.env.LOKI_USERNAME,
      password: process.env.LOKI_PASSWORD
    }
  }
})

const localLog = {
  info: console.log,
  warn: console.warn,
  error: console.error
}

const log = process.env.LOKI_HOST ? pino(transport) : localLog

export default log
