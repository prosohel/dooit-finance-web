// Display identity for a Customer, shared by the customer queue list and the
// customer details page.
//
// Customers with no linked portal User (`user: null` — TM demo seeds, manual
// imports) carry their identity only in personalKyc. Prefer the User fields,
// fall back to the KYC form. Roles without decrypt permission get "***" from
// the API for the KYC fields; keep a single mask instead of "*** ***".

export const MASK = "***";

export const getCustomerIdentity = (customer) => {
  const form = customer?.personalKyc?.personal_form || {};
  const details = form.customer_details || {};
  const nameParts = [details.given_name, details.middle_name, details.surname];
  const kycName =
    nameParts.filter((v) => v && v !== MASK).join(" ") ||
    (nameParts.includes(MASK) ? MASK : "");
  const name = customer?.user?.name || kycName;
  return {
    name,
    email: customer?.user?.email || form.contact_details?.email || "",
    phone: customer?.metadata?.phone || form.contact_details?.phone || "",
    photo: customer?.selfieUrl || customer?.user?.photoUrl || undefined,
    initial: name && name !== MASK ? name.trim().charAt(0).toUpperCase() : "",
  };
};
