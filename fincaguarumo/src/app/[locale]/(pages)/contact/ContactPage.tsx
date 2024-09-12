import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import Icon from "../../../../components/Icon"

export default async function Contact({ locale }: { locale: string }) {
  // unstable_setRequestLocale(locale)

  // const t = await getTranslations("contact")
  return (
    <section className="py-12 md:py-24 lg:py-32">
      <div className="container grid gap-8 px-4 md:px-6">
        <div className="grid gap-4 text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            title{/* {t("title")} */}
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            description{/* {t("description")} */}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="border w-12 h-12">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5">
                  <div className="font-semibold">John Doe</div>
                  <div className="text-sm text-muted-foreground">
                    Customer Support
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Icon icon="Mail" className="w-5 h-5 text-muted-foreground" />
                  <a href="#" className="text-sm font-medium hover:underline">
                    john@acmeretreats.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="Phone"
                    className="w-5 h-5 text-muted-foreground"
                  />
                  <a href="#" className="text-sm font-medium hover:underline">
                    +1 (234) 567-890
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="border w-12 h-12">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5">
                  <div className="font-semibold">Jane Smith</div>
                  <div className="text-sm text-muted-foreground">
                    Sales Representative
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Icon icon="Mail" className="w-5 h-5 text-muted-foreground" />
                  <a href="#" className="text-sm font-medium hover:underline">
                    jane@acmeretreats.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="Phone"
                    className="w-5 h-5 text-muted-foreground"
                  />
                  <a href="#" className="text-sm font-medium hover:underline">
                    +0 (987) 654-321
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="border w-12 h-12">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback />
                </Avatar>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
