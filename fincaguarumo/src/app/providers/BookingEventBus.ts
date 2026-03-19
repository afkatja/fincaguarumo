"use client"

import { BookingType } from "@/types"

export interface BookingEvent {
  type: 'DIALOG_OPEN_REQUESTED' | 'DIALOG_CLOSE_REQUESTED'
  payload: {
    bookingType: BookingType
    initialData?: any
    source?: 'page' | 'external'
  }
}

type EventListener = (event: BookingEvent) => void

class BookingEventBus {
  private listeners: EventListener[] = []

  subscribe(listener: EventListener) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  emit(event: BookingEvent) {
    this.listeners.forEach(listener => listener(event))
  }

  clear() {
    this.listeners = []
  }
}

export const bookingEventBus = new BookingEventBus()
