import ContactPage from "./ContactPage"

const Contact = async ({ params }: { params: Record<string, string> }) => {
  const { locale } = await params
  return <ContactPage locale={locale} />
}

export default Contact
