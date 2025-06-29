"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import { DIALOG_QUERY } from "../../sanity/lib/queries"

export type IField = {
  _key: string
  value: string
}

export type IDialog = {
  cta?: IField[]
  date?: IField[]
  selectDate?: IField[]
  guests?: IField[]
  adults?: IField[]
  adult?: IField[]
  child?: IField[]
  other?: IField[]
  paymentMethod?: IField[]
  creditCard?: IField[]
  paypal?: IField[]
  people?: IField[]
  total?: IField[]
  ok?: IField[]
  cancel?: IField[]
}

interface DialogContextType {
  dialogData: IDialog | null
  setDialogId: (id: string | null) => void
  isLoading: boolean
}

const DialogContext = createContext<DialogContextType>({
  dialogData: null,
  setDialogId: () => {},
  isLoading: false,
})

export const useDialog = () => useContext(DialogContext)

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [dialogData, setDialogData] = useState<IDialog | null>(null)
  const [dialogId, setDialogId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchDialog = async () => {
      if (!dialogId) {
        setDialogData(null)
        return
      }

      setIsLoading(true)
      try {
        const data = await clientSideFetch(
          DIALOG_QUERY
          // params: { dialogId },
        )
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

  return (
    <DialogContext.Provider value={{ dialogData, setDialogId, isLoading }}>
      {children}
    </DialogContext.Provider>
  )
}
