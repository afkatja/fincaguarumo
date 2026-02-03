"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import { DIALOG_QUERY } from "../../sanity/lib/queries"
import { IDialog } from "../../types"

interface DialogContextType {
  dialogData: IDialog | null
  setDialogId: (id: string | null) => void
  isLoading: boolean
  openBookingDialog: () => void
  closeBookingDialog: () => void
  isBookingDialogOpen: boolean
}

const DialogContext = createContext<DialogContextType>({
  dialogData: null,
  setDialogId: () => {},
  isLoading: false,
  openBookingDialog: () => {},
  closeBookingDialog: () => {},
  isBookingDialogOpen: false,
})

export const useDialog = () => useContext(DialogContext)

export const DialogProvider = ({
  children,
  locale = "en",
}: {
  children: React.ReactNode
  locale?: string
}) => {
  const [dialogData, setDialogData] = useState<IDialog | null>(null)
  const [dialogId, setDialogId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)

  useEffect(() => {
    const fetchDialog = async () => {
      setIsLoading(true)
      try {
        const data = await clientSideFetch(DIALOG_QUERY)

        if (data) setDialogData(data)
      } catch (error) {
        console.error("Error fetching dialog:", error)
        setDialogData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDialog()
  }, [dialogId])

  const openBookingDialog = () => {
    setIsBookingDialogOpen(true)
  }

  const closeBookingDialog = () => {
    setIsBookingDialogOpen(false)
  }

  return (
    <DialogContext.Provider
      value={{
        dialogData,
        setDialogId,
        isLoading,
        openBookingDialog,
        closeBookingDialog,
        isBookingDialogOpen,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}
