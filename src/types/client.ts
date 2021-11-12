export const ClientKindValues = ['appsheet', 'contentful', 'microcms'] as const
export type ClientKind = typeof ClientKindValues[number]

export type FetchResult = {
  contents: Record<string, unknown>[]
}

export type ClientChain = {
  api: (name: string) => ClientChain
  limit: (n: number) => ClientChain
  skip: (n: number) => ClientChain
  fetch: () => Promise<FetchResult>
}

export type ClientInstance = {
  kind: () => ClientKind
  request: () => ClientChain
}

export type ClientOpts = {
  apiBaseURL: string
  apiName?: string
  credential: string[]
}

export type Client = (opst: ClientOpts) => ClientInstance
