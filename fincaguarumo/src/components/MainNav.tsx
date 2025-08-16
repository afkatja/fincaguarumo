import NavItem from "./NavItem"

const MainNav = async ({
  navItems,
  className,
}: {
  navItems: { title: string; href: string }[]
  className?: string
}) => {
  if (!navItems || !navItems.length) return

  return (
    <nav className={`hidden md:flex items-center gap-5 ${className}`}>
      {navItems.map(navItem => (
        <NavItem key={navItem.title} navItem={navItem} />
      ))}
    </nav>
  )
}

export default MainNav
