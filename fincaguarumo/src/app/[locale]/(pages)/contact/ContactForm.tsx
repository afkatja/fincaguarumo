"use client"
import { useState } from "react"
import Input from "../../../../components/Input"
import { Label } from "../../../../components/ui/label"
import { Button } from "../../../../components/ui/button"

export interface IContactFormData {
  name: string
  email: string
  message: string
}

export default function ContactForm() {
  const [formData, setFormData] = useState<IContactFormData>({
    name: "",
    email: "",
    message: "",
  })
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setStatus("loading")
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }
      setStatus("success")
      setFormData({ name: "", email: "", message: "" })
    } catch (error) {
      setStatus("error")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 group">
      {status === "success" && (
        <p className="text-guarumo-primary font-bold text-center">
          Message sent successfully!
        </p>
      )}
      {status === "error" && (
        <p className="text-destructive text-center font-bold">
          Failed to send message. Please try again.
        </p>
      )}
      <Input
        id="name"
        type="text"
        labelText="Name"
        onChangeHandler={handleChange}
        errorMessage="Please enter your name"
        placeholder="Jane Doe"
        required
        value={formData.name}
      />
      <Input
        id="email"
        type="email"
        value={formData.email}
        onChangeHandler={handleChange}
        labelText="Email"
        errorMessage="Please enter your email"
        placeholder="jane@doe.com"
        required
      />

      <div>
        <Label htmlFor="message" className="block text-sm font-medium mb-1">
          Message
        </Label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={4}
          placeholder="message"
          className="w-full px-3 py-2 rounded-sm outline outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer text-zinc-900"
        />
      </div>

      <Button
        type="submit"
        className="group-invalid:pointer-events-none group-invalid:opacity-30"
      >
        {status === "loading" ? "Sending..." : "Send Message"}
      </Button>
    </form>
  )
}
