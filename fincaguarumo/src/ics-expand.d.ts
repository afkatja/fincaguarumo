declare module "ical-expander" {
  interface Event {
    startDate: any
    endDate: any
    component: any
  }

  interface Occurrence {
    startDate: any
    endDate: any
    component: any
  }

  interface BetweenResult {
    events: Event[]
    occurrences: Occurrence[]
  }

  interface IcalExpanderOptions {
    ics: string
    maxIterations?: number
  }

  export default class IcalExpander {
    constructor(options: IcalExpanderOptions)
    between(from: Date, to: Date): BetweenResult
  }
}
