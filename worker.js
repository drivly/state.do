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
    })
    if (this.machineDefinition) {
      this.startMachine(this.machineState)
    }
  }

  startMachine(state) {
    this.machine = createMachine(this.machineDefinition)
    this.service = interpret(this.machine)
    this.service.onTransition(async (state) => {
      this.machineState = state.value
      await this.state.storage.put('machineState', this.machineState)
    })
    this.service.start(state)
  }

  async fetch(req) {
    const { url, method } = req
    if (method === 'POST' && !this.machineDefinition) {
      this.machineDefinition = await req.json()
      await this.state.storage.put('machineDefinition', this.machineDefinition)
      this.startMachine()
    }

    const stateEvent = new URL(url).pathname.split('/')[2]
    if (stateEvent) this.service.send(stateEvent)

    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.now()
    const retval = {
      id,
      ts,
      state: this.machineState,
    }
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}
