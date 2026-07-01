import type { ComponentType } from "react";

import {
  CoffeeIcon,
  DessertIcon,
  DiningIcon,
  RideIcon,
  type IconProps,
} from "@/components/ui/icons";

export type TreatLink = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<IconProps>;
  url: string;
};

/** Digital gift-card flows — opens in the system browser. */
export const TREAT_LINKS: TreatLink[] = [
  {
    id: "coffee",
    title: "Send a coffee",
    subtitle: "Starbucks eGift",
    icon: CoffeeIcon,
    url: "https://www.starbucks.com/gift",
  },
  {
    id: "dinner",
    title: "Send dinner",
    subtitle: "DoorDash gift card",
    icon: DiningIcon,
    url: "https://www.doordash.com/gift-cards/",
  },
  {
    id: "dessert",
    title: "Sweet treat",
    subtitle: "Uber Eats gift card",
    icon: DessertIcon,
    url: "https://www.ubereats.com/gift-cards/",
  },
  {
    id: "ride",
    title: "Get them home safe",
    subtitle: "Uber gift card",
    icon: RideIcon,
    url: "https://www.uber.com/us/en/gift-cards/",
  },
];
