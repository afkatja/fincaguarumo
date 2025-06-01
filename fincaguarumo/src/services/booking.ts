import axios from "axios"

const BOOKING_API_BASE_URL =
  "https://distribution-xml.booking.com/json/bookings"

export interface BookingAvailabilityParams {
  checkin: string
  checkout: string
  room1: string
  output: string
}

export interface BookingResponse {
  result: any // Type this according to Booking.com's API response
}

export class BookingService {
  private affiliateId: string
  private apiKey: string

  constructor() {
    this.affiliateId = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID || ""
    this.apiKey = process.env.NEXT_PUBLIC_BOOKING_API_KEY || ""
  }

  async checkAvailability(
    params: BookingAvailabilityParams
  ): Promise<BookingResponse> {
    try {
      const response = await axios.get(`${BOOKING_API_BASE_URL}`, {
        params: {
          ...params,
          aid: this.affiliateId,
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error) {
      console.error("Error checking Booking.com availability:", error)
      throw error
    }
  }

  getBookingUrl(propertyId: string, checkin: string, checkout: string): string {
    return `https://www.booking.com/hotel/it/finca-guarumo.html?aid=${this.affiliateId}&checkin=${checkin}&checkout=${checkout}`
  }
}
