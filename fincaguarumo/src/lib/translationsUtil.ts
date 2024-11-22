import { TransitionFunction, useMemo, useTransition } from "react"
import { i18n } from "../../languages"

export interface Params {
  [key: string]: string | string[] | undefined
}

export type Translation = {
  path: string
  language: string
  title: string
  countryCode: string
}

export const useTranslations = (translations: Translation[]) => {
  const onSelectChange = ({
    val,
    startTransition,
    router,
    pathname,
    params,
  }: {
    val: string
    startTransition: (scope: TransitionFunction) => void
    router: any
    pathname: string
    params: Params
  }) => {
    startTransition(() => {
      router.replace(
        // TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params },
        { locale: val }
      )
    })
  }
  const availableTranslations = useMemo<Translation[]>(
    () =>
      i18n.languages.reduce<Translation[]>((acc, cur) => {
        const availableTranslation = translations.find(
          translation => translation.language === cur.id
        )
        return availableTranslation ? [...acc, availableTranslation] : acc
      }, []),
    [translations]
  )
  return { availableTranslations, onSelectChange }
}
