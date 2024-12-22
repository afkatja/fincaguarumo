"use client"
import Link from "next/link"
import React from "react"
import Icon from "../../components/Icon"
import Title from "../../components/Title"

const error = () => {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 pt-5 lg:pt-8 content-wrap z-10 flex-1 flex flex-col items-center justify-center">
      <div className="prose dark:prose-invert w-11/12 lg:prose-lg mx-auto relative z-20 grid gap-8 lg:grid-cols-2 items-center">
        <Title
          titleClassName="text-5xl font-bold mb-5 lg:mb-8 text-guarumo-accent dark:text-zinc-50 text-center"
          icon={{
            iconClassName: "fill-guarumo-accent dark:fill-zinc-50",
          }}
          title="That's an error"
          Heading="h2"
        />
        <div className="lg:border-l-2 lg:pl-8 flex justify-center group">
          <Link href="/" className="fancy-underline">
            Back to home
          </Link>
          <Icon
            icon="ArrowRight"
            className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50 ml-4"
            color="currentColor"
          />
        </div>
      </div>
    </div>
  )
}

export default error
