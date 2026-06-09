export interface PasswordStrength {
  label: 'Weak' | 'Fair' | 'Strong'
  color: string
  bgColor: string
}

export interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

export function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }
}

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null

  const reqs = checkPasswordRequirements(password)
  const metCount = Object.values(reqs).filter(Boolean).length

  if (metCount === 5) {
    return { label: 'Strong', color: '#10B981', bgColor: '#D1FAE5' }
  } else if (metCount >= 3) {
    return { label: 'Fair', color: '#F59E0B', bgColor: '#FEF3C7' }
  } else {
    return { label: 'Weak', color: '#EF4444', bgColor: '#FEE2E2' }
  }
}

export function isPasswordValid(password: string): boolean {
  const reqs = checkPasswordRequirements(password)
  return Object.values(reqs).every(Boolean)
}
