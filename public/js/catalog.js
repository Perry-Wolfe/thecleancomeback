// Single source of truth for products and prices.
// Imported by the storefront (public/js/main.js) and the checkout function
// (netlify/functions/checkout.js), so prices can never drift apart.
// Prices are in cents.

export const MAX_QTY = 20;

export const LINES = {
  energy: "Pure Energy",
  protein: "Perry's Protein",
  pop: "Pure Pop",
};

export const PRODUCTS = [
  {
    id: "energy-12",
    line: "energy",
    name: "Pure Energy",
    pack: "Mixed 12-pack",
    price: 2999,
    image: "energy-lineup",
    alt: "Four Pure Energy cans in a row",
  },
  {
    id: "energy-24",
    line: "energy",
    name: "Pure Energy",
    pack: "Mixed 24-pack",
    price: 5499,
    image: "energy-lineup-2",
    alt: "Pure Energy can held out of a convertible",
  },
  {
    id: "protein-vanilla",
    line: "protein",
    name: "Perry's Protein Vanilla",
    pack: "12 bottles, 30 g protein each",
    price: 4499,
    image: "protein-vanilla30",
    alt: "Perry's Protein Vanilla bottle and carton",
  },
  {
    id: "protein-choc",
    line: "protein",
    name: "Perry's Protein Chocolate",
    pack: "12 bottles, 30 g protein each",
    price: 4499,
    image: "protein-chocolate",
    alt: "Perry's Protein Chocolate bottle and carton",
  },
  {
    id: "protein-strawberry",
    line: "protein",
    name: "Perry's Protein Strawberry",
    pack: "12 bottles, 30 g protein each",
    price: 4499,
    image: "protein-strawberry",
    alt: "Perry's Protein Strawberry bottle and carton",
  },
  {
    id: "protein-matcha",
    line: "protein",
    name: "Perry's Protein Matcha",
    pack: "12 bottles, 30 g protein each",
    price: 4799,
    image: "protein-matcha",
    alt: "Perry's Protein Matcha bottle and carton",
  },
  {
    id: "protein-vanilla-60",
    line: "protein",
    name: "Perry's Protein Vanilla 60",
    pack: "60 g protein per bottle",
    price: null,
    comingSoon: true,
    image: "protein-vanilla60",
    alt: "Perry's Protein Vanilla 60 g bottle",
  },
  {
    id: "pop-12",
    line: "pop",
    name: "Pure Pop",
    pack: "Mixed 12-pack",
    price: 2799,
    image: "pop-lineup",
    alt: "Pure Pop cans in Apple, Peach, Watermelon and Tropical",
  },
  {
    id: "pop-24",
    line: "pop",
    name: "Pure Pop",
    pack: "Mixed 24-pack",
    price: 4999,
    image: "pop-lineup",
    alt: "Pure Pop cans in Apple, Peach, Watermelon and Tropical",
  },
];

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id && !p.comingSoon);
