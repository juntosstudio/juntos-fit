import {
  expect,
  test,
} from '@playwright/test'

async function expectDashboard(page) {
  await expect(
    page.getByRole('heading', {
      name: 'Juntos Coach',
    }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', {
      name: 'Sign Out',
    }),
  ).toBeVisible()
}

async function clickEnabledNext(
  page,
  stepName,
) {
  const next =
    page.getByRole('button', {
      name: 'Next',
      exact: true,
    })

  await expect(
    next,
    `${stepName}: Next should be enabled`,
  ).toBeEnabled()

  await next.click()
}

async function openDailyWizard(page) {
  await page.goto('/')
  await expectDashboard(page)

  const dailyCheckIn =
    page.getByRole('button', {
      name: 'Daily Check-In',
      exact: true,
    })

  await expect(dailyCheckIn).toBeVisible()
  await dailyCheckIn.click()

  await expect(
    page.getByRole('heading', {
      name: /Daily Check-In/,
    }),
  ).toBeVisible()
}

async function advanceDailyToCardio(page) {
  const card = page.locator(
    '#daily-checkin-wizard-step',
  )

  // Weight
  // This test is about Cardio, not the controlled
  // weight input. Take the real no-weight branch so
  // we can reach Cardio without coupling this test
  // to unrelated weight-field timing.
  await expect
    .poll(
      async () => card.innerText(),
      {
        message:
          'Daily wizard should finish loading into Weight or Cardio',
      },
    )
    .toMatch(
      /What was your weight this morning\?|How many minutes of cardio did you complete yesterday\?/,
    )

  const currentText =
    await card.innerText()

  if (
    currentText.includes(
      'How many minutes of cardio did you complete yesterday?',
    )
  ) {
    return
  }

  await expect(card).toContainText(
    'What was your weight this morning?',
  )

  await page
    .getByRole('button', {
      name: 'I don’t have a weight today',
    })
    .click()

  await expect(card).toContainText(
    'Why don’t you have a weight today?',
  )

  await page
    .getByRole('radio', {
      name: 'Skipped weighing this morning',
    })
    .check()

  await clickEnabledNext(
    page,
    'Weight',
  )

  // Meal-plan score = 5. Using the real keyboard
  // guarantees React sees an actual browser change.
  await expect(card).toContainText(
    'How closely did you follow your meal plan yesterday?',
  )

  const mealPlanSlider =
    page.locator(
      'input[name="meal-plan-score"]',
    )

  await mealPlanSlider.focus()
  await page.keyboard.press('End')

  await clickEnabledNext(
    page,
    'Meal plan score',
  )

  // Hunger. Any valid score is enough for this test.
  await expect(card).toContainText(
    'How hungry were you overall yesterday?',
  )

  const hungerSlider =
    page.locator(
      'input[name="hunger-score"]',
    )

  await hungerSlider.focus()
  await page.keyboard.press('End')

  await clickEnabledNext(
    page,
    'Hunger',
  )

  // Rest day avoids unrelated workout-detail branches.
  await expect(card).toContainText(
    'Did you complete your scheduled workout yesterday?',
  )

  await page
    .getByRole('radio', {
      name:
        'Rest day / no workout scheduled',
    })
    .check()

  await clickEnabledNext(
    page,
    'Workout status',
  )

  await expect(card).toContainText(
    'How many minutes of cardio did you complete yesterday?',
  )
}


async function openWeeklyWizard(page) {
  await page.goto('/')
  await expectDashboard(page)

  // The Weekly preview already exists in DEV; it lives
  // inside a collapsed <details> section.
  const devTools =
    page.locator(
      'details.dashboard-dev-tools',
    )

  await expect(devTools).toBeVisible()

  const isOpen =
    await devTools.evaluate(
      (details) => details.open,
    )

  if (!isOpen) {
    await devTools
      .locator('summary')
      .click()
  }

  const preview =
    page.getByRole('button', {
      name:
        'Preview Weekly Check-In Wizard',
    })

  await expect(preview).toBeVisible()
  await preview.click()

  // Weekly now enters through the real preflight. If the
  // preflight is clear, continue into the real wizard.
  const continueButton =
    page.getByRole('button', {
      name:
        'Continue to Weekly Check-In',
    })

  if (
    await continueButton
      .isVisible()
      .catch(() => false)
  ) {
    await continueButton.click()
  }

  await expect(
    page.locator(
      'main.weekly-checkin-page',
    ),
  ).toBeVisible()
}


async function advanceWeeklyToCardio(page) {
  const root = page.locator(
    'main.weekly-checkin-page',
  )

  for (
    let step = 0;
    step < 12;
    step += 1
  ) {
    await expect(root).toBeVisible()

    let text =
      await root.innerText()

    if (
      text.includes(
        'Loading your check-in...',
      ) ||
      text.includes(
        'Opening your Weekly Check-In...',
      )
    ) {
      await expect
        .poll(
          async () => root.innerText(),
          {
            message:
              'Weekly wizard should finish loading into a real step',
          },
        )
        .not.toMatch(
          /Loading your check-in\.\.\.|Opening your Weekly Check-In\.\.\./,
        )

      text =
        await root.innerText()
    }

    if (
      text.includes(
        'How many minutes of cardio did you complete yesterday?',
      )
    ) {
      return
    }

    if (
      text.includes(
        'Let’s Get Started',
      )
    ) {
      await clickEnabledNext(
        page,
        'Weekly Get Started',
      )
      continue
    }

    if (
      text.includes(
        'What was your weight this morning?',
      )
    ) {
      await page
        .getByRole('button', {
          name:
            'I don’t have a weight today',
        })
        .click()

      await page
        .getByRole('radio', {
          name:
            'Skipped weighing this morning',
        })
        .check()

      await clickEnabledNext(
        page,
        'Weekly Weight',
      )
      continue
    }

    if (
      text.includes(
        'Body Fat Estimate',
      )
    ) {
      await clickEnabledNext(
        page,
        'Weekly Body Fat Estimate',
      )
      continue
    }

    if (
      await page
        .locator(
          '#weekly-scale-body-fat',
        )
        .isVisible()
        .catch(() => false)
    ) {
      await page
        .locator(
          '#weekly-scale-body-fat',
        )
        .fill('30')

      await clickEnabledNext(
        page,
        'Weekly Scale Body Fat',
      )
      continue
    }

    if (
      text.includes(
        'Measure your waist.',
      )
    ) {
      await page
        .locator('#weekly-waist')
        .fill('34')

      await clickEnabledNext(
        page,
        'Weekly Waist',
      )
      continue
    }

    if (
      text.includes(
        'How closely did you follow your meal plan yesterday?',
      )
    ) {
      const slider =
        page.locator(
          'input[name="meal-plan-score"]',
        )

      await slider.focus()
      await page.keyboard.press('End')

      await clickEnabledNext(
        page,
        'Weekly Meal Plan',
      )
      continue
    }

    if (
      text.includes(
        'How hungry were you overall yesterday?',
      )
    ) {
      const slider =
        page.locator(
          'input[name="hunger-score"]',
        )

      await slider.focus()
      await page.keyboard.press('End')

      await clickEnabledNext(
        page,
        'Weekly Hunger',
      )
      continue
    }

    if (
      text.includes(
        'Did you complete your scheduled workout yesterday?',
      )
    ) {
      await page
        .getByRole('radio', {
          name:
            'Rest day / no workout scheduled',
        })
        .check()

      await clickEnabledNext(
        page,
        'Weekly Workout Status',
      )
      continue
    }

    throw new Error(
      `Unexpected Weekly step before Cardio:\n${text}`,
    )
  }

  throw new Error(
    'Weekly Cardio step was not reached.',
  )
}

test.describe(
  'Juntos Fit browser regression',
  () => {
    test('saved session opens the real Dashboard', async ({
      page,
    }) => {
      await page.goto('/')
      await expectDashboard(page)
    })

    test('state-based Progress navigation returns to Dashboard', async ({
      page,
    }) => {
      await page.goto('/')
      await expectDashboard(page)

      const progress =
        page.getByRole('button', {
          name: 'Progress',
        })

      test.skip(
        await progress.isDisabled(),
        'Active plan required.',
      )

      await progress.click()

      await expect(
        page.getByRole('heading', {
          name: 'Plan Progress',
        }),
      ).toBeVisible()

      await page
        .getByRole('button', {
          name: 'Today',
          exact: true,
        })
        .click()

      await expectDashboard(page)
    })

    test('Dashboard DEV link opens real Daily wizard and returns', async ({
      page,
    }) => {
      await openDailyWizard(page)

      await page
        .getByRole('button', {
          name: 'Exit Check-In',
        })
        .click()

      await expectDashboard(page)
    })

    test('Daily Cardio default 0 is replaced by typing in Chromium', async ({
      page,
    }) => {
      await openDailyWizard(page)
      await advanceDailyToCardio(page)

      const cardio =
        page.locator(
          '#daily-cardio-minutes',
        )

      await expect(cardio).toBeVisible()

      // Force the exact state that caused the UX issue.
      await cardio.fill('0')

      // Move focus away, then click back in so the real
      // DailyCheckInPage focus/select listener runs.
      // Blurring directly avoids depending on the question
      // text being rendered with a specific semantic role.
      await cardio.evaluate(
        (input) => input.blur(),
      )

      await cardio.click()
      await page.keyboard.type('25')

      // Desired behavior: typing replaces the selected
      // default zero rather than appending to it.
      await expect(cardio).toHaveValue(
        '25',
      )
    })
    test('Weekly Cardio default 0 is replaced by typing in Chromium', async ({
      page,
    }) => {
      await openWeeklyWizard(page)
      await advanceWeeklyToCardio(page)

      const cardio =
        page.locator(
          '#daily-cardio-minutes',
        )

      await expect(cardio).toBeVisible()
      await cardio.fill('0')

      await cardio.evaluate(
        (input) => input.blur(),
      )

      await cardio.click()

      // Give Weekly's requestAnimationFrame-based
      // selection handler one browser frame to run.
      await page.waitForTimeout(50)

      await page.keyboard.type('25')

      // This is the behavior that matters to the user:
      // clicking the default 0 should make typing replace
      // it, not append to it.
      await expect(cardio).toHaveValue(
        '25',
      )
    })


  },
)
