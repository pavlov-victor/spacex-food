import { MenuPdf } from "@/components/crm/menu-pdf";
import { ProductEditor } from "@/components/crm/product-editor";
import { MenuPublisher } from "@/components/crm/menu-publisher";
import { WorkspaceSettings } from "@/components/crm/workspace-settings";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Product } from "@/domain/product";
import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { useSession } from "@/hooks/use-session";
import { useMenuWorkflows } from "@/hooks/use-menu-workflows";
import { filterProducts } from "@/domain/product";
import { chartData } from "@/fixtures/dashboard";
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
  Trash2,
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
  Line,
  LineChart,
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

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Menus", icon: BookOpen },
  { name: "Categories", icon: FolderOpen },
  { name: "Products", icon: Utensils },
  { name: "Analytics", icon: BarChart3 },
  { name: "Org settings", icon: Settings2 },
];
const chartInk = "#c2410c";
const chartTick = "#9a6b4a";
const chartGrid = "#efd5b8";
const chartTooltip = {
  borderRadius: 8,
  fontSize: 12,
  border: "1px solid #f0d2b0",
  background: "#fff7ed",
  color: "#7c2d12",
};
const chartCardClass = "shadow-none border-orange-200 !bg-white";

function Charts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={chartCardClass} style={{ backgroundColor: "#fff" }}>
        <CardHeader>
          <CardTitle className="text-orange-950">User retention over time</CardTitle>
          <CardDescription className="text-orange-800/70">
            Guests who come back to your menu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-7 flex items-end gap-3">
            <span className="text-3xl font-semibold tracking-tight text-orange-800">
              68%
            </span>
            <span className="mb-1 flex items-center gap-1 text-xs text-orange-700">
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
                    <stop offset="0%" stopColor={chartInk} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartInk} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke={chartGrid}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: chartTick }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: chartTick }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 80]}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Retention"]}
                  contentStyle={chartTooltip}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="retention"
                  stroke={chartInk}
                  strokeWidth={2}
                  fill="url(#retention)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className={chartCardClass} style={{ backgroundColor: "#fff" }}>
        <CardHeader>
          <CardTitle className="text-orange-950">Estimated time saved</CardTitle>
          <CardDescription className="text-orange-800/70">
            Less menu admin. More time for your guests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-7 flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight text-orange-800">
              ~58
            </span>
            <span className="mb-1 text-sm text-orange-700/80">hours / month</span>
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
                  stroke={chartGrid}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: chartTick }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: chartTick }}
                  domain={[0, 80]}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  cursor={{ fill: "#ffedd5" }}
                  formatter={(v) => [`${v} hours`, "Time saved"]}
                  contentStyle={chartTooltip}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="hours"
                  fill={chartInk}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className={`${chartCardClass} lg:col-span-2`} style={{ backgroundColor: "#fff" }}>
        <CardHeader>
          <CardTitle className="text-orange-950">Adoption</CardTitle>
          <CardDescription className="text-orange-800/70">
            Guests opening the digital menu from QR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-7 flex items-end gap-3">
            <span className="text-3xl font-semibold tracking-tight text-orange-800">
              74%
            </span>
            <span className="mb-1 flex items-center gap-1 text-xs text-orange-700">
              <TrendingUp className="size-3.5" /> +13 pts from last month
            </span>
          </div>
          <div
            className="h-60 w-full"
            role="img"
            aria-label="Demo digital menu adoption increases from 18 percent in April to 74 percent in September"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 12, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke={chartGrid}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: chartTick }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: chartTick }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 80]}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Adoption"]}
                  contentStyle={chartTooltip}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="adoption"
                  stroke={chartInk}
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: chartInk, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: chartInk, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default function App() {
  const session = useSession();
  const flow = useMenuWorkflows();
  const workspace = useWorkspace();
  const [selectedProduct, setSelectedProduct] = useState<Product['id'] | null>(null);
  const [publishingMenu, setPublishingMenu] = useState<{ id: NonNullable<Product['menuId']>; name: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuFilter, setMenuFilter] = useState<NonNullable<Product['menuId']> | undefined>();
  const [page, setPage] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [open, setOpen] = useState(false);
  const {
    products,
    isLoading,
    isSaving,
    error: productsError,
    createProduct,
  } = useProducts(menuFilter);
  const [notice, setNotice] = useState("");
  const [dismissedJobCount, setDismissedJobCount] = useState<number | null>(
    null,
  );
  const recognitionJobCount = flow.jobs.length;
  const runningJobCount = flow.jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  ).length;
  const showJobsToast =
    session.isAuthenticated &&
    recognitionJobCount > 0 &&
    dismissedJobCount !== recognitionJobCount;
  const [productFormError, setProductFormError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [batchBusy,setBatchBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const visibleProducts = filterProducts(products, search).filter(
    (p) => !categoryFilter || p.category === categoryFilter,
  );

  const [categoryFormError, setCategoryFormError] = useState("");
  const [menuFormError, setMenuFormError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<string[]>([]);
  const categories = Array.from(
    new Set([
      ...(session.isAuthenticated
        ? flow.categories
            .filter((category) => !hiddenCategoryIds.includes(category._id))
            .map((category) => category.name)
        : ["Main dishes", "Prilog", "Starters"]),

    ]),
  );
  const categoryRows = (
    session.isAuthenticated
      ? flow.categories.map((category) => ({
          ...category,
          persisted: true as const,
        }))
      : [
          { _id: "demo-main", name: "Main dishes", persisted: false as const },
          { _id: "demo-prilog", name: "Prilog", persisted: false as const },
          { _id: "demo-starters", name: "Starters", persisted: false as const },
        ]
  ).filter((category) => !hiddenCategoryIds.includes(category._id));
  const menus = session.isAuthenticated
    ? flow.menus
    : [{ name: "Main" }, { name: "Secondary" }, { name: "Third" }];
  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductFormError("");
    const form = new FormData(event.currentTarget);
    const result = await createProduct({
      name: String(form.get("name") || ""),
      category: String(form.get("category") || ""),
      price: Number(form.get("price")),
      description: String(form.get("description") || ""),
    });
    if (!result.ok) {
      setProductFormError(result.error);
      return;
    }
    setOpen(false);
    setNotice(`${result.product.name} added to your products.`);
  }
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryFormError("");
    const form = new FormData(event.currentTarget);
    const categoryName = String(form.get("name") || "").trim();
    if (!categoryName) {
      setCategoryFormError("Category name is required");
      return;
    }
    if (categories.includes(categoryName)) {
      setCategoryFormError("This category already exists");
      return;
    }
    try { await flow.createCategory(categoryName); }
    catch (error) { setCategoryFormError(error instanceof Error ? error.message : 'Could not save category.'); return; }
    setOpen(false);
    setNotice(`${categoryName} added to your categories.`);
  }
  async function addMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMenuFormError("");
    const form = new FormData(event.currentTarget);
    const menuName = String(form.get("name") || "").trim();
    const files = form
      .getAll("photos")
      .filter((file): file is File => file instanceof File && file.size > 0);
    if (!menuName) {
      setMenuFormError("Menu name is required");
      return;
    }
    if (files.length < 1) {
      setMenuFormError("Add a menu photo so we can recognize dishes.");
      return;
    }
    if (files.length > 5) {
      setMenuFormError("Choose up to 5 photos.");
      return;
    }
    setIsImporting(true);
    try {
      const fileIds = await Promise.all(
        files.map((file) => flow.uploadImage(file, "menu")),
      );
      await flow.importMenu(menuName, fileIds);
      setOpen(false);
      setNotice(
        `Recognition started for ${menuName}. Products and categories will appear when it finishes.`,
      );
    } catch (error) {
      setMenuFormError(
        error instanceof Error ? error.message : "Could not start recognition.",
      );
    } finally {
      setIsImporting(false);
    }
  }
  return (
    <div className="min-h-svh bg-background text-foreground">
      {selectedProduct && <ProductEditor key={selectedProduct} productId={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {publishingMenu && <MenuPublisher key={publishingMenu.id} menu={publishingMenu} onReview={id => { setPublishingMenu(null); setSelectedProduct(id); }} onClose={() => setPublishingMenu(null)} />}
      {settingsOpen && <WorkspaceSettings onClose={() => { setSettingsOpen(false); setMenuFilter(undefined); }} />}
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
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>{session.isAuthenticated ? workspace.organizations.find(o => o._id === workspace.organizationId)?.name ?? 'Restaurant settings' : 'Create restaurant'}</Button>
        <Button variant="outline" size="sm" onClick={() => void session.logout()}><LogOut className="size-4" />Log out</Button>
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
                      : page === "Categories"
                        ? "Organize your menu with custom categories."
                        : page === "Menus"
                          ? "Create and manage the menus guests will see."
                          : "Your restaurant workspace."}
              </p>
            </div>
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                setProductFormError("");
                setCategoryFormError("");
                setMenuFormError("");
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {page === "Categories"
                    ? "Add categories"
                    : page === "Menus" || page === "Dashboard"
                      ? "Add menu"
                      : "Add product"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                {page === "Menus" || page === "Dashboard" ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Add menu</DialogTitle>
                      <DialogDescription>
                        Upload menu photos. Recognition will create products and
                        categories from the dishes it finds.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={addMenu} className="space-y-4">
                      {menuFormError && (
                        <p role="alert" className="text-sm text-destructive">
                          {menuFormError}
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="menu-name">Menu name</Label>
                        <Input
                          id="menu-name"
                          name="name"
                          placeholder="e.g. Seasonal"
                          required
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="menu-photos">Menu photos</Label>
                        <Input
                          id="menu-photos"
                          name="photos"
                          type="file"
                          accept="image/jpeg,image/png"
                          multiple
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          JPG or PNG, 1–5 photos, up to 10 MB each.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpen(false)}
                          disabled={isImporting}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isImporting}>
                          {isImporting ? "Recognizing…" : "Recognize menu"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                ) : page === "Categories" ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Add category</DialogTitle>
                      <DialogDescription>
                        Add a new category to organize your menu items.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={addCategory} className="space-y-4">
                      {categoryFormError && (
                        <p role="alert" className="text-sm text-destructive">
                          {categoryFormError}
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="category-name">Category name</Label>
                        <Input
                          id="category-name"
                          name="name"
                          placeholder="e.g. Desserts"
                          required
                          maxLength={80}
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
                        <Button type="submit">Save category</Button>
                      </DialogFooter>
                    </form>
                  </>
                ) : (
                  <>
                <DialogHeader>
                  <DialogTitle>Add product</DialogTitle>
                  <DialogDescription>
                    Add a dish to your demo workspace. Prices are in RSD.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addProduct} className="space-y-4">
                  {productFormError && (
                    <p role="alert" className="text-sm text-destructive">
                      {productFormError}
                    </p>
                  )}
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
                    <Button type="submit" disabled={isLoading || isSaving}>
                      {isSaving ? "Saving…" : "Save product"}
                    </Button>
                  </DialogFooter>
                </form>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
          {productsError && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {productsError}
            </p>
          )}
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
              <Card
                className="mb-6 shadow-none !bg-[#FBF3F0]"
                style={{ backgroundColor: "#FBF3F0" }}
              >
                <CardHeader>
                  <CardTitle>Let's get started</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6">
                    {[
                      {
                        n: 1,
                        title: "Open the Menus page",
                        caption: "Find it in the workspace navigation.",
                      },
                      {
                        n: 2,
                        title: 'Click "Add menu"',
                        caption: "Give your menu a name guests will recognize.",
                      },
                      {
                        n: 3,
                        title: "Upload your menu photo",
                        caption:
                          'Click "Recognize" and we create the dishes for you.',
                      },
                    ].map(({ n, title, caption }) => (
                      <li key={n}>
                        <div className="mb-3 flex size-7 items-center justify-center rounded-full border border-border bg-transparent text-xs font-semibold text-primary">
                          {n}
                        </div>
                        <div className="text-sm font-medium text-primary">
                          {title}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {caption}
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              <Card
                className="mb-6 gap-0 py-0 shadow-none !bg-white"
                style={{ backgroundColor: "#fff" }}
              >
                <CardContent className="grid p-0 sm:grid-cols-3">
                  {[
                    {
                      title: "Menus",
                      value: menus.length,
                      icon: BookOpen,
                      caption: "Menus in your workspace",
                    },
                    {
                      title: "Categories",
                      value: categories.length,
                      icon: FolderOpen,
                      caption: "Keeping your menu organized",
                    },
                    {
                      title: "Products",
                      value: session.isAuthenticated
                        ? products.length
                        : 168 + products.length,
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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-sm"
                    aria-label="Search products"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {categoryFilter && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCategoryFilter("")}
                    >
                      {categoryFilter}
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {menuFilter && <Button variant="outline" className="mb-3" onClick={() => setMenuFilter(undefined)}>Show all menus</Button>}
                {isLoading ? (
                  <p
                    role="status"
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Loading products…
                  </p>
                ) : products.length === 0 ? (
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
                        {visibleProducts.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="p-3 font-medium">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <button type="button" className="text-left underline underline-offset-4" onClick={() => setSelectedProduct(p.id)}>{p.name}</button>
                                  <p className="max-w-md text-xs font-normal text-muted-foreground">
                                    {p.description}
                                  </p>
                                </div>
                                {session.isAuthenticated && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Delete ${p.name}`}
                                    disabled={removingId === p.id}
                                    onClick={() => {
                                      void (async () => {
                                        setRemovingId(p.id);
                                        try {
                                          await flow.deleteProduct(p.id);
                                          setNotice(`${p.name} removed.`);
                                        } catch (error) {
                                          setNotice(
                                            error instanceof Error
                                              ? error.message
                                              : "Could not delete product.",
                                          );
                                        } finally {
                                          setRemovingId(null);
                                        }
                                      })();
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="p-3">{p.category}</td>
                            <td className="whitespace-nowrap p-3 text-right">
                              {p.price?.toLocaleString("sr-RS") ?? "—"} RSD
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {visibleProducts.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No matching products.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {page === "Menus" && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Menus</CardTitle>
                <CardDescription>
                  Menus published in this restaurant workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="p-3 font-medium">Menu name</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 text-right font-medium">Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menus.map((menu) => (
                        <tr
                          key={"_id" in menu ? String(menu._id) : menu.name}
                          className="border-b last:border-0"
                        >
                          <td className="p-3 font-medium">{menu.name}{"_id" in menu && <div className="mt-2 flex flex-wrap gap-2"><MenuPdf menuId={menu._id} name={menu.name} /><Button size="sm" variant="outline" onClick={() => { setMenuFilter(menu._id); setCategoryFilter(''); setSearch(''); setPage('Products'); }}>View</Button><Button size="sm" variant="outline" disabled={menu.status !== 'draft'} onClick={() => setPublishingMenu({id:menu._id,name:menu.name})}>Publish QR</Button><Button size="sm" variant="outline" disabled={batchBusy || menu.status !== 'draft'} onClick={async () => {setBatchBusy(true);try{const result=await flow.generateAll(menu._id);setNotice(`Queued ${result.queued} dishes for generation. ${result.skipped} already generated or in progress.`);}catch{setNotice('Could not start generation. Please try again.');}finally{setBatchBusy(false);}}}>{batchBusy?'Starting…':'Generate cards'}</Button></div>}</td>
                          <td className="p-3 capitalize text-muted-foreground">
                            {"status" in menu ? menu.status : "draft"}
                          </td>
                          <td className="p-3 text-right">
                            {"productCount" in menu ? menu.productCount : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {menus.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No menus yet. Add a photo to recognize dishes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {page === "Categories" && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Groups used to organize dishes on your menu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="p-3 font-medium">Category name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map((category) => (
                        <tr key={category._id} className="border-b last:border-0">
                          <td className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                className="font-medium text-primary underline-offset-4 hover:underline"
                                onClick={() => {
                                  setCategoryFilter(category.name);
                                  setSearch("");
                                  setPage("Products");
                                  setNotice(
                                    `Showing products in ${category.name}.`,
                                  );
                                }}
                              >
                                {category.name}
                              </button>
                              {session.isAuthenticated && category.persisted && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete ${category.name}`}
                                  disabled={removingId === category._id}
                                  onClick={() => {
                                    void (async () => {
                                      setRemovingId(category._id);
                                      try {
                                        await flow.deleteCategory(category._id);
                                        setHiddenCategoryIds((ids) =>
                                          ids.includes(category._id)
                                            ? ids
                                            : [...ids, category._id],
                                        );
                                        if (categoryFilter === category.name)
                                          setCategoryFilter("");
                                        setNotice(`${category.name} removed.`);
                                      } catch (error) {
                                        setNotice(
                                          error instanceof Error
                                            ? error.message
                                            : "Could not delete category.",
                                        );
                                      } finally {
                                        setRemovingId(null);
                                      }
                                    })();
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No categories yet. Add your first category.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {!["Dashboard", "Products", "Analytics", "Categories", "Menus"].includes(
            page
          ) && (
            <Card className="shadow-none">
              <CardContent className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="mb-5 rounded-full bg-muted p-4">
                  <Settings2 className="size-6" />
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
      {showJobsToast && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 w-72 rounded-xl border bg-white p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Recognition jobs</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {recognitionJobCount}
              </p>
              {runningJobCount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {runningJobCount} running
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close recognition jobs"
              onClick={() => setDismissedJobCount(recognitionJobCount)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
