import { useState } from "react";
import type { FormEvent } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock3,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings2,
  TrendingUp,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
};
const storageKey = "spacex-food-products-v1";
function readProducts(): Product[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (p): p is Product =>
            p &&
            typeof p.id === "string" &&
            typeof p.name === "string" &&
            typeof p.category === "string" &&
            typeof p.price === "number" &&
            typeof p.description === "string",
        )
      : [];
  } catch {
    return [];
  }
}
const chartData = [
  { month: "Apr", retention: 24, hours: 58 },
  { month: "May", retention: 32, hours: 29 },
  { month: "Jun", retention: 38, hours: 58 },
  { month: "Jul", retention: 49, hours: 58 },
  { month: "Aug", retention: 56, hours: 29 },
  { month: "Sep", retention: 68, hours: 16 },
];
const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Menus", icon: BookOpen },
  { name: "Categories", icon: FolderOpen },
  { name: "Products", icon: Utensils },
  { name: "Analytics", icon: BarChart3 },
  { name: "Org settings", icon: Settings2 },
];
function Charts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>User retention over time</CardTitle>
          <CardDescription>Guests who come back to your menu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-7 flex items-end gap-3">
            <span className="text-3xl font-semibold tracking-tight">68%</span>
            <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" /> +12 pts from last month
            </span>
          </div>
          <div
            className="h-60 w-full"
            role="img"
            aria-label="Demo retention increases from 24 percent in April to 68 percent in September"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 12, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="retention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18181b" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#e4e4e7"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 80]}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Retention"]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="retention"
                  stroke="#18181b"
                  strokeWidth={2}
                  fill="url(#retention)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Estimated time saved</CardTitle>
          <CardDescription>
            Less menu admin. More time for your guests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-7 flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight">~58</span>
            <span className="mb-1 text-sm text-muted-foreground">
              hours / month
            </span>
          </div>
          <div
            className="h-60 w-full"
            role="img"
            aria-label="Demo hours saved by month: April 58, May 29, June 58, July 58, August 29, September 16"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 12, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#e4e4e7"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  domain={[0, 80]}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  formatter={(v) => [`${v} hours`, "Time saved"]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="hours"
                  fill="#27272a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState(readProducts);
  const [notice, setNotice] = useState("");
  const [loggedOut, setLoggedOut] = useState(false);
  const [search, setSearch] = useState("");
  function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const category = String(form.get("category") || "").trim();
    const price = Number(form.get("price"));
    if (!name || !category || !Number.isFinite(price) || price < 0) return;
    const next = [
      ...products,
      {
        id: crypto.randomUUID(),
        name,
        category,
        price,
        description: String(form.get("description") || "").trim(),
      },
    ];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setNotice("Could not save the product. Browser storage is unavailable.");
      return;
    }
    setProducts(next);
    setOpen(false);
    setNotice(`${name} added to your products.`);
  }
  if (loggedOut)
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <UtensilsCrossed className="mb-4 size-7" />
            <CardTitle>SpaceX food</CardTitle>
            <CardDescription>You have left the demo workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLoggedOut(false)}>
              Return to demo
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Authentication will be connected later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex h-[72px] items-center justify-between border-b px-5 md:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileNav ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(!mobileNav)}
          >
            {mobileNav ? <X /> : <Menu />}
          </Button>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            SpaceX food
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLoggedOut(true)}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </header>
      <div className="flex min-h-[calc(100svh-72px)]">
        <aside
          className={`${mobileNav ? "flex" : "hidden"} fixed inset-x-0 top-[72px] z-20 flex-col border-b bg-background p-4 md:static md:flex md:w-60 md:shrink-0 md:border-r md:border-b-0 md:px-4 md:py-7`}
        >
          <div className="mb-3 px-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Workspace
          </div>
          <nav className="space-y-1" aria-label="Main navigation">
            {navigation.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => {
                  setPage(name);
                  setMobileNav(false);
                  setNotice("");
                }}
                aria-current={page === name ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${page === name ? "bg-accent font-medium text-foreground" : "text-muted-foreground"}`}
              >
                <Icon className="size-4" />
                {name}
                {page === name && <ChevronRight className="ml-auto size-3.5" />}
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden px-3 pt-16 md:block">
            <div className="flex items-center gap-3 border-t pt-5">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                SF
              </div>
              <div>
                <div className="text-sm font-medium">Your restaurant</div>
                <div className="text-xs text-muted-foreground">
                  Demo workspace
                </div>
              </div>
            </div>
          </div>
        </aside>
        <main className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-8 md:px-10 md:py-10 lg:px-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {page}
                </h1>
                <Badge variant="secondary" className="ml-1 font-normal">
                  Demo
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {page === "Dashboard"
                  ? "A little overview of everything on your menu."
                  : page === "Products"
                    ? "Manage the products you add to your workspace."
                    : page === "Analytics"
                      ? "See how your digital menu is performing."
                      : "Your restaurant workspace."}
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Add product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add product</DialogTitle>
                  <DialogDescription>
                    Add a dish to your demo workspace. Prices are in RSD.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addProduct} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g. Karađorđeva šnicla"
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        name="category"
                        placeholder="Main dishes"
                        required
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (RSD)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="1200"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Tell your guests about this dish"
                      maxLength={2000}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save product</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {notice && (
            <div
              role="status"
              className="mb-6 flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3 text-sm"
            >
              {notice}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
          {page === "Dashboard" && (
            <>
              <Card className="mb-6 gap-0 py-0 shadow-none">
                <CardContent className="grid p-0 sm:grid-cols-3">
                  {[
                    {
                      title: "Menus",
                      value: 4,
                      icon: BookOpen,
                      caption: "Menus in your workspace",
                    },
                    {
                      title: "Categories",
                      value: 57,
                      icon: FolderOpen,
                      caption: "Keeping your menu organized",
                    },
                    {
                      title: "Products",
                      value: 168 + products.length,
                      icon: Utensils,
                      caption: "Dishes, drinks, and everything else",
                    },
                  ].map(({ title, value, icon: Icon, caption }) => (
                    <div
                      key={title}
                      className="border-b p-6 last:border-0 sm:border-r sm:border-b-0 lg:p-8"
                    >
                      <div className="mb-5 flex items-center justify-between text-sm font-medium">
                        {title}
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="text-4xl font-semibold tracking-tight">
                        {value}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {caption}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Charts />
              <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-3.5 shrink-0" />
                Sample metrics for preview. Live analytics are not connected.
              </p>
            </>
          )}
          {page === "Analytics" && (
            <>
              <Charts />
              <p className="mt-5 text-xs text-muted-foreground">
                Sample data · April–September 2026
              </p>
            </>
          )}
          {page === "Products" && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Added products</CardTitle>
                <CardDescription>
                  Products saved in this browser. The 168 sample products in
                  dashboard metrics are illustrative.
                </CardDescription>
                <Input
                  className="mt-3 max-w-sm"
                  aria-label="Search products"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No products added yet. Add your first dish to get started.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="p-3 font-medium">Product</th>
                          <th className="p-3 font-medium">Category</th>
                          <th className="p-3 text-right font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products
                          .filter((p) =>
                            p.name.toLowerCase().includes(search.toLowerCase()),
                          )
                          .map((p) => (
                            <tr key={p.id} className="border-b last:border-0">
                              <td className="p-3 font-medium">
                                {p.name}
                                <p className="max-w-md text-xs font-normal text-muted-foreground">
                                  {p.description}
                                </p>
                              </td>
                              <td className="p-3">{p.category}</td>
                              <td className="whitespace-nowrap p-3 text-right">
                                {p.price.toLocaleString("sr-RS")} RSD
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {products.filter((p) =>
                      p.name.toLowerCase().includes(search.toLowerCase()),
                    ).length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No matching products.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {!["Dashboard", "Products", "Analytics"].includes(page) && (
            <Card className="shadow-none">
              <CardContent className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="mb-5 rounded-full bg-muted p-4">
                  {page === "Menus" ? (
                    <BookOpen className="size-6" />
                  ) : page === "Categories" ? (
                    <FolderOpen className="size-6" />
                  ) : (
                    <Settings2 className="size-6" />
                  )}
                </div>
                <h2 className="font-semibold">
                  {page === "Org settings" ? "Organization settings" : page} are
                  coming next
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  This section will be available in an upcoming iteration.
                </p>
                <Button
                  className="mt-6"
                  variant="outline"
                  onClick={() => setPage("Dashboard")}
                >
                  Back to dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
