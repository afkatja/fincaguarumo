export const apiVersion = process.env.SANITY_STUDIO_API_VERSION || "2024-08-04"

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_STUDIO_DATASET ||
    process.env.SANITY_STUDIO_DATASET ||
    "production",
  "Missing environment variable: SANITY_STUDIO_DATASET"
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_STUDIO_PROJECT_ID ||
    process.env.SANITY_STUDIO_PROJECT_ID ||
    "1yaom9qu",
  "Missing environment variable: SANITY_STUDIO_PROJECT_ID"
)

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }

  return v
}
