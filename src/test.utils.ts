export type AssertEqual<T, Expected> = [T] extends [Expected]
  ? [Expected] extends [T]
    ? true
    : false
  : false;

export const assertType = <T, Expected>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ..._: AssertEqual<T, Expected> extends true ? [] : ["invalid type"]
) => {
  // noop
};
