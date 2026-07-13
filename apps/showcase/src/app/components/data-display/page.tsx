import { AspectRatio } from "@algovn/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@algovn/ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@algovn/ui/accordion"
import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@algovn/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@algovn/ui/carousel"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@algovn/ui/collapsible"
import { PageHeader } from "@algovn/ui/page-header"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@algovn/ui/resizable"
import { ScrollArea } from "@algovn/ui/scroll-area"
import { Separator } from "@algovn/ui/separator"
import { Skeleton } from "@algovn/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@algovn/ui/table"
import { Demo } from "@/components/demo"

const invoices = [
  { invoice: "INV001", status: "Paid", method: "Credit Card", amount: "$250.00" },
  { invoice: "INV002", status: "Pending", method: "PayPal", amount: "$150.00" },
  { invoice: "INV003", status: "Unpaid", method: "Bank Transfer", amount: "$350.00" },
  { invoice: "INV004", status: "Paid", method: "Credit Card", amount: "$450.00" },
]

const tags = Array.from({ length: 20 }, (_, i) => `Tag ${i + 1}`)

export default function DataDisplayPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Data Display" description="Cards, tables and content containers." />
      <Demo title="Card">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>Deploy your new project in one click.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Choose a template to get started quickly.</p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Deploy</Button>
          </CardFooter>
        </Card>
      </Demo>
      <Demo title="Table">
        <Table>
          <TableCaption>A list of your recent invoices.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.invoice}>
                <TableCell>{invoice.invoice}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>{invoice.method}</TableCell>
                <TableCell className="text-right">{invoice.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">$1,200.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Demo>
      <Demo title="Badge">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </Demo>
      <Demo title="Avatar">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      </Demo>
      <Demo title="Accordion">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>Yes. It comes with default styles that match the theme.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>Yes. It&apos;s animated by default, but you can disable it.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Demo>
      <Demo title="Collapsible">
        <Collapsible className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">3 people starred this repository</p>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Toggle
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md border px-4 py-2 text-sm">@algovn</div>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-md border px-4 py-2 text-sm">@radix-ui</div>
            <div className="rounded-md border px-4 py-2 text-sm">@shadcn</div>
          </CollapsibleContent>
        </Collapsible>
      </Demo>
      <Demo title="Separator">
        <div className="w-full space-y-4">
          <div>
            <p className="text-sm font-medium">algovn/ui</p>
            <p className="text-muted-foreground text-sm">A design system.</p>
          </div>
          <Separator />
          <div className="flex h-5 items-center gap-4 text-sm">
            <span>Blog</span>
            <Separator orientation="vertical" />
            <span>Docs</span>
            <Separator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      </Demo>
      <Demo title="Aspect Ratio">
        <div className="w-64">
          <AspectRatio ratio={16 / 9} className="rounded-md bg-muted" />
        </div>
      </Demo>
      <Demo title="Scroll Area">
        <ScrollArea className="h-72 w-48 rounded-md border">
          <div className="p-4">
            <h4 className="mb-4 text-sm font-medium">Tags</h4>
            {tags.map((tag) => (
              <div key={tag}>
                <div className="text-sm">{tag}</div>
                <Separator className="my-2" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </Demo>
      <Demo title="Carousel">
        <Carousel className="w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }, (_, i) => (
              <CarouselItem key={i}>
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{i + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </Demo>
      <Demo title="Skeleton">
        <div className="space-y-3">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </Demo>
      <Demo title="Resizable">
        <ResizablePanelGroup orientation="horizontal" className="h-[200px] w-full rounded-lg border">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">One</span>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Two</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Demo>
    </div>
  )
}
