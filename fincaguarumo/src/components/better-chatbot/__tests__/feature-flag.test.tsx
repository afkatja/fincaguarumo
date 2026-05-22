import { render, screen } from "@testing-library/react"
import EmbeddedChat from "../EmbeddedChat"
import FloatingChatButton from "../FloatingChatButton"
import SidebarChat from "../SidebarChat"

// Mock the feature flag
jest.mock("../../lib/featureFlags", () => ({
  isChatbotEnabled: jest.fn(),
}))

const { isChatbotEnabled } = require("../../lib/featureFlags")

describe("Chatbot Components - Feature Flag", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("When chatbot feature is disabled", () => {
    beforeEach(() => {
      isChatbotEnabled.mockReturnValue(false)
    })

    test("EmbeddedChat should render null", () => {
      const { container } = render(<EmbeddedChat />)
      expect(container.firstChild).toBeNull()
    })

    test("FloatingChatButton should render null", () => {
      const { container } = render(<FloatingChatButton />)
      expect(container.firstChild).toBeNull()
    })

    test("SidebarChat should render null", () => {
      const { container } = render(<SidebarChat />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe("When chatbot feature is enabled", () => {
    beforeEach(() => {
      isChatbotEnabled.mockReturnValue(true)
    })

    test("EmbeddedChat should render when enabled", () => {
      // Mock the hooks used inside EmbeddedChat
      jest.mock("../../app/providers/BookingCoreProvider", () => ({
        useBookingCore: () => ({
          state: {
            data: {
              source: "direct",
              customerDetails: {},
              bookingType: "tour",
              bookingDetails: {
                title: "Test Tour",
                description: "Test Description",
                location: "Test Location",
              },
              dates: {},
              guests: 1,
              currency: "USD",
            },
          },
        }),
      }))

      jest.mock("../../hooks/usePageContext", () => ({
        usePageContext: () => ({ page: "homepage" }),
      }))

      const { container } = render(<EmbeddedChat />)
      // Should render something (not null)
      expect(container.firstChild).not.toBeNull()
    })
  })
})
