import React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb"
import Script from "next/script"

const schema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://fincaguarumo.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Villa Bruno",
      item: "https://fincaguarumo.com/stay",
    },
  ],
}

const Breadcrumbs = ({
  title,
  parent,
  className,
}: {
  title: string
  parent: { title: string; href: string }
  className?: string
}) => {
  return (
    <>
      <Breadcrumb className={className}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`/${parent.href}`}
              className="text-muted-foreground"
            >
              {parent.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Script
        id="json-ld"
        strategy="afterInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  )
}

export default Breadcrumbs
