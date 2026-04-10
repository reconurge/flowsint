import type { Profile } from '@/types'
import type { User } from '@/stores/auth-store'

type UserLike = Partial<Profile> & Partial<User> | null | undefined

/**
 * Returns the best display name available:
 * username > "first last" > email > "Unknown"
 */
export function getDisplayName(user: UserLike): string {
  if (!user) return 'Unknown'
  if ('username' in user && user.username) return user.username
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  if (fullName) return fullName
  if (user.email) return user.email
  return 'Unknown'
}

/**
 * Returns 1-2 letter initials from the best available name source.
 */
export function getInitials(user: UserLike): string {
  if (!user) return '?'
  if ('username' in user && user.username) return user.username[0].toUpperCase()
  const first = user.first_name?.[0] ?? ''
  const last = user.last_name?.[0] ?? ''
  if (first || last) return (first + last).toUpperCase()
  if (user.email) return user.email[0].toUpperCase()
  return '?'
}
