import { autoTranslateFAQ } from "./autoTranslate"

export default function TranslateAction(props: any) {
  return {
    label: "Auto-translate",
    onHandle: () => {
      autoTranslateFAQ(props.id)
        .then(() => {
          props.onComplete()
          // Show success message
        })
        .catch(error => {
          console.error("Translation failed:", error)
          // Show error message
        })
    },
  }
}
