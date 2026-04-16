import { render, screen } from "@testing-library/react"
import { SidebarChat } from "../../components/better-chatbot/SidebarChat"
import { FloatingChatButton } from "../../components/better-chatbot/FloatingChatButton"
import { EmbeddedChat } from "../../components/better-chatbot/EmbeddedChat"

// Mock viewport dimensions
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}))

describe("AC5: Mobile Experience", () => {
  describe("Mobile Responsiveness", () => {
    test("should render floating chat button correctly on mobile (375px)", () => {
      mockViewport(375, 667) // iPhone SE dimensions

      render(<FloatingChatButton />)

      const button = screen.getByRole("button", { name: /chat/i })
      expect(button).toBeInTheDocument()
      
      // Should be positioned correctly on mobile
      expect(button).toHaveStyle({
        position: "fixed",
        bottom: expect.stringContaining("rem"),
        right: expect.stringContaining("rem"),
        zIndex: expect.any(String)
      })
    })

    test("should render sidebar chat correctly on mobile (375px)", () => {
      mockViewport(375, 667)

      render(<SidebarChat isOpen={true} onClose={() => {}} />)

      const sidebar = screen.getByTestId("chat-sidebar")
      expect(sidebar).toBeInTheDocument()
      
      // Should take full width on mobile
      expect(sidebar).toHaveStyle({
        width: "100vw",
        height: "100vh"
      })
    })

    test("should render embedded chat correctly on mobile (375px)", () => {
      mockViewport(375, 667)

      render(<EmbeddedChat propertyId="villa-bruno" />)

      const chatContainer = screen.getByTestId("embedded-chat")
      expect(chatContainer).toBeInTheDocument()
      
      // Should be responsive on mobile
      expect(chatContainer).toHaveStyle({
        width: "100%",
        maxWidth: "100%"
      })
    })

    test("should prevent horizontal scroll on mobile", () => {
      mockViewport(375, 667)

      const { container } = render(<SidebarChat isOpen={true} onClose={() => {}} />)
      
      // Should not cause horizontal overflow
      expect(container).toHaveStyle({
        overflowX: "hidden"
      })
    })

    test("should optimize touch targets for mobile", () => {
      mockViewport(375, 667)

      render(<FloatingChatButton />)

      const button = screen.getByRole("button", { name: /chat/i })
      
      // Touch targets should be at least 44px for mobile accessibility
      const buttonStyles = window.getComputedStyle(button)
      expect(parseInt(buttonStyles.minWidth || '0')).toBeGreaterThanOrEqual(44)
      expect(parseInt(buttonStyles.minHeight || '0')).toBeGreaterThanOrEqual(44)
    })
  })

  describe("Touch Interactions", () => {
    test("should handle touch events smoothly on mobile", () => {
      mockViewport(375, 667)

      render(<FloatingChatButton />)

      const button = screen.getByRole("button", { name: /chat/i })
      
      // Should have touch-friendly styles
      expect(button).toHaveStyle({
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        WebkitUserSelect: "none"
      })
    })

    test("should handle swipe gestures for sidebar on mobile", () => {
      mockViewport(375, 667)

      render(<SidebarChat isOpen={true} onClose={() => {}} />)

      const sidebar = screen.getByTestId("chat-sidebar")
      
      // Should support touch gestures for closing
      expect(sidebar).toHaveAttribute("data-swipeable", "true")
    })

    test("should prevent zoom on input focus (mobile Safari)", () => {
      mockViewport(375, 667)

      render(<EmbeddedChat propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/type your message/i)
      
      // Should prevent zoom on focus
      expect(input).toHaveStyle({
        fontSize: "16px" // Prevents zoom on iOS Safari
      })
    })
  })

  describe("Mobile Performance", () => {
    test("should lazy load chat components on mobile", () => {
      mockViewport(375, 667)

      // Should load chat components only when needed
      expect(require("../../components/better-chatbot/LazyChat")).toBeDefined()
    })

    test("should optimize images for mobile", () => {
      mockViewport(375, 667)

      render(<EmbeddedChat propertyId="villa-bruno" />)

      const images = screen.getAllByRole("img")
      
      images.forEach(img => {
        expect(img).toHaveAttribute("loading", "lazy")
        expect(img).toHaveAttribute("sizes", "(max-width: 375px) 100vw")
      })
    })
  })

  describe("Mobile Accessibility", () => {
    test("should maintain accessibility on mobile", () => {
      mockViewport(375, 667)

      render(<FloatingChatButton />)

      const button = screen.getByRole("button", { name: /chat/i })
      
      // Should have proper ARIA labels
      expect(button).toHaveAttribute("aria-label", "Open chat")
      expect(button).toHaveAttribute("aria-expanded", "false")
    })

    test("should support screen readers on mobile", () => {
      mockViewport(375, 667)

      render(<SidebarChat isOpen={true} onClose={() => {}} />)

      const sidebar = screen.getByTestId("chat-sidebar")
      
      // Should announce when sidebar opens/closes
      expect(sidebar).toHaveAttribute("role", "dialog")
      expect(sidebar).toHaveAttribute("aria-modal", "true")
      expect(sidebar).toHaveAttribute("aria-label", "Chat conversation")
    })
  })

  describe("Mobile Layout Breakpoints", () => {
    test("should adapt layout for different mobile sizes", () => {
      // Test small mobile
      mockViewport(320, 568) // iPhone 5
      const { rerender } = render(<FloatingChatButton />)
      
      let button = screen.getByRole("button", { name: /chat/i })
      expect(button).toBeInTheDocument()

      // Test larger mobile
      mockViewport(414, 896) // iPhone 11
      rerender(<FloatingChatButton />)
      
      button = screen.getByRole("button", { name: /chat/i })
      expect(button).toBeInTheDocument()
    })

    test("should handle orientation changes on mobile", () => {
      // Portrait
      mockViewport(375, 667)
      const { rerender } = render(<SidebarChat isOpen={true} onClose={() => {}} />)
      
      let sidebar = screen.getByTestId("chat-sidebar")
      expect(sidebar).toBeInTheDocument()

      // Landscape
      mockViewport(667, 375)
      rerender(<SidebarChat isOpen={true} onClose={() => {}} />)
      
      sidebar = screen.getByTestId("chat-sidebar")
      expect(sidebar).toBeInTheDocument()
      expect(sidebar).toHaveStyle({
        width: "100vw",
        height: "100vh"
      })
    })
  })
})
