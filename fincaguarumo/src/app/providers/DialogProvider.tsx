"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import { DIALOG_QUERY } from "../../sanity/lib/queries"
import { loadTranslations } from "../../lib/utils"
import { IDialog } from "../../types"

interface DialogContextType {
  dialogData: IDialog | null
  setDialogId: (id: string | null) => void
  isLoading: boolean
  t: Record<string, string> | undefined
}

const DialogContext = createContext<DialogContextType>({
  dialogData: null,
  setDialogId: () => {},
  isLoading: false,
  t: {},
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
  const [translations, setTranslations] = useState<{
    booking: {
      perPerson: string
      reserveButton: string
    }
  } | null>(null)

  useEffect(() => {
    const loadTranslationsData = async () => {
      const messages = await loadTranslations(locale)
      setTranslations(messages)
    }
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

    loadTranslationsData()
    fetchDialog()
  }, [dialogId, locale])
  const t = translations?.booking

  return (
    <DialogContext.Provider value={{ dialogData, setDialogId, isLoading, t }}>
      {children}
    </DialogContext.Provider>
  )
}
