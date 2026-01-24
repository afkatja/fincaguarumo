# Booking Dialog Modification Plan

## Objective

Modify the booking dialog behavior to open directly from the homepage "Book now" button.

## Current Implementation Analysis

### Current Flow

1. `HeaderBookButton` component redirects to `/villa-bruno`
2. User clicks "Book now" button on villa page
3. `BookingDialog` component opens

### Key Components

- `HeaderBookButton.tsx` - Handles header button click
- `BookingDialog.tsx` - Dialog component
- `DialogProvider` - State management for dialogs

## Implementation Plan

### 1. Modify HeaderBookButton

```typescript
// src/components/HeaderBookButton.tsx
'use client'
import { useTranslations } from 'next-intl'
import { Button } from './ui/button'
import { useDialog } from '../providers/DialogProvider'
import { BookingType } from '../types'

const HeaderBookButton = () => {
  const t = useTranslations('booking')
  const { openDialog } = useDialog()
  const pathname = usePathname()

  // Don't show on villa pages
  if (
    pathname.includes('/villa-bruno') ||
    pathname.includes('/stay') ||
    pathname.includes('/accommodation')
  ) return null

  const handleBookNow = () => {
    // Open booking dialog directly
    openDialog({
      type: 'booking',
      bookingType: 'villa-bruno' as BookingType,
      title: t('reserveButton', { defaultValue: 'Book Villa Bruno now' })
    })
  }

  return (
    <Button
      name="booking-button"
      size="lg"
      className=""
      variant="secondary"
      onClick={handleBookNow}
    >
      {t('reserveButton', { defaultValue: 'Book Villa Bruno now' })}
    </Button>
  )
}
```

### 2. Enhance DialogProvider

```typescript
// src/app/providers/DialogProvider.tsx
import React, { createContext, useContext, useState } from 'react'
import { BookingType } from '../../types'

type DialogContextType = {
  openDialog: (options: {
    type: 'booking'
    bookingType: BookingType
    title: string
  }) => void
  closeDialog: () => void
  dialogState: {
    isOpen: boolean
    type?: 'booking'
    bookingType?: BookingType
    title?: string
  }
}

export const DialogContext = createContext<DialogContextType>(null)

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: undefined,
    bookingType: undefined,
    title: undefined
  })

  const openDialog = ({ type, bookingType, title }) => {
    setDialogState({
      isOpen: true,
      type,
      bookingType,
      title
    })
  }

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      type: undefined,
      bookingType: undefined,
      title: undefined
    })
  }

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog, dialogState }}>
      {children}
      {/* Global dialog container */}
      {dialogState.isOpen && dialogState.type === 'booking' && (
        <BookingDialog
          bookingType={dialogState.bookingType}
          dialogOptions={{ title: dialogState.title }}
          locale="en" // Get from context
        />
      )}
    </DialogContext.Provider>
  )
}
```

### 3. Update BookingDialog for Global Use

```typescript
// src/app/[locale]/(pages)/BookingDialog.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useBooking } from '../../providers/BookingProvider'
import { useDialog } from '../../providers/DialogProvider'
import { BookingType, initialBookingData } from '../../../types'
import { getInternationalizedValue } from '../../../lib/utils'
import BookingDialogContent from '../../providers/BookingDialogContent'

const BookingDialog = ({
  bookingType,
  dialogOptions,
  locale,
  dialogId,
}: {
  bookingType: BookingType
  dialogOptions: {
    title: string
    buttonText?: string
    buttonClassName?: string
  }
  locale: string
  dialogId?: string
}) => {
  const [open, setOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(false)

  const { bookingData, setBookingData } = useBooking()
  const { dialogData, setDialogId, isLoading, closeDialog } = useDialog()

  // Set dialog ID when component mounts
  useEffect(() => {
    setDialogId(dialogId || null)
  }, [dialogId, setDialogId])

  const closeHandler = () => {
    // Reset checkIn and checkOut dates when dialog is closed
    setBookingData({
      ...bookingData,
      bookingDetails: {
        ...bookingData.bookingDetails,
        checkIn: initialBookingData.bookingDetails.checkIn,
        checkOut: initialBookingData.bookingDetails.checkOut,
      },
    })
    setOpen(false)
    setPaymentStep(false)
    closeDialog() // Close global dialog
  }

  const buttonText =
    dialogOptions.buttonText ??
    getInternationalizedValue(dialogData?.cta, locale, 'Reserve')

  return (
    <Dialog open={open} onOpenChange={() => closeHandler()} key="order-dialog">
      <DialogTrigger asChild>
        <Button
          name="booking-button"
          size="lg"
          className={dialogOptions.buttonClassName}
          variant="secondary"
          disabled={isLoading}
        >
          {buttonText}
        </Button>
      </DialogTrigger>
      <BookingDialogContent
        bookingData={bookingData}
        title={dialogOptions.title}
        paymentStep={paymentStep}
        onBookingFormSubmit={() => setPaymentStep(true)}
        onCancel={closeHandler}
        bookingType={bookingType}
        locale={locale}
      />
    </Dialog>
  )
}
```

### 4. Update Layout for Dialog Provider

```typescript
// src/app/[locale]/layout.tsx
import { DialogProvider } from './providers/DialogProvider'

export default function RootLayout({ children }) {
  return (
    <html lang={locale}>
      <body>
        <DialogProvider>
          {children}
        </DialogProvider>
      </body>
    </html>
  )
}
```

## Testing Plan

### 1. Unit Tests

- Test `HeaderBookButton` click handler
- Test `DialogProvider` state management
- Test `BookingDialog` rendering

### 2. Integration Tests

- Test dialog opening from homepage
- Test state persistence
- Test error handling

### 3. User Testing

- Test with real users
- Gather feedback on UX
- Iterate on improvements

## Fallback Plan

### If Issues Occur

1. Revert to original redirect behavior
2. Add feature flag for gradual rollout
3. Monitor analytics for impact

## Success Metrics

- Reduction in steps to booking
- Increased conversion rate
- User satisfaction scores
- Reduction in bounce rate
