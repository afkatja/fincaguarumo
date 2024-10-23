import Link from "next/link"
import React from "react"
import Icon from "./Icon"

const Footer = () => {
  return (
    <div className="w-full bg-black text-white py-8">
      <footer className="w-11/12 mx-auto">
        <ul className="flex flex-wrap gap-4">
          <li>
            <Link href="https://ul.waze.com/ul?ll=8.49527176%2C-83.33406687&navigate=no&zoom=17">
              <Icon
                icon="Waze"
                className="mr-2 inline-block"
                size={30}
                color="#ffffff"
              />
              Calle Altos Corozal, La Balsa, Puerto Jimenez, Osa, Costa Rica
            </Link>
          </li>
          <li>
            <Link href="https://wa.me/50687495341">
              <Icon
                icon="Whatsapp"
                className="mr-2 inline-block"
                size={20}
                color="#ffffff"
              />
              Send a message
            </Link>
          </li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
      </footer>
    </div>
  )
}

export default Footer
