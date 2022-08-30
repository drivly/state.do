# [state.do](https://state.do)

Finite State Machine implementation with Durable Objects based on [xstate](https://xstate.js.org)

<https://state.do/:key>
<https://state.do/:key/:event>
<https://state.do/:key?{%22id%22:%20%22fetch%22,%22initial%22:%20%22idle%22,%22states%22:%20{%22idle%22:%20{%22on%22:%20{%22FETCH%22:%20%22loading%22}},%22loading%22:%20{%22on%22:%20{%22RESOLVE%22:%20%22success%22,%22REJECT%22:%20%22failure%22}},%22success%22:%20{%22type%22:%20%22final%22},%22failure%22:%20{%22on%22:%20{%22RETRY%22:%20{%22target%22:%20%22loading%22}}}}}>

## [🚀 We're hiring!](https://careers.do/apply)

[Driv.ly](https://driv.ly) is simple APIs to buy & sell cars online, funded by some of the [biggest names](https://twitter.com/TurnerNovak) in [automotive](https://fontinalis.com/team/#bill-ford) and [finance & insurance](https://www.detroit.vc)

We're building our entire infrastructure on Cloudflare Workers, Durable Objects, KV, R2, and PubSub. If you're as passionate about these transformational technologies as we are, we'd love for you to join our rapidly-growing team.
