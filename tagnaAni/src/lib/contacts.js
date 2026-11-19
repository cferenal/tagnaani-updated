export const CONTACT_ROLES = [
  { value: "seed_supplier", label: "Seed supplier" },
  { value: "fertilizer_supplier", label: "Fertilizer supplier" },
  { value: "pesticide_supplier", label: "Pesticide supplier" },
  { value: "buyer", label: "Buyer / trader" },
  { value: "technician", label: "Agri technician" },
  { value: "labor", label: "Labor group" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

export function roleLabel(value) {
  return CONTACT_ROLES.find((r) => r.value === value)?.label || "Contact";
}

export function isSupplier(contact) {
  return String(contact.role || "").endsWith("_supplier");
}

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

const TONES = ["bg-olive-deep", "bg-olive", "bg-olive-soft"];

export function avatarTone(name = "") {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return TONES[sum % TONES.length];
}

export function telHref(phone = "") {
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}