import NextAuth, { User } from "next-auth"
import Credentials from "next-auth/providers/credentials"

declare module "next-auth" {
  interface User {
    accessToken?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      authorize: async (credentials) => {
        const formData = new URLSearchParams();
        formData.append("username", credentials?.email as string);
        formData.append("password", credentials?.password as string);
        const res = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const data = await res.json()

        if (res.ok && data.access_token) {
          return {
            email: credentials?.email as string,
            id: data.user_id,
            accessToken: data.access_token,
          }
        }
        return null
      },
    }),

  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.accessToken = user.accessToken
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.accessToken = token.accessToken as string
      return session
    },
  },
})
