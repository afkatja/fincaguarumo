import { createClient } from "@sanity/client"

function validateSanityEnv() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_WRITE_TOKEN

  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID environment variable is required",
    )
  }
  if (!dataset) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_DATASET environment variable is required",
    )
  }
  if (!token) {
    throw new Error("SANITY_API_WRITE_TOKEN environment variable is required")
  }

  return { projectId, dataset, token }
}

const { projectId, dataset, token } = validateSanityEnv()

export const migrationClient = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token, // write token here
  useCdn: false,
  perspective: "raw",
})
