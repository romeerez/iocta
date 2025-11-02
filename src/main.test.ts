import { defineModule } from "./module";
import { runModules } from "./run";

test("empty module should not go to the bundle", () => {
  const moduleName = defineModule({});

  const bundle = runModules({ moduleName });

  expect(bundle.modules).toEqual({});
});

test("exported functionality is available in the bundle", () => {
  const moduleName = defineModule({
    exports: () => ({
      exportValue: () => "value",
      exportObject: () => ({ key: "value" }),
    }),
  });

  const bundle = runModules({ moduleName });

  expect(bundle.modules).toEqual({
    moduleName: {
      exportValue: "value",
      exportObject: { key: "value" },
    },
  });
});

test("exported service can inject other exports", () => {
  const moduleName = defineModule({
    exports: () => ({
      first,
      second: () => "second value",
      third,
      fourth: () => "fourth value",
      fifth,
      sixth: () => ({ one: 1, two: 2 }),
    }),
  });

  const first = ({ second } = moduleName.inject("second")): string =>
    `first -> ${second}`;

  const third = (
    { fourth } = moduleName.injectPick({ fourth: true }),
  ): string => `third -> ${fourth}`;

  const fifth = (
    { sixth } = moduleName.injectPick({ sixth: ["two"] }),
  ): string => `fifth -> ${sixth.two}`;

  const bundle = runModules({ moduleName });

  expect(bundle.modules).toEqual({
    moduleName: {
      first: "first -> second value",
      second: "second value",
      third: "third -> fourth value",
      fourth: "fourth value",
      fifth: "fifth -> 2",
      sixth: { one: 1, two: 2 },
    },
  });
});

test("exported service can depend on internal service", () => {
  const moduleName = defineModule({
    internal: () => ({
      internalValue: () => "internal value",
      internalObject: () => ({ one: 1, two: 2 }),
    }),
    exports: () => ({
      firstExport,
      secondExport,
    }),
  });

  const firstExport = (
    { internalValue, internalObject } = moduleName.inject(
      "internalValue",
      "internalObject",
    ),
  ): { value: string; object: { one: number; two: number } } => {
    return {
      value: internalValue,
      object: internalObject,
    };
  };

  const secondExport = (
    { internalValue, internalObject } = moduleName.injectPick({
      internalValue: true,
      internalObject: ["two"],
    }),
  ): { value: string; object: number } => {
    return {
      value: internalValue,
      object: internalObject.two,
    };
  };

  const bundle = runModules({ moduleName });

  expect(bundle.modules).toEqual({
    moduleName: {
      firstExport: {
        value: "internal value",
        object: { one: 1, two: 2 },
      },
      secondExport: {
        value: "internal value",
        object: 2,
      },
    },
  });
});

test("one internal can use values from another internal", () => {
  const moduleName = defineModule({
    internal: () => ({
      firstInternal,
      secondInternal,
      thirdInternal,
      fourthInternal,
    }),
    exports: () => ({
      firstExport,
      secondExport,
    }),
  });

  const firstInternal = (): string => "first internal";

  const secondInternal = (): { one: number; two: number } => ({
    one: 1,
    two: 2,
  });

  const thirdInternal = (
    { firstInternal, secondInternal } = moduleName.inject(
      "firstInternal",
      "secondInternal",
    ),
  ) => ({
    value: firstInternal,
    object: secondInternal,
  });

  const fourthInternal = (
    { firstInternal, secondInternal } = moduleName.injectPick({
      firstInternal: true,
      secondInternal: ["two"],
    }),
  ): { value: string; object: number } => ({
    value: firstInternal,
    object: secondInternal.two,
  });

  const firstExport = (
    { thirdInternal } = moduleName.inject("thirdInternal"),
  ): { value: string; object: { one: number; two: number } } => thirdInternal;

  const secondExport = (
    { fourthInternal } = moduleName.injectPick({
      fourthInternal: ["value", "object"],
    }),
  ): { value: string; object: number } => fourthInternal;

  const bundle = runModules({ moduleName });

  expect(bundle.modules).toEqual({
    moduleName: {
      firstExport: {
        value: "first internal",
        object: { one: 1, two: 2 },
      },
      secondExport: {
        value: "first internal",
        object: 2,
      },
    },
  });
});

test("internal can use exported", () => {
  const moduleName = defineModule({
    internal: () => ({
      firstInternal,
      secondInternal,
    }),
    exports: () => ({
      exportValue: () => "exported value",
      exportObject: () => ({ one: 1, two: 2 }),
      exportInternal,
    }),
  });

  const firstInternal = (
    { exportValue, exportObject } = moduleName.inject(
      "exportValue",
      "exportObject",
    ),
  ): { value: string; object: number } => {
    return {
      value: exportValue,
      object: exportObject.two,
    };
  };

  const secondInternal = (
    { exportValue, exportObject } = moduleName.injectPick({
      exportValue: true,
      exportObject: ["two"],
    }),
  ): { value: string; object: number } => {
    return {
      value: exportValue,
      object: exportObject.two,
    };
  };

  const exportInternal = (
    { firstInternal, secondInternal } = moduleName.inject(
      "firstInternal",
      "secondInternal",
    ),
  ) => ({ firstInternal, secondInternal });

  const bundle = runModules({ moduleName });

  expect(bundle.modules).toEqual({
    moduleName: {
      exportInternal: {
        firstInternal: {
          object: 2,
          value: "exported value",
        },
        secondInternal: {
          object: 2,
          value: "exported value",
        },
      },
      exportObject: {
        one: 1,
        two: 2,
      },
      exportValue: "exported value",
    },
  });
});

test("one module can import exported services from another module", () => {
  const firstModule = defineModule({
    exports: () => ({
      firstValue: () => "first value",
      firstObject: () => ({ one: 1, two: 2 }),
    }),
  });

  const secondModule = defineModule({
    exports: () => ({
      secondValue: () => "second value",
      secondObject: () => ({ three: 3, four: 4 }),
    }),
  });

  const thirdModule = defineModule({
    imports: () => ({
      ...firstModule.import("firstValue", "firstObject"),
      ...secondModule.importPick({ secondValue: true, secondObject: ["four"] }),
    }),
    exports: () => ({
      firstExport,
      secondExport,
    }),
  });

  const firstExport = (
    { firstValue, firstObject } = thirdModule.inject(
      "firstValue",
      "firstObject",
    ),
  ) => {
    return {
      firstValue,
      firstObject,
    };
  };

  const secondExport = (
    { secondValue, secondObject } = thirdModule.injectPick({
      secondValue: true,
      secondObject: ["four"],
    }),
  ) => {
    return {
      secondValue,
      secondObject: secondObject.four,
    };
  };

  const bundle = runModules({ firstModule, thirdModule });
  const reverseBundle = runModules({ thirdModule, firstModule });

  const expected = {
    firstModule: {
      firstValue: "first value",
      firstObject: { one: 1, two: 2 },
    },
    thirdModule: {
      firstExport: {
        firstValue: "first value",
        firstObject: { one: 1, two: 2 },
      },
      secondExport: {
        secondValue: "second value",
        secondObject: 4,
      },
    },
  };

  expect(bundle.modules).toEqual(expected);
  expect(reverseBundle.modules).toEqual(expected);
});

test("modules can import from each other", () => {
  const firstModule = defineModule({
    imports: () => ({
      ...secondModule.import("thirdService"),
      ...thirdModule.importPick({ fourthService: ["two"] }),
    }),
    exports: () => ({
      firstService,
      secondService,
    }),
  });

  const firstService = (
    { thirdService } = firstModule.inject("thirdService"),
  ): string => `first -> ${thirdService}`;

  const secondService = (
    { fourthService } = firstModule.injectPick({ fourthService: ["two"] }),
  ): string => `second -> ${fourthService.two}`;

  const secondModule = defineModule({
    imports: () => ({
      ...firstModule.import("firstService"),
      ...firstModule.importPick({ secondService: true }),
    }),
    exports: () => ({
      thirdService,
      fifthService,
    }),
  });

  const thirdModule = defineModule({
    exports: () => ({
      fourthService,
    }),
  });

  const thirdService = (): string => "third";

  const fourthService = (): { one: number; two: number } => ({
    one: 1,
    two: 2,
  });

  const fifthService = (
    { firstService } = secondModule.inject("firstService"),
  ): string => `fifth -> ${firstService}`;

  const bundle = runModules({ firstModule, secondModule });

  expect(bundle.modules).toEqual({
    firstModule: {
      firstService: "first -> third",
      secondService: "second -> 2",
    },
    secondModule: {
      fifthService: "fifth -> first -> third",
      thirdService: "third",
    },
  });
});

test("modules can be resolved even when not explicitly specified in runModules", () => {
  const firstModule = defineModule({
    exports: () => ({
      firstExport: () => "first",
      secondExport: () => "second",
      thirdExport: () => ({ one: 1, two: 2 }),
    }),
  });

  const secondModule = defineModule({
    imports: () => ({
      ...firstModule.import("firstExport"),
      ...firstModule.importPick({ secondExport: true, thirdExport: ["two"] }),
    }),
    exports: () => ({
      fourthExport,
    }),
  });

  const fourthExport = (
    deps = secondModule.inject("firstExport", "secondExport", "thirdExport"),
  ) => deps;

  const bundle = runModules({ secondModule });

  expect(bundle.modules).toEqual({
    secondModule: {
      fourthExport: {
        firstExport: "first",
        secondExport: "second",
        thirdExport: {
          one: 1,
          two: 2,
        },
      },
    },
  });
});

test("runModules should call run on all referenced modules including anonymous", async () => {
  let firstDeps: unknown;
  let secondDeps: unknown;

  const firstModule = defineModule({
    internal: () => ({
      firstInternal: (): string => "first internal",
    }),
    exports: () => ({
      firstService: (): string => "first export",
    }),
    run(deps = firstModule.inject("firstInternal", "firstService")) {
      firstDeps = deps;
    },
  });

  const secondModule = defineModule({
    imports: () => ({
      secondImport: firstModule.import("firstService").firstService,
    }),
    internal: () => ({
      secondInternal: (): string => "second internal",
    }),
    exports: () => ({
      secondExport: (): string => "second export",
    }),
    run(
      deps = secondModule.inject(
        "secondImport",
        "secondInternal",
        "secondExport",
      ),
    ) {
      secondDeps = deps;
    },
  });

  runModules({ secondModule });

  expect(firstDeps).toEqual({
    firstInternal: "first internal",
    firstService: "first export",
  });

  expect(secondDeps).toEqual({
    secondImport: "first export",
    secondInternal: "second internal",
    secondExport: "second export",
  });
});

test("stop should propagate to all modules including anonymous", async () => {
  let firstDeps: unknown;
  let secondDeps: unknown;

  const firstModule = defineModule({
    internal: () => ({
      firstInternal: (): string => "first internal",
    }),
    exports: () => ({
      firstService: (): string => "first export",
    }),
    stop(deps = firstModule.inject("firstInternal", "firstService")) {
      firstDeps = deps;
    },
  });

  const secondModule = defineModule({
    imports: () => ({
      secondImport: firstModule.import("firstService").firstService,
    }),
    internal: () => ({
      secondInternal: (): string => "second internal",
    }),
    exports: () => ({
      secondExport: (): string => "second export",
    }),
    stop(
      deps = secondModule.inject(
        "secondImport",
        "secondInternal",
        "secondExport",
      ),
    ) {
      secondDeps = deps;
    },
  });

  const { stop } = runModules({ secondModule });

  expect(firstDeps).toBe(undefined);
  expect(secondDeps).toBe(undefined);

  stop();

  expect(firstDeps).toEqual({
    firstInternal: "first internal",
    firstService: "first export",
  });

  expect(secondDeps).toEqual({
    secondImport: "first export",
    secondInternal: "second internal",
    secondExport: "second export",
  });
});
