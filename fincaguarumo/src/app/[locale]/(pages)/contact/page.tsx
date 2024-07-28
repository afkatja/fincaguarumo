import ContactPage from "./ContactPage"

const Contact = ({
  params: { locale },
}: {
  params: Record<string, string>
}) => <ContactPage locale={locale} />

export default Contact
