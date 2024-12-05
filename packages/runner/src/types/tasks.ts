import type { Awaitable, ErrorWithDiff } from '@vitest/utils'
import type { FixtureItem } from '../fixture'
import type { ChainableFunction } from '../utils/chain'

export type RunMode = 'run' | 'skip' | 'only' | 'todo'
export type TaskState = RunMode | 'pass' | 'fail'

export interface TaskBase {
  /**
   * Unique task identifier. Based on the file id and the position of the task.
   * The id of the file task is based on the file path relative to root and project name.
   * It will not change between runs.
   * @example `1201091390`, `1201091390_0`, `1201091390_0_1`
   */
  id: string
  /**
   * Task name provided by the user. If no name was provided, it will be an empty string.
   */
  name: string
  /**
   * Task mode.
   * - **skip**: task is skipped
   * - **only**: only this task and other tasks with `only` mode will run
   * - **todo**: task is marked as a todo, alias for `skip`
   * - **run**: task will run or already ran
   */
  mode: RunMode
  /**
   * Custom metadata for the task. JSON reporter will save this data.
   */
  meta: TaskMeta
  /**
   * Whether the task was produced with `.each()` method.
   */
  each?: boolean
  /**
   * Whether the task should run concurrently with other tasks.
   */
  concurrent?: boolean
  /**
   * Whether the tasks of the suite run in a random order.
   */
  shuffle?: boolean
  /**
   * Suite that this task is part of. File task or the global suite will have no parent.
   */
  suite?: Suite
  /**
   * Result of the task. Suite and file tasks will only have the result if there
   * was an error during collection or inside `afterAll`/`beforeAll`.
   */
  result?: TaskResult
  /**
   * The amount of times the task should be retried if it fails.
   * @default 0
   */
  retry?: number
  /**
   * The amount of times the task should be repeated after the successful run.
   * If the task fails, it will not be retried unless `retry` is specified.
   * @default 0
   */
  repeats?: number
  /**
   * Location of the task in the file. This field is populated only if
   * `includeTaskLocation` option is set. It is generated by calling `new Error`
   * and parsing the stack trace, so the location might differ depending on the runtime.
   */
  location?: {
    line: number
    column: number
  }
}

export interface TaskPopulated extends TaskBase {
  /**
   * File task. It's the root task of the file.
   */
  file: File
  /**
   * Whether the task was skipped by calling `t.skip()`.
   */
  pending?: boolean
  /**
   * Whether the task should succeed if it fails. If the task fails, it will be marked as passed.
   */
  fails?: boolean
  /**
   * Hooks that will run if the task fails. The order depends on the `sequence.hooks` option.
   */
  onFailed?: OnTestFailedHandler[]
  /**
   * Hooks that will run after the task finishes. The order depends on the `sequence.hooks` option.
   */
  onFinished?: OnTestFinishedHandler[]
  /**
   * Store promises (from async expects) to wait for them before finishing the test
   */
  promises?: Promise<any>[]
}

/**
 * Custom metadata that can be used in reporters.
 */
export interface TaskMeta {}

/**
 * The result of calling a task.
 */
export interface TaskResult {
  /**
   * State of the task. Inherits the `task.mode` during collection.
   * When the task has finished, it will be changed to `pass` or `fail`.
   * - **pass**: task ran successfully
   * - **fail**: task failed
   */
  state: TaskState
  /**
   * Errors that occurred during the task execution. It is possible to have several errors
   * if `expect.soft()` failed multiple times.
   */
  errors?: ErrorWithDiff[]
  /**
   * How long in milliseconds the task took to run.
   */
  duration?: number
  /**
   * Time in milliseconds when the task started running.
   */
  startTime?: number
  /**
   * Heap size in bytes after the task finished.
   * Only available if `logHeapUsage` option is set and `process.memoryUsage` is defined.
   */
  heap?: number
  /**
   * State of related to this task hooks. Useful during reporting.
   */
  hooks?: Partial<Record<keyof SuiteHooks, TaskState>>
  /**
   * The amount of times the task was retried. The task is retried only if it
   * failed and `retry` option is set.
   */
  retryCount?: number
  /**
   * The amount of times the task was repeated. The task is repeated only if
   * `repeats` option is set. This number also contains `retryCount`.
   */
  repeatCount?: number
  /** @private */
  note?: string
}

/**
 * The tuple representing a single task update.
 * Usually reported after the task finishes.
 */
export type TaskResultPack = [
  /**
   * Unique task identifier from `task.id`.
   */
  id: string,
  /**
   * The result of running the task from `task.result`.
   */
  result: TaskResult | undefined,
  /**
   * Custom metadata from `task.meta`.
   */
  meta: TaskMeta,
]

export interface Suite extends TaskBase {
  type: 'suite'
  /**
   * File task. It's the root task of the file.
   */
  file: File
  /**
   * An array of tasks that are part of the suite.
   */
  tasks: Task[]
}

export interface File extends Suite {
  /**
   * The name of the pool that the file belongs to.
   * @default 'forks'
   */
  pool?: string
  /**
   * The path to the file in UNIX format.
   */
  filepath: string
  /**
   * The name of the workspace project the file belongs to.
   */
  projectName: string | undefined
  /**
   * The time it took to collect all tests in the file.
   * This time also includes importing all the file dependencies.
   */
  collectDuration?: number
  /**
   * The time it took to import the setup file.
   */
  setupDuration?: number
  /**
   * Whether the file is initiated without running any tests.
   * This is done to populate state on the server side by Vitest.
   */
  local?: boolean
}

export interface Test<ExtraContext = object> extends TaskPopulated {
  type: 'test'
  /**
   * Test context that will be passed to the test function.
   */
  context: TaskContext<Test> & ExtraContext & TestContext
}

/**
 * @deprecated Use `Test` instead. `type: 'custom'` is not used since 2.2
 */
export type Custom<ExtraContext = object> = Test<ExtraContext>

export type Task = Test | Suite | File

/**
 * @deprecated Vitest doesn't provide `done()` anymore
 */
export type DoneCallback = (error?: any) => void
export type TestFunction<ExtraContext = object> = (
  context: ExtendedContext<Test> & ExtraContext
) => Awaitable<any> | void

// jest's ExtractEachCallbackArgs
type ExtractEachCallbackArgs<T extends ReadonlyArray<any>> = {
  1: [T[0]]
  2: [T[0], T[1]]
  3: [T[0], T[1], T[2]]
  4: [T[0], T[1], T[2], T[3]]
  5: [T[0], T[1], T[2], T[3], T[4]]
  6: [T[0], T[1], T[2], T[3], T[4], T[5]]
  7: [T[0], T[1], T[2], T[3], T[4], T[5], T[6]]
  8: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7]]
  9: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8]]
  10: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], T[9]]
  fallback: Array<T extends ReadonlyArray<infer U> ? U : any>
}[T extends Readonly<[any]>
  ? 1
  : T extends Readonly<[any, any]>
    ? 2
    : T extends Readonly<[any, any, any]>
      ? 3
      : T extends Readonly<[any, any, any, any]>
        ? 4
        : T extends Readonly<[any, any, any, any, any]>
          ? 5
          : T extends Readonly<[any, any, any, any, any, any]>
            ? 6
            : T extends Readonly<[any, any, any, any, any, any, any]>
              ? 7
              : T extends Readonly<[any, any, any, any, any, any, any, any]>
                ? 8
                : T extends Readonly<[any, any, any, any, any, any, any, any, any]>
                  ? 9
                  : T extends Readonly<[any, any, any, any, any, any, any, any, any, any]>
                    ? 10
                    : 'fallback']

interface EachFunctionReturn<T extends any[]> {
  /**
   * @deprecated Use options as the second argument instead
   */
  (
    name: string | Function,
    fn: (...args: T) => Awaitable<void>,
    options: TestCollectorOptions
  ): void
  (
    name: string | Function,
    fn: (...args: T) => Awaitable<void>,
    options?: number | TestCollectorOptions
  ): void
  (
    name: string | Function,
    options: TestCollectorOptions,
    fn: (...args: T) => Awaitable<void>
  ): void
}

interface TestEachFunction {
  <T extends any[] | [any]>(cases: ReadonlyArray<T>): EachFunctionReturn<T>
  <T extends ReadonlyArray<any>>(cases: ReadonlyArray<T>): EachFunctionReturn<
    ExtractEachCallbackArgs<T>
  >
  <T>(cases: ReadonlyArray<T>): EachFunctionReturn<T[]>
  (...args: [TemplateStringsArray, ...any]): EachFunctionReturn<any[]>
}

interface TestForFunctionReturn<Arg, Context> {
  (
    name: string | Function,
    fn: (arg: Arg, context: Context) => Awaitable<void>
  ): void
  (
    name: string | Function,
    options: TestCollectorOptions,
    fn: (args: Arg, context: Context) => Awaitable<void>
  ): void
}

interface TestForFunction<ExtraContext> {
  // test.for([1, 2, 3])
  // test.for([[1, 2], [3, 4, 5]])
  <T>(cases: ReadonlyArray<T>): TestForFunctionReturn<
    T,
    ExtendedContext<Test> & ExtraContext
  >

  // test.for`
  //    a  |  b
  //   {1} | {2}
  //   {3} | {4}
  // `
  (strings: TemplateStringsArray, ...values: any[]): TestForFunctionReturn<
    any,
    ExtendedContext<Test> & ExtraContext
  >
}

interface TestCollectorCallable<C = object> {
  /**
   * @deprecated Use options as the second argument instead
   */
  <ExtraContext extends C>(
    name: string | Function,
    fn: TestFunction<ExtraContext>,
    options: TestCollectorOptions
  ): void
  <ExtraContext extends C>(
    name: string | Function,
    fn?: TestFunction<ExtraContext>,
    options?: number | TestCollectorOptions
  ): void
  <ExtraContext extends C>(
    name: string | Function,
    options?: TestCollectorOptions,
    fn?: TestFunction<ExtraContext>
  ): void
}

type ChainableTestAPI<ExtraContext = object> = ChainableFunction<
  'concurrent' | 'sequential' | 'only' | 'skip' | 'todo' | 'fails',
  TestCollectorCallable<ExtraContext>,
  {
    each: TestEachFunction
    for: TestForFunction<ExtraContext>
  }
>

type TestCollectorOptions = Omit<TestOptions, 'shuffle'>

export interface TestOptions {
  /**
   * Test timeout.
   */
  timeout?: number
  /**
   * Times to retry the test if fails. Useful for making flaky tests more stable.
   * When retries is up, the last test error will be thrown.
   *
   * @default 0
   */
  retry?: number
  /**
   * How many times the test will run again.
   * Only inner tests will repeat if set on `describe()`, nested `describe()` will inherit parent's repeat by default.
   *
   * @default 0
   */
  repeats?: number
  /**
   * Whether suites and tests run concurrently.
   * Tests inherit `concurrent` from `describe()` and nested `describe()` will inherit from parent's `concurrent`.
   */
  concurrent?: boolean
  /**
   * Whether tests run sequentially.
   * Tests inherit `sequential` from `describe()` and nested `describe()` will inherit from parent's `sequential`.
   */
  sequential?: boolean
  /**
   * Whether the tasks of the suite run in a random order.
   */
  shuffle?: boolean
  /**
   * Whether the test should be skipped.
   */
  skip?: boolean
  /**
   * Should this test be the only one running in a suite.
   */
  only?: boolean
  /**
   * Whether the test should be skipped and marked as a todo.
   */
  todo?: boolean
  /**
   * Whether the test is expected to fail. If it does, the test will pass, otherwise it will fail.
   */
  fails?: boolean
}

interface ExtendedAPI<ExtraContext> {
  skipIf: (condition: any) => ChainableTestAPI<ExtraContext>
  runIf: (condition: any) => ChainableTestAPI<ExtraContext>
}

export type TestAPI<ExtraContext = object> = ChainableTestAPI<ExtraContext> &
  ExtendedAPI<ExtraContext> & {
    extend: <T extends Record<string, any> = object>(
      fixtures: Fixtures<T, ExtraContext>
    ) => TestAPI<{
      [K in keyof T | keyof ExtraContext]: K extends keyof T
        ? T[K]
        : K extends keyof ExtraContext
          ? ExtraContext[K]
          : never;
    }>
  }

/** @deprecated use `TestAPI` instead */
export type { TestAPI as CustomAPI }

export interface FixtureOptions {
  /**
   * Whether to automatically set up current fixture, even though it's not being used in tests.
   */
  auto?: boolean
}

export type Use<T> = (value: T) => Promise<void>
export type FixtureFn<T, K extends keyof T, ExtraContext> = (
  context: Omit<T, K> & ExtraContext,
  use: Use<T[K]>
) => Promise<void>
export type Fixture<T, K extends keyof T, ExtraContext = object> = ((
  ...args: any
) => any) extends T[K]
  ? T[K] extends any
    ? FixtureFn<T, K, Omit<ExtraContext, Exclude<keyof T, K>>>
    : never
  :
    | T[K]
    | (T[K] extends any
      ? FixtureFn<T, K, Omit<ExtraContext, Exclude<keyof T, K>>>
      : never)
export type Fixtures<T extends Record<string, any>, ExtraContext = object> = {
  [K in keyof T]:
    | Fixture<T, K, ExtraContext & ExtendedContext<Test>>
    | [Fixture<T, K, ExtraContext & ExtendedContext<Test>>, FixtureOptions?];
}

export type InferFixturesTypes<T> = T extends TestAPI<infer C> ? C : T

interface SuiteCollectorCallable<ExtraContext = object> {
  /**
   * @deprecated Use options as the second argument instead
   */
  <OverrideExtraContext extends ExtraContext = ExtraContext>(
    name: string | Function,
    fn: SuiteFactory<OverrideExtraContext>,
    options: TestOptions
  ): SuiteCollector<OverrideExtraContext>
  <OverrideExtraContext extends ExtraContext = ExtraContext>(
    name: string | Function,
    fn?: SuiteFactory<OverrideExtraContext>,
    options?: number | TestOptions
  ): SuiteCollector<OverrideExtraContext>
  <OverrideExtraContext extends ExtraContext = ExtraContext>(
    name: string | Function,
    options: TestOptions,
    fn?: SuiteFactory<OverrideExtraContext>
  ): SuiteCollector<OverrideExtraContext>
}

type ChainableSuiteAPI<ExtraContext = object> = ChainableFunction<
  'concurrent' | 'sequential' | 'only' | 'skip' | 'todo' | 'shuffle',
  SuiteCollectorCallable<ExtraContext>,
  {
    each: TestEachFunction
  }
>

export type SuiteAPI<ExtraContext = object> = ChainableSuiteAPI<ExtraContext> & {
  skipIf: (condition: any) => ChainableSuiteAPI<ExtraContext>
  runIf: (condition: any) => ChainableSuiteAPI<ExtraContext>
}

/**
 * @deprecated
 */
export type HookListener<T extends any[], Return = void> = (
  ...args: T
) => Awaitable<Return>

/**
 * @deprecated
 */
export type HookCleanupCallback = unknown

export interface BeforeAllListener {
  (suite: Readonly<Suite | File>): Awaitable<unknown>
}

export interface AfterAllListener {
  (suite: Readonly<Suite | File>): Awaitable<unknown>
}

export interface BeforeEachListener<ExtraContext = object> {
  (
    context: ExtendedContext<Test> & ExtraContext,
    suite: Readonly<Suite>
  ): Awaitable<unknown>
}

export interface AfterEachListener<ExtraContext = object> {
  (
    context: ExtendedContext<Test> & ExtraContext,
    suite: Readonly<Suite>
  ): Awaitable<unknown>
}

export interface SuiteHooks<ExtraContext = object> {
  beforeAll: BeforeAllListener[]
  afterAll: AfterAllListener[]
  beforeEach: BeforeEachListener<ExtraContext>[]
  afterEach: AfterEachListener<ExtraContext>[]
}

export interface TaskCustomOptions extends TestOptions {
  /**
   * Whether the task was produced with `.each()` method.
   */
  each?: boolean
  /**
   * Custom metadata for the task that will be assigned to `task.meta`.
   */
  meta?: Record<string, unknown>
  /**
   * Task fixtures.
   */
  fixtures?: FixtureItem[]
  /**
   * Function that will be called when the task is executed.
   * If nothing is provided, the runner will try to get the function using `getFn(task)`.
   * If the runner cannot find the function, the task will be marked as failed.
   */
  handler?: (context: TaskContext<Test>) => Awaitable<void>
}

export interface SuiteCollector<ExtraContext = object> {
  readonly name: string
  readonly mode: RunMode
  options?: TestOptions
  type: 'collector'
  test: TestAPI<ExtraContext>
  tasks: (
    | Suite
    | Test<ExtraContext>
    | SuiteCollector<ExtraContext>
  )[]
  task: (name: string, options?: TaskCustomOptions) => Test<ExtraContext>
  collect: (file: File) => Promise<Suite>
  clear: () => void
  on: <T extends keyof SuiteHooks<ExtraContext>>(
    name: T,
    ...fn: SuiteHooks<ExtraContext>[T]
  ) => void
}

export type SuiteFactory<ExtraContext = object> = (
  test: TestAPI<ExtraContext>
) => Awaitable<void>

export interface RuntimeContext {
  tasks: (SuiteCollector | Test)[]
  currentSuite: SuiteCollector | null
}

/**
 * User's custom test context.
 */
export interface TestContext {}

/**
 * Context that's always available in the test function.
 */
export interface TaskContext<Task extends Test = Test> {
  /**
   * Metadata of the current test
   */
  task: Readonly<Task>

  /**
   * Extract hooks on test failed
   */
  onTestFailed: (fn: OnTestFailedHandler) => void

  /**
   * Extract hooks on test failed
   */
  onTestFinished: (fn: OnTestFinishedHandler) => void

  /**
   * Mark tests as skipped. All execution after this call will be skipped.
   * This function throws an error, so make sure you are not catching it accidentally.
   */
  skip: (note?: string) => void
}

export type ExtendedContext<T extends Test> = TaskContext<T> &
  TestContext

export type OnTestFailedHandler = (result: TaskResult) => Awaitable<void>
export type OnTestFinishedHandler = (result: TaskResult) => Awaitable<void>

export interface TaskHook<HookListener> {
  (fn: HookListener, timeout?: number): void
}

export type SequenceHooks = 'stack' | 'list' | 'parallel'
export type SequenceSetupFiles = 'list' | 'parallel'
