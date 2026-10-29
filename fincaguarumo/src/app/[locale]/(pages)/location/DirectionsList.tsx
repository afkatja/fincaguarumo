"use client"

import { useTranslations } from "next-intl"

interface DirectionItem {
  fromLocation: string
  customFromLabel?: string
  transportMode: string
  duration: string
  distance: string
  roadConditions?: string
  stepByStep?: Array<{
    stepNumber: number
    instruction: string
    landmark?: string
  }>
  tips?: string[]
  costEstimate?: string
  bookingRequired?: boolean
  contactForBooking?: string
}

interface DirectionsListProps {
  directions: DirectionItem[]
}

const transportModeLabels: Record<string, string> = {
  drive: "Drive (Self-drive)",
  "flight-transfer": "Domestic Flight + Transfer",
  shuttle: "Private Transfer / Shuttle",
  bus: "Public Bus",
  "4x4": "4x4 Required",
}

const fromLocationLabels: Record<string, string> = {
  sjo: "San José (SJO Airport)",
  "san-jose": "San José City Center",
  pjm: "Puerto Jiménez Airport (PJM)",
  "puerto-jimenez": "Puerto Jiménez Town",
  "san-vito": "San Vito",
  panama: "Panama Border (Paso Canoas)",
  "manuel-antonio": "Manuel Antonio / Quepos",
  uvita: "Uvita / Dominical",
  custom: "Custom Location",
}

export default function DirectionsList({ directions }: DirectionsListProps) {
  const t = useTranslations("location")
  if (!directions || directions.length === 0) {
    return (
      <p className="text-muted-foreground">
        {t("noDirections", { defaultValue: "Directions not available" })}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {directions.map((direction, index) => (
        <details
          key={`${direction.fromLocation}-${direction.transportMode}-${index}`}
          className="group border border-border rounded-xl overflow-hidden bg-card"
        >
          <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium">
                {fromLocationLabels[direction.fromLocation] ||
                  direction.customFromLabel ||
                  direction.fromLocation}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                {transportModeLabels[direction.transportMode] ||
                  direction.transportMode}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {direction.duration}
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
                {direction.distance}
              </span>
              <svg
                className="h-5 w-5 transition-transform group-open:rotate-180 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </summary>

          <div className="p-5 pt-0 space-y-4 border-t">
            {direction.roadConditions && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">
                  {t("roadConditions", { defaultValue: "Road Conditions" })}
                </h4>
                <p className="text-muted-foreground whitespace-pre-line">
                  {direction.roadConditions}
                </p>
              </div>
            )}

            {direction.stepByStep && direction.stepByStep.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">
                  {t("stepByStep", { defaultValue: "Step-by-Step Directions" })}
                </h4>
                <ol className="space-y-3">
                  {direction.stepByStep.map(step => (
                    <li key={step.stepNumber} className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {step.stepNumber}
                      </span>
                      <div>
                        <p>{step.instruction}</p>
                        {step.landmark && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">
                              {t("landmark", { defaultValue: "Landmark" })}:
                            </span>{" "}
                            {step.landmark}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {direction.tips && direction.tips.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  {t("proTips", { defaultValue: "Pro Tips" })}
                </h4>
                <ul className="flex flex-wrap gap-2">
                  {direction.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="px-3 py-1 bg-muted text-sm rounded-full"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {direction.costEstimate && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-.895-2-3-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11l-1.299-2.598M19 11l1.299-2.598M19 11l1.299 2.598M19 11l-1.299 2.598M5 11l1.299-2.598M5 11l-1.299-2.598M5 11l-1.299 2.598M5 11l1.299 2.598"
                  />
                </svg>
                <span className="font-medium">
                  {t("costEstimate", { defaultValue: "Estimated Cost" })}:
                </span>
                <span>{direction.costEstimate}</span>
              </div>
            )}

            {direction.bookingRequired && direction.contactForBooking && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <div>
                  <p className="font-medium">
                    {t("bookingRequired", {
                      defaultValue: "Advance Booking Required",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {direction.contactForBooking}
                  </p>
                </div>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}
