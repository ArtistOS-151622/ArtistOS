"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

type HeaderContextType = {
  searchSlot: ReactNode | null
  setSearchSlot: (node: ReactNode | null) => void
  actionsSlot: ReactNode | null
  setActionsSlot: (node: ReactNode | null) => void
  title: string
  setTitle: (title: string) => void
  eyebrow: string
  setEyebrow: (eyebrow: string) => void
  description: string | undefined
  setDescription: (desc: string | undefined) => void
  backLink: string | undefined
  setBackLink: (link: string | undefined) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [searchSlot, setSearchSlot] = useState<ReactNode | null>(null)
  const [actionsSlot, setActionsSlot] = useState<ReactNode | null>(null)
  const [title, setTitle] = useState("ArtistOS")
  const [eyebrow, setEyebrow] = useState("ArtistOS")
  const [description, setDescription] = useState<string | undefined>(undefined)
  const [backLink, setBackLink] = useState<string | undefined>(undefined)

  return (
    <HeaderContext.Provider value={{ 
      searchSlot, setSearchSlot, 
      actionsSlot, setActionsSlot,
      title, setTitle,
      eyebrow, setEyebrow,
      description, setDescription,
      backLink, setBackLink
    }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContext() {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error("useHeaderContext must be used within a HeaderProvider")
  }
  return context
}

export function HeaderPortal({
  search,
  actions,
}: {
  search?: ReactNode | null
  actions?: ReactNode | null
}) {
  const { setSearchSlot, setActionsSlot } = useHeaderContext()

  useEffectWithCleanup(search, setSearchSlot)
  useEffectWithCleanup(actions, setActionsSlot)

  return null
}

export function PageHeader({
  title,
  eyebrow = "ArtistOS",
  description,
  backLink,
}: {
  title: string
  eyebrow?: string
  description?: string
  backLink?: string
}) {
  const { setTitle, setEyebrow, setDescription, setBackLink } = useHeaderContext()

  React.useEffect(() => {
    setTitle(title)
    setEyebrow(eyebrow)
    setDescription(description)
    setBackLink(backLink)
  }, [title, eyebrow, description, backLink, setTitle, setEyebrow, setDescription, setBackLink])

  return null
}

function useEffectWithCleanup(value: any, setter: (val: any) => void) {
  React.useEffect(() => {
    if (value !== undefined) {
      setter(value)
    }
    return () => {
      if (value !== undefined) {
        setter(null)
      }
    }
  }, [value, setter])
}
