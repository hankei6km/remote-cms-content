export const ClientKindValues = ['appsheet', 'contentful', 'microcms'] as const
export type ClientKind = typeof ClientKindValues[number]

export type FetchResult = {
  content: Record<string, unknown>[]
}

export const OpKindValues = ['eq'] as const
export type OpKind = typeof OpKindValues[number]
export type OpValue = [OpKind, string, any]

export type TransformContent = (
  content: FetchResult['content']
) => FetchResult['content']

export type ClientChain = {
  api: (name: string) => ClientChain
  filter: (o: OpValue[]) => ClientChain
  limit: (n: number) => ClientChain
  skip: (n: number) => ClientChain
  transform: (t: TransformContent) => ClientChain
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
