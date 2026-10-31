"use client";

import { useEffect } from "react";
import { getLoggedInUser } from "@/app/actions";
import { useLoggedInUserStore } from "@/app/store/useLoggedInUser";

/**
 * The currently in-flight "auth/me" request, or null when nothing is pending.
 *
 * Several components call useGetUser() at the same time (the sidebar, the page,
 * the header...). Each mount used to fire its own request for the exact same
 * user. We hold the pending promise here - outside React, so it is shared by
 * every component - and anyone who arrives while a request is already on its
 * way awaits that same request instead of starting another one.
 */
let inFlightRequest = null;

/**
 * Fetch the logged in user and push it into the store, reusing the pending
 * request when one is already running.
 */
const fetchLoggedInUserOnce = (setLoggedInUser) => {
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    try {
      const response = await getLoggedInUser();
      if (response?.success) {
        setLoggedInUser({ ...response.data, isDataEncrypted: response.encryptionStatus });
      }
      return response;
    } catch (error) {
      console.error("Failed to load the logged in user:", error);
      return null;
    } finally {
      // Cleared either way, so a later refresh can start a fresh request.
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
};

const useGetUser = () => {
  const { loggedInUser, setLoggedInUser } = useLoggedInUserStore();

  useEffect(() => {
    // Already in the store - another component loaded it, or we navigated back
    // to this page - so there is nothing to fetch.
    if (loggedInUser) return;
    fetchLoggedInUserOnce(setLoggedInUser);
  }, [loggedInUser, setLoggedInUser]);

  /**
   * Force a reload of the user, e.g. after editing the profile or client
   * settings. Still joins the pending request if one happens to be running.
   */
  const getUser = () => fetchLoggedInUserOnce(setLoggedInUser);

  return { loggedInUser, getUser };
};

export default useGetUser;
