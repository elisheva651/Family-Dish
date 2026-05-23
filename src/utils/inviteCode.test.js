import { describe, it, expect } from 'vitest'
import { generateInviteCode } from './inviteCode'

describe('generateInviteCode', () => {
  it('returns a 6-character string', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(6)
  })

  it('contains only uppercase letters and digits', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('generates different codes on consecutive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()))
    expect(codes.size).toBeGreaterThan(15)
  })
})
