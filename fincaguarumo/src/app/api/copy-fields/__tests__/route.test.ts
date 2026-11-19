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

jest.mock("@/lib/auth", () => ({
  verifyAdminAuth: jest.fn(),
}))

import { POST } from "@/app/api/copy-fields/route"
import { createClient } from "next-sanity"
import { verifyAdminAuth } from "@/lib/auth"

const mockCreateClient = createClient as jest.Mock
const mockClient = mockCreateClient()
const mockVerifyAdminAuth = verifyAdminAuth as jest.Mock

describe("/api/copy-fields", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyAdminAuth.mockResolvedValue({ id: "admin-user" })
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "test-project"
    process.env.NEXT_PUBLIC_SANITY_DATASET = "test-dataset"
    process.env.SANITY_API_WRITE_TOKEN = "test-token"
    process.env.SANITY_STUDIO_API_VERSION = "2024-01-01"
  })

  const createMockRequest = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/copy-fields", {
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

    it("should copy fields to target languages when source has no slug", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "home",
        title: "Test",
        mainImage: { _type: "image", asset: { _ref: "image1" } },
        isPublished: true,
        // no slug
      }
      const createdDoc = { _id: "new123", _type: "home", language: "es", title: "Test" }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
      mockClient.create.mockResolvedValueOnce(createdDoc)

      const request = createMockRequest({ docId: "doc123", docType: "home", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.copied).toBe(1)
      expect(mockClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: "home",
          language: "es",
        })
      )
      // slug should NOT be included when source has no slug
      const createCall = mockClient.create.mock.calls[0][0]
      expect(createCall.slug).toBeUndefined()
    })

    it("should skip when all copy-as-is fields already filled", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        mainImage: { _type: "image", asset: { _ref: "image1" } },
        isPublished: true,
      }
      const existingDoc = {
        _id: "existing123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        language: "es",
        mainImage: { _type: "image", asset: { _ref: "image1" } },
        isPublished: true,
      }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(existingDoc)

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.skipped).toBe(1)
      expect(data.results[0]).toMatchObject({ language: "es", skipped: true })
      expect(mockClient.patch).not.toHaveBeenCalled()
    })

    it("should copy missing fields to existing translation", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        mainImage: { _type: "image", asset: { _ref: "image1" } },
        isPublished: true,
        categories: [],
      }
      const existingDoc = {
        _id: "existing123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        language: "es",
        isPublished: true,
        // mainImage missing
      }
      const updatedDoc = { ...existingDoc, mainImage: sourceDoc.mainImage }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(existingDoc)
      mockClient.patch.mockReturnValueOnce({ set: jest.fn().mockReturnThis(), commit: jest.fn().mockResolvedValueOnce(updatedDoc) })

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.copied).toBe(1)
      expect(mockClient.patch).toHaveBeenCalledWith("existing123")
      const patchInstance = mockClient.patch.mock.results[0].value
      const setCall = patchInstance.set.mock.calls[0][0]
      expect(setCall.mainImage).toEqual(sourceDoc.mainImage)
      expect(setCall.categories).toEqual([])
    })

    it("should create new translation when none exists", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        mainImage: { _type: "image", asset: { _ref: "image1" } },
        isPublished: true,
      }
      const createdDoc = { _id: "new123", _type: "page", language: "es", slug: { current: "test-page" }, mainImage: sourceDoc.mainImage, isPublished: true }

      mockClient.fetch.mockResolvedValueOnce(sourceDoc).mockResolvedValueOnce(null)
      mockClient.create.mockResolvedValueOnce(createdDoc)

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.copied).toBe(1)
      expect(mockClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: "page",
          language: "es",
          mainImage: sourceDoc.mainImage,
        })
      )
    })

    it("should handle multiple target languages", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        mainImage: { _type: "image", asset: { _ref: "image1" } },
      }

      mockClient.fetch
        .mockResolvedValueOnce(sourceDoc)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockClient.create.mockResolvedValue({ _id: "new123" })

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es", "de"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(2)
    })

    it("should handle errors gracefully for one language", async () => {
      const sourceDoc = {
        _id: "doc123",
        _type: "page",
        title: "Test",
        slug: { current: "test-page" },
        mainImage: { _type: "image", asset: { _ref: "image1" } },
      }

      mockClient.fetch.mockResolvedValueOnce(sourceDoc).mockResolvedValueOnce(null)
      mockClient.create.mockRejectedValueOnce(new Error("Write failed"))

      const request = createMockRequest({ docId: "doc123", docType: "page", targetLanguages: ["es", "de"] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.errors).toHaveLength(1)
    })
  })
})
