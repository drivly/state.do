import { createMachine, interpret } from 'xstate'

export default {
  fetch: (req, env) => {
    const { hostname, pathname } = new URL(req.url)
    const instance = pathname.split('/')[1]
    const id = env.STATE.idFromName(hostname + instance)
    const stub = env.STATE.get(id)
    return stub.fetch(req)
  },
}

export class State {
  constructor(state, env) {
    this.state = state
    state.blockConcurrencyWhile(async () => {
      ;[this.machineDefinition, this.machineState] = await Promise.all([this.state.storage.get('machineDefinition'), this.state.storage.get('machineState')])
      if (this.machineDefinition) {
        this.startMachine(this.machineState)
      }
    })
  }

  startMachine(state) {
    this.machine = createMachine(this.machineDefinition)
    this.service = interpret(this.machine)
    this.service.onTransition(async (state) => {
      this.serviceState = state
      this.machineState = state.value
      await this.state.storage.put('machineState', this.machineState)
      const callback = state.configuration
        .flatMap((c) => c.config)
        .reduce((acc, c) => {
          return { ...acc, ...c }
        }, {})?.callback
      if (callback) {
        try {
          const eventData = state.event?.data
          // TODO: Let user specify format
          const data = await fetch(callback + eventData)
          this.service.send('OK', { data: await data.text() })
        } catch (error) {
          this.service.send('Error', { data: error })
        }
      }
    })
    this.service.start(state)
  }

  async fetch(req) {
    const { url, method } = req
    const { origin, pathname, search } = new URL(url)
    const [_, instance, stateEvent] = pathname.split('/')
    if ((search || method === 'POST') && !this.machineDefinition) {
      this.machineDefinition = (search && JSON.parse(decodeURIComponent(search.substring(1)))) || (await req.json())
      await this.state.storage.put('machineDefinition', this.machineDefinition)
      this.startMachine()
    }
    if (stateEvent) this.service.send(stateEvent)

    const retval = {
      instance,
      state: this.machineState,
      events: this.serviceState?.nextEvents.map((e) => `${origin}/${instance}/${e}`),
    }
    if (retval.events && !retval.events.length) delete retval.events
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}
