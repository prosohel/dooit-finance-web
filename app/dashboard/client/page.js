import { getLoggedInUser } from "@/app/actions";
import ClientDashboardPage from "@/views/client-dashboard/dashboard";
import CryptoCurrencyDashboard from "@/views/crypto-currency/dashboard";
import LawyerConveyancerDashboard from "@/views/lawyer-conveyancer/dashboard";
import PreciousMetalDashboard from "@/views/precious-metal/dashboard";
import RealEstateDashboard from "@/views/real-estate/dashboard";
import { getAllEntityTypes } from "../actions";

/**
 * A client maps to an entity-type dashboard when its clientType matches that
 * entity by name, id, or one of the entity's matchKeywords (case-insensitive).
 */
const matchesEntity = (entityTypes, clientType, name) => {
  const entity = entityTypes.find((e) => e.name === name);
  if (!entity || !clientType) return false;
  const ct = String(clientType).toLowerCase();
  return (
    entity.name?.toLowerCase() === ct ||
    String(entity._id) === String(clientType) ||
    entity.matchKeywords?.includes(ct) ||
    false
  );
};

/**
 * This page renders the signed-in user's own dashboard, so it must never be
 * prerendered into shared static HTML. We say so explicitly rather than relying
 * on Next inferring it from the cookie reads inside fetchWithAuth - the .catch()
 * handlers below would otherwise swallow that signal.
 */
export const dynamic = "force-dynamic";

/**
 * Server component on purpose. The user and the entity-type list are both
 * needed just to decide *which* dashboard to show, so we load them here, on the
 * server, in parallel. The browser then receives HTML with the right dashboard
 * already in it - no hydrate-then-fetch round trips, and no loading spinner.
 */
export default async function DashboardClientPage() {
  // Independent calls, so run them together rather than one after the other.
  // Each falls back to null so one failing endpoint cannot blank the page.
  const [userResponse, entityResponse] = await Promise.all([
    getLoggedInUser().catch((error) => {
      console.error("Failed to load the logged in user:", error);
      return null;
    }),
    getAllEntityTypes().catch((error) => {
      console.error("Failed to load entity types:", error);
      return null;
    }),
  ]);

  const clientType = userResponse?.data?.client?.clientType;
  const entityTypes = Array.isArray(entityResponse?.data) ? entityResponse.data : [];

  const matches = (name) => matchesEntity(entityTypes, clientType, name);

  const isFinancial = matches("Banks & ADIs");
  const isRealState = matches("Real Estate");
  const isPreciousMetal = matches("Precious Metal Dealers");
  const isCrypto = matches("VASP/DCEP");
  const isLawyer = matches("Lawyers/Conveyancers");
  const hasMatchedDashboard = isFinancial || isRealState || isPreciousMetal || isCrypto || isLawyer;

  return (
    <div>
      {isRealState && <RealEstateDashboard />}
      {isFinancial && <ClientDashboardPage />}
      {isPreciousMetal && <PreciousMetalDashboard />}
      {isCrypto && <CryptoCurrencyDashboard />}
      {isLawyer && <LawyerConveyancerDashboard />}
      {/* Fallback so the page is never blank when no specific entity type matches */}
      {!hasMatchedDashboard && <ClientDashboardPage />}
    </div>
  );
}
