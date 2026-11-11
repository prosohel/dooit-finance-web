import { useEffect } from "react";
import { create } from "zustand";
import { getLoggedInUser } from "../actions";

//turn this into a react hook

export const useLoggedInUserStore = create((set) => ({
    loggedInUser: null,
    fetching: false,
    fetchLoggedInUser: async () => {
        try {
          set({ fetching: true });
          const response = await getLoggedInUser();
          // Keep the same shape useGetUser stores: the encrypt/decrypt lock
          // button reads isDataEncrypted, and this fetch (site header, Nisa
          // chat) races useGetUser's — dropping the flag made the button show
          // "unlocked" and send encrypt on every click.
          set({
            loggedInUser: response?.data
              ? { ...response.data, isDataEncrypted: response.encryptionStatus }
              : null,
          });
        } catch (error) {
          console.error("getLoggedInUser failed", error);
        } finally {
          set({ fetching: false });
        }
      },
    
    setLoggedInUser: (loggedInUser) => set({ loggedInUser }),

}))

// export const useLoggedInUser = () => {
//     const { loggedInUser, setLoggedInUser, fetchLoggedInUser, fetching } = useLoggedInUserStore()
//     useEffect(() => {
//         console.log('fetching', fetching)
//         fetchLoggedInUser()
//     }, [])
//     return { loggedInUser, setLoggedInUser, fetching }
// }

export const useLoggedInUser = () => {
    const { loggedInUser, setLoggedInUser, fetchLoggedInUser, fetching } =
      useLoggedInUserStore();
  
    useEffect(() => {
      let isMounted = true;
  
      const run = async () => {
        try {
          await fetchLoggedInUser();
        } catch (err) {
          console.error("Failed to fetch logged in user", err);
        }
      };
  
      if (isMounted) run();
  
      return () => {
        isMounted = false;
      };
    }, [fetchLoggedInUser]);
  
    return { loggedInUser, setLoggedInUser, fetching };
  };