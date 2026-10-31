import { jwtDecode } from "jwt-decode";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

class InvalidCredentialsError extends CredentialsSignin {
  constructor(message) {
    super();
    this.code = message;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.

      credentials: {
        email: {},
        password: {},
        // userType: {},
      },
      authorize: async (credentials, request) => {
        try {
          const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}auth/login`;
          console.log("log1 login url", url);

          // Forward the browser's identity so the API's device/audit telemetry
          // records the real client, not the Next.js server.
          const { deviceId, ...loginBody } = credentials ?? {};
          const forwarded = {};
          const ua = request?.headers?.get?.("user-agent");
          if (ua) forwarded["User-Agent"] = ua;
          const xff = request?.headers?.get?.("x-forwarded-for");
          if (xff) forwarded["X-Forwarded-For"] = xff;
          if (deviceId) forwarded["X-Device-Id"] = deviceId;

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...forwarded },
            body: JSON.stringify(loginBody),
          });
          console.log("log1 login res", res);

          const data = await res.json();

          if (data.success) {
            const decodedToken = jwtDecode(data?.token);
            const user = {
              ...decodedToken,
              token: data.token,
              role: decodedToken.role,
              name: decodedToken.name,
              email: decodedToken.email,
              userType: decodedToken.userType,
              id: decodedToken.id,
            };
            return user;
          } else {
            throw new InvalidCredentialsError(data.error);
          }
        } catch (error) {
          throw new InvalidCredentialsError(error.code);
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.accessToken !== "string") return session;
      const decodedToken = jwtDecode(token.accessToken);
      session.user = {
        ...decodedToken,
        name: token.name,
        email: token.email,
        role: token.role,
        accessToken: token.accessToken,
        userType: decodedToken.userType || null,
        id: token.id,
      };

      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
