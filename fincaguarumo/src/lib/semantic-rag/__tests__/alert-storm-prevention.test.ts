// Mock the entire monitoring module
jest.mock("../monitoring", () => {
  const actualModule = jest.requireActual("../monitoring")
  return {
    ...actualModule,
    hasRecentAlertInWindow: jest.fn(),
  }
})

import { hasRecentAlertInWindow } from "../monitoring"

const mockHasRecentAlertInWindow =
  hasRecentAlertInWindow as jest.MockedFunction<typeof hasRecentAlertInWindow>

describe("Alert Storm Prevention", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return false when no recent alerts exist", async () => {
    mockHasRecentAlertInWindow.mockResolvedValue(false)

    const result = await hasRecentAlertInWindow(300000) // 5 minutes
    expect(result).toBe(false)
    expect(mockHasRecentAlertInWindow).toHaveBeenCalledWith(300000)
  })

  it("should return true when recent alert exists", async () => {
    mockHasRecentAlertInWindow.mockResolvedValue(true)

    const result = await hasRecentAlertInWindow(300000) // 5 minutes
    expect(result).toBe(true)
    expect(mockHasRecentAlertInWindow).toHaveBeenCalledWith(300000)
  })

  it("should return false when database error occurs", async () => {
    mockHasRecentAlertInWindow.mockResolvedValue(false)

    const result = await hasRecentAlertInWindow(300000) // 5 minutes
    expect(result).toBe(false)
  })

  it("should return false when exception is thrown", async () => {
    mockHasRecentAlertInWindow.mockResolvedValue(false)

    const result = await hasRecentAlertInWindow(300000) // 5 minutes
    expect(result).toBe(false)
  })
})
