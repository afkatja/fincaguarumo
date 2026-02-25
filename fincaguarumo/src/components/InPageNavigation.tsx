"use client"
import React, { useEffect, useState, useRef } from "react"
import { gsap } from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { Button } from "./ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useTranslations } from "next-intl"

// Register the plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin)
}

interface NavSection {
  id: string
  label: string
  element?: HTMLElement | null
}

interface InPageNavigationProps {
  sections: NavSection[]
}

const InPageNavigation: React.FC<InPageNavigationProps> = ({ sections }) => {
  const [activeSection, setActiveSection] = useState<string>("")
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const isVisibleRef = useRef(isVisible)
  const activeSectionRef = useRef(activeSection)
  const t = useTranslations("page")

  // Update refs when state changes
  useEffect(() => {
    isVisibleRef.current = isVisible
  }, [isVisible])

  useEffect(() => {
    activeSectionRef.current = activeSection
  }, [activeSection])

  // Define primary sections (always visible) and secondary sections (hidden by default on mobile)
  const primarySections = sections.slice(0, 3) // Quick Info, Reviews, About
  const secondarySections = sections.slice(3) // Details, FAQ, All Reviews

  useEffect(() => {
    // Check if CSS scroll() function and CSS animations are supported
    const checkSupport = () => {
      try {
        const testElement = document.createElement("div")
        const hasScrollSupport =
          "scrollBehavior" in document.documentElement.style &&
          typeof CSS.supports === "function" &&
          CSS.supports("scroll-behavior", "smooth")
        const hasAnimationSupport =
          "animation" in testElement.style &&
          typeof CSS.supports === "function" &&
          CSS.supports("animation", "slideIn 0.3s ease-out")
        setIsSupported(hasScrollSupport && hasAnimationSupport)
      } catch {
        setIsSupported(false)
      }
    }

    checkSupport()
  }, [])

  useEffect(() => {
    // Find section elements
    const sectionElements = sections.map(section => ({
      ...section,
      element: document.getElementById(section.id),
    }))

    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      // Show/hide navigation based on scroll position
      const shouldShow = scrollY > 300
      if (shouldShow !== isVisibleRef.current) {
        setIsVisible(shouldShow)

        if (navRef.current) {
          if (isSupported) {
            // Prefer CSS animations
            if (shouldShow) {
              navRef.current.style.animation = "slideIn 0.4s ease-out forwards"
            } else {
              navRef.current.style.animation = "slideOut 0.3s ease-in forwards"
            }
          } else {
            // Fallback to GSAP
            gsap.to(navRef.current, {
              y: shouldShow ? 0 : 100,
              opacity: shouldShow ? 1 : 0,
              duration: shouldShow ? 0.4 : 0.3,
              ease: shouldShow ? "power2.out" : "power2.in",
            })
          }
        }
      }

      // Determine active section with better accuracy
      let currentSection = ""
      let maxVisibility = 0

      sectionElements.forEach(section => {
        if (section.element) {
          const rect = section.element.getBoundingClientRect()
          const elementTop = rect.top
          const elementBottom = rect.bottom
          const elementHeight = rect.height

          // Calculate how much of the element is visible in the viewport
          const visibleTop = Math.max(0, elementTop)
          const visibleBottom = Math.min(windowHeight, elementBottom)
          const visibleHeight = Math.max(0, visibleBottom - visibleTop)
          const visibilityRatio = visibleHeight / elementHeight

          // Consider section active if it's at least 20% visible and has the highest visibility
          if (visibilityRatio > 0.2 && visibilityRatio > maxVisibility) {
            maxVisibility = visibilityRatio
            currentSection = section.id
          }
        }
      })

      // Fallback to the first section if none are sufficiently visible
      if (!currentSection && scrollY < 200) {
        currentSection = sections[0]?.id || ""
      }

      if (currentSection !== activeSectionRef.current) {
        setActiveSection(currentSection)
      }
    }

    // Throttle scroll events for better performance
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", throttledHandleScroll, { passive: true })
    handleScroll() // Initial check

    return () => {
      window.removeEventListener("scroll", throttledHandleScroll)
      // Clean up GSAP timeline only if it was used
      if (!isSupported && navRef.current) {
        gsap.killTweensOf(navRef.current)
      }
    }
  }, [sections, isSupported])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    if (!isSupported) {
      // Fallback to GSAP
      gsap.to(window, {
        duration: 0.8,
        scrollTo: {
          y: element,
          offsetY: 80,
          autoKill: false,
        },
        ease: "power2.inOut",
        onComplete: () => {
          // Collapse mobile menu after scrolling completes
          setIsExpanded(false)
        },
      })
    } else {
      // Prefer native CSS scroll() function
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })

      // Collapse mobile menu after a short delay to allow scroll to complete
      setTimeout(() => {
        setIsExpanded(false)
      }, 1000)
    }
  }

  if (!sections.length) return null

  return (
    <>
      <div
        ref={navRef}
        className="fixed top-20 left-1/2 z-40 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-2 py-2"
        style={{
          pointerEvents: isVisible ? "auto" : "none",
          ...(isSupported && isVisible && { opacity: 1 }),
          ...(isSupported && !isVisible && { opacity: 0 }),
        }}
      >
        <nav className="flex items-center space-x-1">
          {/* Always show primary sections */}
          {primarySections.map(section => (
            <Button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              variant={activeSection === section.id ? "default" : "outline"}
              className="px-3 py-2 text-sm transition-all duration-200 border hidden sm:inline-flex"
            >
              {section.label}
            </Button>
          ))}

          {/* Mobile: Show first 2 primary sections + More button */}
          {primarySections.slice(0, 2).map(section => (
            <Button
              key={`mobile-${section.id}`}
              onClick={() => scrollToSection(section.id)}
              variant={activeSection === section.id ? "default" : "outline"}
              className="px-3 py-2 text-sm transition-all duration-200 border sm:hidden"
            >
              {section.label}
            </Button>
          ))}

          {/* More button for mobile */}
          {secondarySections.length > 0 && (
            <Button
              variant={isExpanded ? "default" : "outline"}
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-2 text-sm transition-all duration-200 border sm:hidden"
            >
              {isExpanded ? (
                <>
                  {t("less")}
                  <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  {t("more")}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}

          {/* Desktop: Show all sections */}
          {primarySections.slice(2).map(section => (
            <Button
              key={`desktop-${section.id}`}
              onClick={() => scrollToSection(section.id)}
              variant={activeSection === section.id ? "default" : "outline"}
              className="px-3 py-2 text-sm transition-all duration-200 border hidden sm:inline-flex"
            >
              {section.label}
            </Button>
          ))}

          {secondarySections.map(section => (
            <Button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              variant={activeSection === section.id ? "default" : "outline"}
              className="px-3 py-2 text-sm transition-all duration-200 border hidden sm:inline-flex"
            >
              {section.label}
            </Button>
          ))}
        </nav>

        {/* Expanded mobile sections */}
        {isExpanded && secondarySections.length > 0 && (
          <nav className="flex flex-col space-y-1 mt-2 sm:hidden">
            {primarySections.slice(2).map(section => (
              <Button
                key={`expanded-mobile-${section.id}`}
                onClick={() => scrollToSection(section.id)}
                variant={activeSection === section.id ? "default" : "outline"}
                className="px-3 py-2 text-sm transition-all duration-200 border justify-start"
              >
                {section.label}
              </Button>
            ))}
            {secondarySections.map(section => (
              <Button
                key={`expanded-${section.id}`}
                onClick={() => scrollToSection(section.id)}
                variant={activeSection === section.id ? "default" : "outline"}
                className="px-3 py-2 text-sm transition-all duration-200 border justify-start"
              >
                {section.label}
              </Button>
            ))}
          </nav>
        )}
      </div>
    </>
  )
}

export default InPageNavigation
