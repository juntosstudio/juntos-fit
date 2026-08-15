import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  getErrorMessage,
} from './errors'

describe('Readable error messages', () => {
  test.each([
    null,
    undefined,
    false,
  ])(
    'uses fallback for missing error %o',
    (error) => {
      expect(
        getErrorMessage(
          error,
          'Custom fallback',
        ),
      ).toBe('Custom fallback')
    },
  )

  test('uses the default fallback when none is supplied', () => {
    expect(
      getErrorMessage(null),
    ).toBe('Something went wrong.')
  })

  test('returns a normal JavaScript error message', () => {
    expect(
      getErrorMessage(
        new Error('Network failed'),
      ),
    ).toBe('Network failed')
  })

  test('combines Supabase/Postgres error details in order', () => {
    expect(
      getErrorMessage({
        message: 'Insert failed',
        details: 'Duplicate row',
        hint: 'Use another value',
        code: '23505',
      }),
    ).toBe(
      'Insert failed | Duplicate row | Use another value | Code: 23505',
    )
  })

  test('includes only the error fields that are present', () => {
    expect(
      getErrorMessage({
        message: 'Request failed',
        code: '400',
      }),
    ).toBe(
      'Request failed | Code: 400',
    )
  })

  test('uses fallback when the error object has no readable details', () => {
    expect(
      getErrorMessage(
        {},
        'Could not save.',
      ),
    ).toBe('Could not save.')
  })
})
