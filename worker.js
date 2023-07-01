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
      if (this.machineState === state.value) return
      this.machineState = state.value
      await this.state.storage.put('machineState', this.machineState)
      const meta = Object.values(state.meta)[0]
      const callback = meta?.callback || state.configuration.flatMap((c) => c.config).reduce((acc, c) => ({ ...acc, ...c }), {}).callback
      if (callback) {
        const url = typeof callback === 'string' || callback instanceof String ? callback : callback.url
        const init = callback.init || meta?.init || {}
        init.method = meta?.method || init.method || 'POST'
        init.body = JSON.stringify(meta?.body || state.event)
        console.log({ url, init, state })
        const data = await fetch(url, init)
        const event = state?.nextEvents.find((e) => data.status.toString().match(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/x/gi, '\\d'))))
        this.service.send(event || data.status.toString(), await data.json())
      }
    })
    this.service.start(state)
  }

  async reset() {
    // Stop the service and reset the state before restarting it
    this.service?.stop()
    this.machineState = undefined
    this.serviceState = undefined
    await this.state.storage.delete('machineState')

    // Restart the service
    this.startMachine()
  }

  async update(machineDefinition) {
    // Don't update if the new definition is empty or hasn't changed
    if (!machineDefinition || machineDefinition === this.machineDefinition) return
    this.service?.stop()
    await this.state.storage.put('machineDefinition', this.machineDefinition = machineDefinition)
    this.startMachine(this.machineState)
  }

  async fetch(req) {
    const { user, redirect, json, method, origin, pathSegments, search } = await this.env.CTX.fetch(req).then(res => res.json())
    if (redirect) return Response.redirect(redirect)
    const [instance, stateEvent] = pathSegments
    const update = '?update='
    const isSearchBasedUpdate = search.startsWith(update)
    const retval = {
      api: {
        icon: '●→',
        name: 'state.do',
        description: 'Finite State Machine implementation with Durable Objects based on xstate',
        url: 'https://state.do/',
        type: 'https://apis.do/state',
        endpoints: {
          create: origin + '/:key?{state_machine}',
          reset: origin + '/:key?reset',
          update: origin + '/:key?update={state_machine}',
          read: origin + '/:key',
          event: origin + '/:key/:event',
        },
        site: 'https://state.do',
        repo: 'https://github.com/drivly/state.do',
      },
      instance,
    }
    const stateMap = () => {
      retval.state = this.machineState
      if (this.serviceState?.nextEvents && this.serviceState.nextEvents.length)
        retval.events = this.serviceState.nextEvents.map((e) => `${origin}/${instance}/${encodeURIComponent(e)}`)
    }
    if (search === '?reset') {
      await this.reset()
      stateMap()
    } else if (search.startsWith('?import=')) {
      const machine = await fetch(decodeURIComponent(search.substring('?import='.length))).then(res => res.json())
      await this.update(machine)
      stateMap()
    } else if (search === '?machine') {
      if (this.machineDefinition) retval.machine = this.machineDefinition
    } else if ((search && (!this.machineDefinition || isSearchBasedUpdate) || method === 'POST')) {
      await this.update((search && JSON.parse(decodeURIComponent(search.substring(isSearchBasedUpdate ? update.length : 1)))) || json)
      stateMap()
    } else if (stateEvent) {
      this.service?.send(stateEvent)
      stateMap()
    } else {
      stateMap()
    }
    retval.user = user
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}
