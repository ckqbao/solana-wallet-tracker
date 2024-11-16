type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T]

export type FunctionsOnly<T> = Pick<T, FunctionKeys<T>>
