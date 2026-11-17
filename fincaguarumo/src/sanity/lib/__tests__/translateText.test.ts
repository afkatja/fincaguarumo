jest.mock("@vitalets/google-translate-api", () => ({
  translate: jest.fn(),
}))

global.fetch = jest.fn()

const cleanEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SANITY_PROJECT_ID: "test-project",
  NEXT_PUBLIC_SANITY_DATASET: "test-dataset",
  SANITY_API_WRITE_TOKEN: "test-token",
  SANITY_STUDIO_API_VERSION: "2024-01-01",
}

beforeEach(() => {
  jest.resetModules()
  process.env = { ...cleanEnv }
  ;(global.fetch as jest.Mock).mockReset()
})

afterAll(() => {
  process.env = { ...cleanEnv }
})

async function getTranslateModule() {
  return await import("@/sanity/lib/translateText")
}

describe("translateText", () => {
  describe("getDefaultOptions", () => {
    it("should return default options with google-cloud provider", async () => {
      process.env.TRANSLATION_PROVIDER = "google-cloud"
      const { getDefaultOptions } = await getTranslateModule()
      const options = getDefaultOptions()
      expect(options.provider).toBe("google-cloud")
      expect(options.maxRetries).toBe(3)
      expect(options.baseDelayMs).toBe(1000)
    })

    it("should use TRANSLATION_PROVIDER from env", async () => {
      process.env.TRANSLATION_PROVIDER = "ollama"
      const { getDefaultOptions } = await getTranslateModule()
      const options = getDefaultOptions()
      expect(options.provider).toBe("ollama")
    })

    it("should use google-free provider when specified", async () => {
      process.env.TRANSLATION_PROVIDER = "google-free"
      const { getDefaultOptions } = await getTranslateModule()
      const options = getDefaultOptions()
      expect(options.provider).toBe("google-free")
    })
  })

  describe("getTranslationProvider", () => {
    it("should return current provider", async () => {
      process.env.TRANSLATION_PROVIDER = "libretranslate"
      const { getTranslationProvider } = await getTranslateModule()
      expect(getTranslationProvider()).toBe("libretranslate")
    })
  })

  describe("translateText with google-cloud provider", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "google-cloud"
      process.env.GOOGLE_CLOUD_API_KEY_TEST = "test-key"
    })

    it("should translate text successfully", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            translations: [{ translatedText: "Hola mundo" }],
          },
        }),
      })

      const result = await translateText("Hello world", "en", "es")
      expect(result).toBe("Hola mundo")
      expect(global.fetch).toHaveBeenCalledWith(
        "https://translation.googleapis.com/language/translate/v2?key=test-key",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            q: "Hello world",
            source: "en",
            target: "es",
            format: "text",
          }),
        })
      )
    })

    it("should throw on API error without retrying on 4xx errors", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: { message: "Invalid API key" } }),
      })

      await expect(translateText("Hello", "en", "es", { maxRetries: 0 })).rejects.toThrow(
        "Google Cloud Translate API error: Invalid API key"
      )
    })

    it("should throw when API key is missing", async () => {
      const { translateText } = await getTranslateModule()
      delete process.env.GOOGLE_CLOUD_API_KEY_TEST
      delete process.env.NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY

      await expect(translateText("Hello", "en", "es", { maxRetries: 0 })).rejects.toThrow(
        "Google Cloud Translate API key not configured"
      )
    })
  })

  describe("translateText with google-free provider", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "google-free"
    })

    it("should translate text using @vitalets/google-translate-api", async () => {
      const { translateText } = await getTranslateModule()
      const { translate } = await import("@vitalets/google-translate-api")
      ;(translate as jest.Mock).mockResolvedValueOnce({ text: "Hola mundo" })

      const result = await translateText("Hello world", "en", "es")
      expect(result).toBe("Hola mundo")
      expect(translate).toHaveBeenCalledWith("Hello world", { from: "en", to: "es" })
    })

    it("should throw on translation error", async () => {
      const { translateText } = await getTranslateModule()
      const { translate } = await import("@vitalets/google-translate-api")
      ;(translate as jest.Mock).mockRejectedValueOnce(new Error("Rate limited"))

      await expect(translateText("Hello", "en", "es", { maxRetries: 0 })).rejects.toThrow("Rate limited")
    })
  })

  describe("translateText with ollama provider", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "ollama"
      process.env.OLLAMA_HOST = "http://localhost:11434"
      process.env.OLLAMA_MODEL = "llama3.2"
    })

    it("should translate text using Ollama", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Hola mundo" }),
      })

      const result = await translateText("Hello world", "en", "es")
      expect(result).toBe("Hola mundo")
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            model: "llama3.2",
            prompt: "Translate the following text to es. Return ONLY the translation, no explanations:\n\nHello world",
            stream: false,
            options: { temperature: 0.1 },
          }),
        })
      )
    })
  })

  describe("translateText with libretranslate provider", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "libretranslate"
      process.env.LIBRETRANSLATE_URL = "https://libretranslate.com/translate"
    })

    it("should translate text using LibreTranslate", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: "Hola mundo" }),
      })

      const result = await translateText("Hello world", "en", "es")
      expect(result).toBe("Hola mundo")
      expect(global.fetch).toHaveBeenCalledWith(
        "https://libretranslate.com/translate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            q: "Hello world",
            source: "en",
            target: "es",
            format: "text",
          }),
        })
      )
    })
  })

  describe("translateText with huggingface provider", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "huggingface"
      process.env.HUGGINGFACE_TOKEN = "test-token"
      process.env.HUGGINGFACE_MODEL = "test-model"
    })

    it("should translate text using Hugging Face", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ generated_text: "Hola mundo" }],
      })

      const result = await translateText("Hello world", "en", "es")
      expect(result).toBe("Hola mundo")
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api-inference.huggingface.co/models/test-model",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      )
    })

    it("should throw when token is missing", async () => {
      const { translateText } = await getTranslateModule()
      delete process.env.HUGGINGFACE_TOKEN

      await expect(translateText("Hello", "en", "es", { maxRetries: 0 })).rejects.toThrow(
        "Hugging Face token not configured"
      )
    })
  })

  describe("translateWithRetry", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "google-cloud"
      process.env.GOOGLE_CLOUD_API_KEY_TEST = "test-key"
    })

    it("should return translated text with provider info", async () => {
      const { translateWithRetry } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            translations: [{ translatedText: "Hola mundo" }],
          },
        }),
      })

      const result = await translateWithRetry("Hello world", "en", "es")
      expect(result).toEqual({
        translatedText: "Hola mundo",
        provider: "google-cloud",
      })
    })
  })

  describe("retry logic", () => {
    beforeEach(() => {
      process.env.TRANSLATION_PROVIDER = "google-cloud"
      process.env.GOOGLE_CLOUD_API_KEY_TEST = "test-key"
    })

    it("should retry on failure and succeed", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { translations: [{ translatedText: "Hola mundo" }] },
          }),
        })

      const result = await translateText("Hello world", "en", "es", { maxRetries: 2, baseDelayMs: 10 })
      expect(result).toBe("Hola mundo")
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it("should throw after max retries exceeded", async () => {
      const { translateText } = await getTranslateModule()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"))

      await expect(
        translateText("Hello world", "en", "es", { maxRetries: 2, baseDelayMs: 10 })
      ).rejects.toThrow("Network error")
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })
})