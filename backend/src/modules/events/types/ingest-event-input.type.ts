export type IngestEventInput = {
  eventName: string
  properties: Record<string, unknown>
  timestamp: Date
  timestampProvided: boolean
}

