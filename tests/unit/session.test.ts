import { describe, expect, it } from 'vitest'
import { HOUSE_LEVEL_ID } from '../../src/game/levels'
import { advanceSessionLevel, getSessionLevel, resetSession, setSessionLevel } from '../../src/game/session'

describe('session (fase atual)', () => {
  it('começa na primeira fase após resetSession', () => {
    resetSession()
    expect(getSessionLevel().id).toBe(HOUSE_LEVEL_ID)
  })

  it('setSessionLevel troca a fase da sessão', () => {
    resetSession()
    setSessionLevel(HOUSE_LEVEL_ID)
    expect(getSessionLevel().id).toBe(HOUSE_LEVEL_ID)
  })

  it('advanceSessionLevel avança para outra fase aleatória (campanha tem 4 fases)', () => {
    resetSession()
    const next = advanceSessionLevel()
    expect(next).not.toBeNull()
    expect(next!.id).not.toBe(HOUSE_LEVEL_ID)
  })
})
