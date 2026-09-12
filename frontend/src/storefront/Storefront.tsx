import { useEffect, useState } from "react";
import { usePublicMenu } from "@/hooks/use-public-menu";
import { PublicMenuProvider } from "./PublicMenuProvider";
import { ArrowUpRight, Coffee, Leaf, MapPin, Search, SlidersHorizontal, Utensils, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./storefront.css";
const tagIcons: Record<string, string> = { Vegan: "↗", Spicy: "♨", Light: "◌", Kids: "☺", "Served hot": "♨", Takeaway: "↗" };
export default function Storefront() {
  return <PublicMenuProvider><Menu /></PublicMenuProvider>;
}
function Menu() {
  const slug = window.location.pathname.split("/")[2] ?? "";
  const menu = usePublicMenu(slug);
  const [category, setCategory] = useState("All dishes");
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { document.title = menu ? `${menu.name} · Menu` : "Restaurant menu"; }, [menu]);
  if (menu === undefined) return <main className="sf-message" role="status"><Utensils /><p>Setting the table…</p></main>;
  if (!menu) return <main className="sf-message"><Utensils /><h1>Menu unavailable</h1><p>This menu has not been published yet.</p></main>;
  const categories = ["All dishes", ...new Set(menu.items.map(item => item.category))];
  const availableTags = [...new Set(menu.items.flatMap(item => item.tags))];
  const filtered = menu.items.filter(item => (category === "All dishes" || item.category === category) && tags.every(tag => item.tags.includes(tag)) && `${item.name} ${item.description} ${item.ingredients.join(" ")}`.toLowerCase().includes(search.toLowerCase().trim()));
  const dish = menu.items.find(item => item.id === selected);
  const reset = () => { setTags([]); setSearch(""); setCategory("All dishes"); };
  return <main className="storefront">
    <header className="sf-top"><a href={`/menu/${slug}`} className="sf-logo">{menu.name.toLowerCase()}<span>●</span></a><span className="sf-top-label">GOOD FOOD. GOOD COMPANY.</span><span className="sf-menu-label">THE MENU <ArrowUpRight size={15} /></span></header>
    <section className={`sf-hero ${menu.demo ? "" : "sf-hero-plain"}`}>
      <div className="sf-hero-copy"><span className="sf-eyebrow">{menu.demo ? "A LITTLE TASTE OF BELGRADE" : "WELCOME TO OUR TABLE"}</span><h1>Come hungry.<br /><em>Leave happy.</em></h1><p>Something comforting. Something fresh.<br />Find your next favourite, right here.</p><div className="sf-location"><MapPin size={15} />{menu.demo ? "Belgrade · Neighbourhood kitchen" : menu.name}</div></div>
      {menu.demo && <div className="sf-hero-photo"><img src="/menu/restaurant.jpg" alt="Warm restaurant interior with wooden tables" /><span>Pull up a chair.</span></div>}
    </section>
    {menu.demo && <p className="sf-demo">Demo menu · Sample prices and recipes · Illustrative photos</p>}
    <section className="sf-browse" aria-label="Menu filters"><div className="sf-search-row"><label className="sf-search"><Search size={19} /><input aria-label="Search dishes" placeholder="What are you craving?" value={search} onChange={e => setSearch(e.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={16} /></button>}</label><button className={`sf-filter-button ${filters || tags.length ? "sf-active" : ""}`} aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={18} /><span>Filters{tags.length ? ` (${tags.length})` : ""}</span></button></div>
      <nav className="sf-categories" aria-label="Categories">{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}<span>{c === "All dishes" ? menu.items.length : menu.items.filter(i => i.category === c).length}</span></button>)}</nav>
      {(filters || tags.length > 0) && <div className="sf-filters"><span>MAKE IT YOURS</span><div>{availableTags.map(tag => <button key={tag} aria-pressed={tags.includes(tag)} onClick={() => setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])}>{tagIcons[tag]} {tag}</button>)}{tags.length > 0 && <button onClick={() => setTags([])}>Clear tags ×</button>}</div><small>Shows dishes matching all selected tags.</small></div>}
    </section>
    <section className="sf-results"><div className="sf-section-heading"><div><span className="sf-eyebrow">MADE TO MAKE YOUR DAY</span><h2>{category === "All dishes" ? "Explore the menu" : category}</h2></div><span role="status">{filtered.length} dishes</span></div>
      {filtered.length ? <div className="sf-grid">{filtered.map((item, index) => <button className="sf-card" key={item.id} onClick={() => setSelected(item.id)} aria-label={`View ${item.name}`}><div className={`sf-card-photo ${!item.imageUrl ? "sf-no-photo" : ""}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} loading={index < 2 ? "eager" : "lazy"} onError={e => { e.currentTarget.style.display = "none"; }} /> : <Coffee size={50} strokeWidth={1} />}{item.tags.includes("Vegan") && <span className="sf-photo-badge"><Leaf size={12} /> Plant based</span>}<span className="sf-card-arrow"><ArrowUpRight size={18} /></span></div><div className="sf-card-body"><div className="sf-card-category">{item.category} <span>· {item.portion}</span></div><h3>{item.name}</h3><p>{item.description}</p><div className="sf-card-bottom"><strong>{item.price === null ? "Ask for price" : `${item.price.toLocaleString("en-US")} ${item.currency}`}</strong><div>{item.tags.slice(0, 2).map(tag => <span key={tag}>{tagIcons[tag]} {tag}</span>)}</div></div></div></button>)}</div> : <div className="sf-empty"><Search size={30} /><h3>No dishes found</h3><p>Try another search or a different combination of filters.</p><button onClick={reset}>Reset filters</button></div>}
    </section>
    <footer className="sf-footer"><span className="sf-logo">{menu.name.toLowerCase()}<span>●</span></span><p>Made for good moments around the table.</p><small>Questions about ingredients or allergies? Please ask our team.</small></footer>
    <Dialog open={!!dish} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="sf-detail">{dish && <>{dish.imageUrl && <img className="sf-detail-image" src={dish.imageUrl} alt={dish.name} />}<div className="sf-detail-copy"><span className="sf-eyebrow">{dish.category} · {dish.portion}</span><DialogTitle className="sf-detail-title">{dish.name}</DialogTitle><DialogDescription>{dish.description}</DialogDescription><strong className="sf-detail-price">{dish.price === null ? "Ask for price" : `${dish.price.toLocaleString("en-US")} ${dish.currency}`}</strong><div className="sf-detail-tags">{dish.tags.map(tag => <span key={tag}>{tagIcons[tag]} {tag}</span>)}</div><h3>Ingredients</h3><p>{dish.ingredients.length ? dish.ingredients.join(", ") : "Please ask our team for the ingredients."}</p><h3>Allergens</h3><p>{dish.allergens.length ? dish.allergens.join(", ") : dish.allergensComplete ? "No listed allergens." : "Allergen information is not available."} {!dish.allergensComplete && "The list may be incomplete."}</p><small>Please tell our team about any allergies before ordering.{menu.demo && " This is a demo recipe."}</small></div></>}</DialogContent></Dialog>
  </main>;
}
