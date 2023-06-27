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
    this.env = env
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
      const callback = state.meta.callback || state.configuration.flatMap((c) => c.config).reduce((acc, c) => ({ ...acc, ...c }), {}).callback
      if (callback) {
        const url = typeof callback === 'string' || callback instanceof String ? callback : callback.url
        const init = callback.init || { method: state.meta.method || 'POST' }
        init.body = JSON.stringify(state.meta.body || state.event)
        console.log({ url, init })
        const data = await fetch(url, init)
        const event = this.serviceState?.nextEvents.find((e) => data.status.toString().match(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/x/gi, '\\d'))))
        this.service.send(event || data.status.toString(), await data.json() )
      }
    })
    this.service.start(state)
  }

  async fetch(req) {
    const { user, redirect, json, method, origin, pathSegments, search } = await this.env.CTX.fetch(req).then(res => res.json())
    if (redirect) return Response.redirect(redirect)
    const [instance, stateEvent] = pathSegments
    if ((search || method === 'POST') && !this.machineDefinition) {
      this.machineDefinition = (search && JSON.parse(decodeURIComponent(search.substring(1)))) || json
      await this.state.storage.put('machineDefinition', this.machineDefinition)
      this.startMachine()
    }
    if (stateEvent) this.service?.send(stateEvent)

    const retval = {
      api: {
        icon: '●→',
        name: 'state.do',
        description: 'Finite State Machine implementation with Durable Objects based on xstate',
        url: 'https://state.do/',
        type: 'https://apis.do/state',
        endpoints: {
          create: origin + '/:key?{state_machine}',
          read: origin + '/:key',
          event: origin + '/:key/:event',
        },
        site: 'https://state.do',
        repo: 'https://github.com/drivly/state.do',
      },
      instance,
      state: this.machineState,
      events: this.serviceState?.nextEvents.map((e) => `${origin}/${instance}/${e.replaceAll(' ', '+')}`),
      user,
    }
    if (retval.events && !retval.events.length) delete retval.events
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}
