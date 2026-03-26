import { AsyncLocalStorage } from 'async_hooks'

export type RequestContext = {
  requestId: string
  correlationId: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export const RequestContextStorage = {
  run<T>(context: RequestContext, callback: () => T): T {
    return storage.run(context, callback)
  },

  get(): RequestContext | undefined {
    return storage.getStore()
  },
}
