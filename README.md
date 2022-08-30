# [state.do](https://state.do)

Finite State Machine implementation with Durable Objects based on [xstate](https://xstate.js.org)

<https://state.do/:key>

<https://state.do/:key/:event>

<https://state.do/:key?{"id":"fetch","initial":"idle","states":{"idle":{"on":{"FETCH":"loading"}},"loading":{"on":{"RESOLVE":"success","REJECT":"failure"}},"success":{"type":"final"},"failure":{"on":{"RETRY":{"target":"loading"}}}}}>

## [🚀 We're hiring!](https://careers.do/apply)

[Driv.ly](https://driv.ly) is simple APIs to buy & sell cars online, funded by some of the [biggest names](https://twitter.com/TurnerNovak) in [automotive](https://fontinalis.com/team/#bill-ford) and [finance & insurance](https://www.detroit.vc)

We're building our entire infrastructure on Cloudflare Workers, Durable Objects, KV, R2, and PubSub. If you're as passionate about these transformational technologies as we are, we'd love for you to join our rapidly-growing team.
