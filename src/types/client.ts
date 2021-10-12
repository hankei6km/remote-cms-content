export type FetchResult = {
  rows: any[]
}

export type ClientChain = {
  api: (name: string) => ClientChain
  limit: (n: number) => ClientChain
  skip: (n: number) => ClientChain
  fetch: () => Promise<FetchResult>
}

export type ClientInstance = {
  request: () => ClientChain
}

export type ClientOpts = {
  apiBaseURL: string
  apiName?: string
  credential: string[]
}

export type Client = (opst: ClientOpts) => ClientInstance
