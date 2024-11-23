import ContactPage from "./ContactPage"

const Contact = async ({ params }: { params: any }) => {
  const { locale } = await params
  return <ContactPage locale={locale} />
}

export default Contact
