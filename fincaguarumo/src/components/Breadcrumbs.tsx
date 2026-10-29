import React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb"

const baseUrl = "https://fincaguarumo.com"

function toPath(href: string): string {
  return href.startsWith("/") ? href : `/${href}`
}

function absoluteUrl(path: string): string {
  return path === "/" ? baseUrl : `${baseUrl}${path}`
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
  const parentPath = toPath(parent.href)
  const crumbs: Array<{ name: string; path?: string }> = [
    { name: "Home", path: "/" },
    { name: parent.title, path: parentPath },
    { name: title },
  ]

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  }

  return (
    <>
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <React.Fragment key={`${crumb.name}-${index}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {isLast || !crumb.path ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={crumb.path}
                      className="text-muted-foreground"
                    >
                      {crumb.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <script type="application/ld+json">
        {JSON.stringify(schema).replace(/</g, "\\u003c")}
      </script>
    </>
  )
}

export default Breadcrumbs
