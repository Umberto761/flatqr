export interface ClientAddress {
  name: string;
  address: string;
  building: string;
  zip: string;
  city: string;
  country: string;
}

export const DEMO_CLIENTS: Record<string, Omit<ClientAddress, "name">> = {
  "Atelier Nord GmbH": {
    address: "Clarastrasse",
    building: "12",
    zip: "4058",
    city: "Basel",
    country: "CH",
  },
  "Kantonsspital Muster": {
    address: "Spitalstrasse",
    building: "21",
    zip: "4031",
    city: "Basel",
    country: "CH",
  },
  "Buchhandlung Clarahof": {
    address: "Clarahofweg",
    building: "8",
    zip: "4058",
    city: "Basel",
    country: "CH",
  },
};

export function addressForClient(name: string): ClientAddress {
  const known = DEMO_CLIENTS[name];
  if (known) return { name, ...known };
  return {
    name,
    address: "",
    building: "",
    zip: "",
    city: "",
    country: "CH",
  };
}
