import Image from "next/image"

const Logo = ({ ...props }) => {
  return (
    <Image
      alt="Finca Guarumo"
      src="/images/logo.svg"
      width={100}
      height={50}
      {...props}
    />
  )
}
export default Logo
