jest.mock("next-sanity", () => {
  const mockClient = {
    fetch: jest.fn(),
    patch: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      commit: jest.fn().mockResolvedValue({ _id: "patched123" }),
    })),
    create: jest.fn().mockResolvedValue({ _id: "created123" }),
  }
  return {
    createClient: jest.fn(() => mockClient),
  }
})

jest.mock("@/sanity/lib/translateText")
jest.mock("@/sanity/lib/portableTextHelper", () => ({
  isPortableText: jest.fn(),
  portableTextToPlain: jest.fn(),
  plainToPortableText: jest.fn(),
}))

import { POST } from "@/app/api/translate/route"
import { createClient } from "next-sanity"
import { translateWithRetry } from "@/sanity/lib/translateText"
const { isPortableText, portableTextToPlain, plainToPortableText } = jest.requireMock("@/sanity/lib/portableTextHelper")

const mockCreateClient = createClient as jest.Mock
const mockTranslateWithRetry = translateWithRetry as jest.Mock
const mockClient = mockCreateClient()

describe("/api/translate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "test-project"
    process.env.NEXT_PUBLIC_SANITY_DATASET = "test-dataset"
    process.env.SANITY_API_WRITE_TOKEN = "test-token"
    process.env.SANITY_STUDIO_API_VERSION = "2024-01-01"
  })

  const createMockRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

  describe("POST", () => {
    it("should return 400 when docId is missing", async () => {
      const request = createMockRequest({ docType: "page" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Missing required fields: docId, docType")
    })

    it("should return 400 when docType is missing", async () => {
      const request = createMockRequest({ docId: "doc123" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Missing required fields: docId, docType")
    })

    it("should return 400 when no valid target languages", async () => {
      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["en"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("No valid target languages specified")
    })

    it("should return 404 when document not found", async () => {
      mockClient.fetch.mockResolvedValueOnce(null)

      const request = createMockRequest({ docId: "doc123", docType: "page" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Document not found")
    })

    it("should return 400 when translation not configured for docType", async () => {
      mockClient.fetch.mockResolvedValueOnce({ _id: "doc123", _type: "unknownType", slug: { current: "test" } })

      const request = createMockRequest({ docId: "doc123", docType: "unknownType" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Translation not configured for document type: unknownType")
    })

    it("should proceed when source document has no slug", async () => {
      const sourceDoc = { _id: "doc123", _type: "page", title: "Test" }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Título", provider: "google-cloud" })
      mockClient.create.mockResolvedValueOnce({ _id: "new123", _type: "page", language: "es" })

      const request = createMockRequest({ docId: "doc123", docType: "page" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      const createCall = mockClient.create.mock.calls[0][0]
      expect(createCall.slug).toBeUndefined()
    })

    it("should skip translation when already exists and complete", async () => {
      const existingDoc = {
        _id: "existing123",
        _type: "page",
        title: "Existing Title",
        subtitle: "Existing Subtitle",
        description: "Existing Description",
        body: "Existing body",
        slug: { current: "test-page" },
        language: "es",
      }

      mockClient.fetch
        .mockResolvedValueOnce({ _id: "doc123", _type: "page", title: "Test", subtitle: "Sub", description: "Desc", body: "Body", slug: { current: "test-page" } })
        .mockResolvedValueOnce(existingDoc)
        .mockResolvedValueOnce(null)

      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Título traducido", provider: "google-cloud" })

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.translations).toHaveLength(1)
      expect(data.translations[0]).toMatchObject({
        language: "es",
        skipped: true,
      })
      expect(mockTranslateWithRetry).not.toHaveBeenCalled()
    })

    it("should create new translation when none exists", async () => {
      const sourceDoc = { _id: "doc123", _type: "page", title: "Test Title", body: "Test body", slug: { current: "test-page" } }
      const createdDoc = { _id: "new123", _type: "page", title: "Título de prueba", body: "Cuerpo de prueba", slug: { current: "test-page" }, language: "es" }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Título de prueba", provider: "google-cloud" })
      mockClient.create.mockResolvedValueOnce(createdDoc)
      mockClient.patch.mockReturnValueOnce({ set: jest.fn().mockReturnThis(), commit: jest.fn().mockResolvedValueOnce({ _id: "metadata123" }) })

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.translations).toHaveLength(1)
      expect(data.translations[0]).toMatchObject({
        language: "es",
        success: true,
        doc: createdDoc,
      })
      expect(mockClient.create).toHaveBeenCalled()
    })

    it("should update existing translation with new fields", async () => {
      const sourceDoc = { _id: "doc123", _type: "page", title: "Test Title", body: "Test body", slug: { current: "test-page" } }
      const existingDoc = { _id: "existing123", _type: "page", title: "Old Title", slug: { current: "test-page" }, language: "es" }
      const updatedDoc = { _id: "existing123", _type: "page", title: "Título de prueba", slug: { current: "test-page" }, language: "es" }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(existingDoc)
        .mockResolvedValueOnce(null)

      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Título de prueba", provider: "google-cloud" })
      mockClient.patch.mockReturnValueOnce({ set: jest.fn().mockReturnThis(), commit: jest.fn().mockResolvedValueOnce(updatedDoc) })

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.translations[0]).toMatchObject({
        language: "es",
        success: true,
        updated: true,
      })
    })

    it("should handle Portable Text fields", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "page",
        title: "Test Title",
        body: [{ _type: "block", children: [{ _type: "span", text: "Test body" }] }],
        slug: { current: "test-page" },
      }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      isPortableText.mockReturnValue(true)
      portableTextToPlain.mockReturnValue("Test body")
      plainToPortableText.mockReturnValue([{ _type: "block", children: [{ _type: "span", text: "Cuerpo de prueba" }] }])
      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Cuerpo de prueba", provider: "google-cloud" })
      const { _id: _, ...sourceDocWithoutId } = sourceDoc
      mockClient.create.mockResolvedValueOnce({ _id: "new123", ...sourceDocWithoutId, body: [{ _type: "block", children: [{ _type: "span", text: "Cuerpo de prueba" }] }], language: "es" })

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(isPortableText).toHaveBeenCalled()
      expect(portableTextToPlain).toHaveBeenCalled()
      expect(plainToPortableText).toHaveBeenCalled()
    })

    it("should handle translation errors gracefully", async () => {
      const sourceDoc = { _id: "doc123", _type: "page", title: "Test Title", body: "Test body", slug: { current: "test-page" } }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      mockTranslateWithRetry.mockRejectedValueOnce(new Error("Translation API error"))

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es", "de"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0]).toMatchObject({
        language: "es",
        error: expect.stringContaining("Failed to translate field"),
      })
    })

    it("should use default target languages when not specified", async () => {
      const sourceDoc = { _id: "doc123", _type: "page", title: "Test", body: "Body", slug: { current: "test" } }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      mockTranslateWithRetry.mockResolvedValue({ translatedText: "Translated", provider: "google-cloud" })
      const { _id: _, ...sourceDocWithoutId } = sourceDoc
      mockClient.create.mockResolvedValue({ _id: "new123", ...sourceDocWithoutId, language: "es" })

      const request = createMockRequest({ docId: "doc123", docType: "page" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.translations.length).toBeGreaterThan(0)
    })
  })
})