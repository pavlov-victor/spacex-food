import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const dishes = [
  { name: "Karađorđe's schnitzel", category: "Mains", description: "Golden, crisp pork schnitzel rolled with creamy kajmak. Served with fries and a wedge of lemon.", price: 1290, portion: "350 g", image: "schnitzel", tags: ["Served hot", "Takeaway"], ingredients: ["Pork", "Kajmak", "Breadcrumbs", "Potatoes", "Lemon"], allergens: ["Milk", "Wheat", "Eggs"] },
  { name: "House burger", category: "Mains", description: "Grilled beef, melted cheese, crisp lettuce and our house sauce in a toasted bun.", price: 990, portion: "300 g", image: "burger", tags: ["Served hot", "Takeaway"], ingredients: ["Beef", "Cheese", "Bun", "Lettuce", "House sauce"], allergens: ["Wheat", "Milk", "Eggs"] },
  { name: "Spicy house burger", category: "Mains", description: "Our beef burger with a generous kick of chilli, pickles and smoked cheese.", price: 1090, portion: "320 g", image: "burger", tags: ["Spicy", "Served hot"], ingredients: ["Beef", "Chilli", "Cheese", "Bun", "Pickles"], allergens: ["Wheat", "Milk"] },
  { name: "Little burger & fries", category: "Mains", description: "A smaller beef burger with cheese and a side of golden fries. Simple and satisfying.", price: 650, portion: "200 g", image: "burger", tags: ["Kids", "Served hot"], ingredients: ["Beef", "Cheese", "Bun", "Potatoes"], allergens: ["Wheat", "Milk"] },
  { name: "Garden salad", category: "Salads", description: "A colourful bowl of fresh leaves, ripe tomatoes and cucumber with a lemon dressing.", price: 590, portion: "250 g", image: "salad", tags: ["Vegan", "Light", "Takeaway"], ingredients: ["Mixed leaves", "Tomato", "Cucumber", "Lemon", "Olive oil"], allergens: [] },
  { name: "Summer tomato salad", category: "Salads", description: "Sweet tomatoes, crisp cucumber and fresh herbs. Finished with extra virgin olive oil.", price: 490, portion: "220 g", image: "salad", tags: ["Vegan", "Light"], ingredients: ["Tomato", "Cucumber", "Herbs", "Olive oil"], allergens: [] },
  { name: "Chocolate cake", category: "Desserts", description: "A rich slice of chocolate cake. The perfect excuse to stay a little longer.", price: 490, portion: "140 g", image: "cake", tags: ["Takeaway", "Kids"], ingredients: ["Chocolate", "Flour", "Butter", "Eggs", "Sugar"], allergens: ["Milk", "Wheat", "Eggs"] },
  { name: "Double chocolate slice", category: "Desserts", description: "Dark chocolate sponge with a smooth chocolate filling. Made for serious chocolate lovers.", price: 550, portion: "160 g", image: "cake", tags: ["Takeaway"], ingredients: ["Dark chocolate", "Flour", "Cream", "Eggs"], allergens: ["Milk", "Wheat", "Eggs"] },
  { name: "Homemade lemonade", category: "Drinks", description: "Freshly squeezed lemon, chilled water and just enough sweetness. Refreshingly simple.", price: 320, portion: "300 ml", image: null, tags: ["Vegan", "Kids"], ingredients: ["Lemon", "Water", "Sugar"], allergens: [] },
  { name: "Espresso", category: "Drinks", description: "A small cup with a big personality. Freshly ground coffee, pulled to order.", price: 220, portion: "30 ml", image: null, tags: ["Vegan", "Served hot"], ingredients: ["Coffee", "Water"], allergens: [] },
];
export const seed = internalMutation({
  args: {}, returns: v.string(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("publicMenus").withIndex("by_slug", q => q.eq("slug", "sava")).unique();
    if (existing) return "Demo already exists: /menu/sava";
    const account = await ctx.db.query("authAccounts").withIndex("providerAndAccountId", q => q.eq("provider", "password").eq("providerAccountId", "admin")).unique();
    if (!account) throw new Error("Run bootstrap:seed first.");
    const membership = await ctx.db.query("memberships").withIndex("by_userId", q => q.eq("userId", account.userId)).first();
    if (!membership) throw new Error("Admin organization missing.");
    const organizationId = membership.organizationId;
    const menuId = await ctx.db.insert("menus", { organizationId, name: "Sava · Customer demo", status: "draft", fileIds: [], warnings: ["Fictional demo recipes, prices and illustrative photos."], productCount: dishes.length });
    const publicMenuId = await ctx.db.insert("publicMenus", { organizationId, menuId, slug: "sava", name: "Sava", published: true, demo: true });
    for (const dish of dishes) {
      const key = dish.category.toLowerCase();
      const category = await ctx.db.query("categories").withIndex("by_organizationId_and_key", q => q.eq("organizationId", organizationId).eq("key", key)).unique();
      const categoryId = category?._id ?? await ctx.db.insert("categories", { organizationId, key, name: dish.category });
      await ctx.db.insert("products", { organizationId, menuId, categoryId, name: dish.name, description: dish.description, price: dish.price, currency: "RSD", portion: dish.portion, sourceJson: JSON.stringify({ demo: true }), needsReview: false, confirmed: { ingredients: dish.ingredients, allergens: dish.allergens, allergens_complete: true, vegan: dish.tags.includes("Vegan"), spicy: dish.tags.includes("Spicy"), kids_menu: dish.tags.includes("Kids"), low_calorie: dish.tags.includes("Light"), served_hot: dish.tags.includes("Served hot"), takeaway: dish.tags.includes("Takeaway") } });
      await ctx.db.insert("publicMenuItems", { publicMenuId, name: dish.name, description: dish.description, category: dish.category, price: dish.price, currency: "RSD", portion: dish.portion, tags: dish.tags, ingredients: dish.ingredients, allergens: dish.allergens, allergensComplete: true, imageUrl: dish.image ? `/menu/${dish.image}.jpg` : null });
    }
    return `Created ${dishes.length} products: /menu/sava`;
  },
});
