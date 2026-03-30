---
name: pest-debug
description: >
  Use this skill when debugging failing Pest PHP tests. Trigger whenever Claude
  encounters a Pest test failure it cannot immediately fix, is unsure why a test
  is failing, has already attempted a fix that didn't work, or needs to understand
  what values variables actually hold at runtime. This skill teaches a disciplined
  dump → analyze → remove → fix loop instead of guessing or making multiple blind
  code changes. Use it any time the words "pest", "phpunit", "test failing", "test
  error", or "dd()" appear in context, or when Claude would otherwise be tempted
  to flail through multiple speculative fixes.
---

# Pest PHP Debug Skill

## Core philosophy

When a Pest test fails and the cause isn't immediately obvious, **stop guessing**.
Instead, use a disciplined dump loop to observe real runtime values, then fix
from evidence.

**Never** make multiple speculative code changes in a row without running the
tests in between. **Never** leave dump statements in the code when you're done.

---

## The debug loop

```
1. Identify the failure point
2. Add a targeted dump
3. Run the test and read the output
4. Remove the dump
5. Fix the code based on what you learned
6. Run the test again to confirm
7. If still failing, repeat from step 1
```

---

## Step 1 — Identify the failure point

Before adding any dump, read the failure output carefully:

- What line is the assertion on?
- What was expected vs. what was received?
- Is it an exception? A wrong value? A null?
- Which part of the code feeds that assertion?

Pick **one specific variable or expression** to investigate. Don't dump
everything — targeted dumps give cleaner signal.

---

## Step 2 — Add a targeted dump

Pest uses Laravel's `dd()` ("dump and die") and `dump()` helpers.

### `dump()` — prints and continues
Use when you want to see a value but keep the test running:
```php
dump($variable);
```

### `dd()` — prints and stops execution
Use when you want to halt immediately and inspect:
```php
dd($variable);
```

### `ray()` — if Ray is installed
If the project uses Spatie Ray, prefer it for complex objects:
```php
ray($variable);
```

### Placement rules

| Situation | Where to dump |
|-----------|--------------|
| Wrong value in assertion | Dump the variable just before the assertion |
| Unexpected null | Dump the return value of the call that should produce it |
| Wrong DB state | Dump the model after the action that should change it |
| Exception thrown | Dump inputs going into the method that throws |
| Collection mismatch | Dump `->toArray()` on the collection |

**One dump at a time.** Multiple simultaneous dumps create confusing output.

### Example
```php
it('creates an invoice with the correct total', function () {
    $order = Order::factory()->create(['amount' => 100]);

    $invoice = InvoiceService::createFrom($order);

    dump($invoice->total); // ← targeted: what is total actually?

    expect($invoice->total)->toBe(100);
});
```

---

## Step 3 — Run the test and read the output

Run only the failing test, not the whole suite:

```bash
./vendor/bin/pest --filter "test name"
# or
./vendor/bin/pest tests/Path/To/TestFile.php
```

Read the dump output carefully:
- Is the value what you expected?
- Is it null when it shouldn't be?
- Is it the wrong type (e.g., string `"100"` instead of int `100`)?
- Is it a collection with wrong items?

---

## Step 4 — Remove the dump

**Before writing any fix**, remove the dump statement you just added.

This is not optional. Dumps left in code:
- Pollute test output for the whole team
- Can cause `dd()` to halt tests in CI
- Are easy to forget under time pressure

Delete the line. Confirm it's gone. Then proceed to the fix.

---

## Step 5 — Fix the code

Now fix based on evidence, not guessing. Common patterns:

| What the dump revealed | Likely fix |
|------------------------|-----------|
| Value is null | The relationship wasn't loaded — add `->load()` or eager load |
| Wrong type (string vs int) | Cast in the model or use `(int)` |
| Collection is empty | The query has a wrong `where` clause |
| Value is correct but assertion fails | The assertion format is wrong, not the code |
| Exception input looks wrong | The caller is passing bad data |

---

## Step 6 — Confirm the fix

Run the test again after removing the dump and applying the fix:

```bash
./vendor/bin/pest --filter "test name"
```

If it passes, run the broader suite to check for regressions:

```bash
./vendor/bin/pest
```

---

## Step 7 — If still failing, repeat

Go back to step 1. Pick a different (or deeper) variable to dump. Don't add
multiple dumps at once — stay disciplined.

If after 3 iterations you're still stuck, consider:
- Dumping earlier in the call stack (closer to where data is created)
- Dumping inside the service/model method itself, not just in the test
- Using `dd()` instead of `dump()` to stop execution earlier and avoid noise

---

## Common Pest-specific gotchas

**Datasets**: When using `->with()` datasets, dump inside the closure to see
which dataset case is failing:
```php
it('handles all amounts', function ($amount, $expected) {
    dump(['amount' => $amount, 'expected' => $expected]);
    // ...
})->with([
    [100, 'paid'],
    [0,   'free'],
]);
```

**Hooks**: If a `beforeEach` or `afterEach` is mutating state, dump there too —
the failure may not be in the test itself.

**Factories**: If a factory-created model looks wrong, dump it right after
creation:
```php
$user = User::factory()->create();
dump($user->toArray());
```

---

## Cleanup checklist

Before declaring the test fixed, verify:

- [ ] No `dump()` calls left in test files
- [ ] No `dd()` calls left in test files or source files
- [ ] No `ray()` debugging calls left (unless ray was there before you started)
- [ ] Tests pass: `./vendor/bin/pest`
- [ ] No new test failures introduced

If you added dumps inside source files (not test files) during debugging,
those **must** also be removed.