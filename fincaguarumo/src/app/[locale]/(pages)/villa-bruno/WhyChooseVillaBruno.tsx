"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import Title from "../../../../components/Title"

interface WhyChooseData {
  title: string
  subtitle?: string
  description?: string
  slug: { current: string }
  mainImage?: {
    url: string
    alt?: string
  }
  comparisonTable: Array<{
    feature: string
    villaBruno: string
    largeEcoResorts?: string
    corcovadoLodges?: string
    traditionalHotels?: string
    otherVacationRentals?: string
    category?: string
    sortOrder?: number
    isHighlight?: boolean
  }>
  keyDifferentiators: Array<{
    title: string
    description: string
    icon?: string
    sortOrder?: number
  }>
  idealFor?: string[]
  lessSuitableFor?: string[]
}

interface WhyChooseVillaBrunoProps {
  data: WhyChooseData
  locale: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  sustainability: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  experience: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  comfort: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  location: (
    <svg
      className="h-5 w-5"
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
  ),
  value: (
    <svg
      className="h-5 w-5"
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
  ),
}

export default function WhyChooseVillaBruno({
  data,
  locale,
}: WhyChooseVillaBrunoProps) {
  const t = useTranslations("villaBruno.whyChoose")

  if (!data) return null

  const categoryLabels: Record<string, string> = {
    sustainability: t("sustainability"),
    experience: t("experience"),
    comfort: t("comfort"),
    location: t("location"),
    value: t("value"),
  }

  console.log({ data })

  return (
    <section
      className="space-y-12 py-8  max-w-5xl mx-auto"
      aria-labelledby="why-choose-heading"
    >
      <header className="space-y-2">
        <Title
          title={data.title}
          titleClassName="text-3xl font-bold"
          icon={{ title: "Guarumo" }}
        />
        {data.subtitle && (
          <p className="text-lg text-muted-foreground">{data.subtitle}</p>
        )}
        {data.description && (
          <p className="text-muted-foreground">{data.description}</p>
        )}
      </header>

      {/* Key Differentiators */}
      {data.keyDifferentiators && data.keyDifferentiators.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-guarumo-accent">
            {t("keyDifferentiators", {
              defaultValue: "What Makes Us Different",
            })}
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.keyDifferentiators
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((diff, index) => (
                <article
                  key={`${diff.title}-${index}`}
                  className="flex group not-last:border-r border-gray-400 px-2 mr-2"
                >
                  <div className="w-14 h-14 text-secondary mr-2">
                    {diff.icon && categoryIcons[diff.icon] ? (
                      categoryIcons[diff.icon]
                    ) : (
                      <svg
                        className="h-7 w-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">{diff.title}</h4>
                    <p className="text-muted-foreground">{diff.description}</p>
                  </div>
                </article>
              ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {data.comparisonTable && data.comparisonTable.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-guarumo-accent">
            {t("comparisonTable", { defaultValue: "How We Compare" })}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="sticky left-0 z-10 px-4 py-3 text-left font-semibold bg-muted/50 border-r border-border">
                    {t("feature", { defaultValue: "Feature" })}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold border-r border-border">
                    {t("villaBruno", {
                      defaultValue: "Villa Bruno at Finca Guarumo",
                    })}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold border-r border-border">
                    {t("largeEcoResorts", {
                      defaultValue: "Large Eco-Resorts",
                    })}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold border-r border-border">
                    {t("corcovadoLodges", { defaultValue: "Corcovado Lodges" })}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold border-r border-border">
                    {t("traditionalHotels", {
                      defaultValue: "Traditional Hotels",
                    })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.comparisonTable
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((row, index) => (
                    <tr
                      key={`${row.feature}-${index}`}
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/30 transition-colors",
                        row.isHighlight && "bg-primary/5",
                      )}
                    >
                      <td className="sticky left-0 z-10 px-4 py-3 font-medium bg-card border-r border-border">
                        <div className="relative">
                          {row.category && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-r-xl absolute -top-7 -left-5">
                              {categoryLabels[row.category] || row.category}
                            </span>
                          )}
                          <p className="p-2 text-guarumo-accent mt-4">
                            {row.feature}
                          </p>
                          {row.isHighlight && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                              {t("keyDifferentiator", { defaultValue: "★" })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-primary">
                        {row.villaBruno}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {row.largeEcoResorts || "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {row.corcovadoLodges || "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {row.traditionalHotels || "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ideal For / Less Suitable For */}
      <div className="grid gap-8 md:grid-cols-2">
        {data.idealFor && data.idealFor.length > 0 && (
          <div className="space-y-4 p-6 border border-border rounded-xl bg-card">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-guarumo-primary dark:text-guarumo-secondary">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {t("idealFor", { defaultValue: "Ideal For" })}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.idealFor.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.lessSuitableFor && data.lessSuitableFor.length > 0 && (
          <div className="space-y-4 p-6 border border-border rounded-xl bg-card">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-destructive">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {t("lessSuitableFor", { defaultValue: "Less Suitable For" })}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.lessSuitableFor.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-destructive shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
