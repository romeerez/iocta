import {
  Deps,
  InjectError,
  Iocta,
  ServiceFn,
  ServiceFns,
  Module,
  Imports,
} from "./module";

type LoadingModules = Map<Module, LoadingModule>;

interface LoadingModule {
  [serviceName: string]: unknown;
}

interface UnresolvedImport {
  module: Module;
  moduleName: string;
  key: string;
  import: {
    from: Module;
    key: string;
  };
}

interface UnresolvedService {
  module: Module;
  moduleName: string;
  key: string;
  serviceFn: ServiceFn;
  deps: Deps;
}

type Unresolved = UnresolvedImport | UnresolvedService;

type ModulesExports = Map<
  Module,
  {
    moduleName?: string;
    exportFns: ServiceFns;
    exports: { [K: string]: unknown };
  }
>;

export function runModules<
  Modules extends {
    [moduleName: string]: Iocta.Module<Iocta.None, Iocta.None, Iocta.None>;
  },
>(
  modules: Modules,
): Iocta.Bundle<{
  [ModuleName in keyof Modules]: Modules[ModuleName]["_exports"] extends () => infer Exports
    ? {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [ExportKey in keyof Exports]: Exports[ExportKey] extends (
          arg: any,
        ) => infer Service
          ? Service
          : never;
      }
    : never;
}> {
  const loadingModules: LoadingModules = new Map();
  let unresolved: Unresolved[] = [];

  const modulesExports: ModulesExports = new Map();

  for (const moduleName in modules) {
    const module = modules[moduleName];
    collectUnresolvedFromModule(
      loadingModules,
      unresolved,
      modulesExports,
      module,
      moduleName,
      false,
    );
  }

  while (unresolved.length) {
    let nextUnresolved: Unresolved[] = [];
    for (const item of unresolved) {
      const module = loadingModules.get(item.module) as LoadingModule;
      if ("deps" in item) {
        let satisfied = true;
        for (const depKey in item.deps) {
          if (!(depKey in module)) {
            satisfied = false;
            break;
          }
        }

        if (satisfied) {
          const arg: { [K: string]: unknown } = {};
          for (const depKey in item.deps) {
            arg[depKey] = module[depKey];
          }
          module[item.key] = item.serviceFn(arg);
        } else {
          nextUnresolved.push(item);
        }
      } else {
        const fromModule = loadingModules.get(item.import.from);
        if (fromModule && item.import.key in fromModule) {
          module[item.key] = fromModule[item.import.key];
        } else {
          nextUnresolved.push(item);
        }
      }
    }
    if (unresolved.length === nextUnresolved.length) {
      throw new Error(
        `Cannot resolve: ${nextUnresolved
          .map(({ moduleName, key }) => `${moduleName}.${key}`)
          .join(", ")}`,
      );
    }
    unresolved = nextUnresolved;
  }

  const result: { [K: string]: { [K: string]: unknown } } = {};

  for (const [module, { moduleName, exportFns, exports }] of modulesExports) {
    if (!moduleName) {
      continue;
    }

    const services = loadingModules.get(module) as LoadingModule;

    for (const key in exportFns) {
      if (key in exports) continue;

      exports[key] = services[key];
    }

    result[moduleName] = exports;
  }

  runOrStop(loadingModules, "run");

  return {
    modules: result as never,
    stop() {
      runOrStop(loadingModules, "stop");
    },
  };
}

function collectUnresolvedFromModule(
  loadingModules: LoadingModules,
  unresolved: Unresolved[],
  modulesExports: ModulesExports,
  module: Module,
  moduleName: string,
  anonymous: boolean,
) {
  let loadingModule = loadingModules.get(module);
  if (loadingModule) {
    if (!anonymous) {
      const exports = modulesExports.get(module);
      if (exports) {
        exports.moduleName = moduleName;
      }
    }
    return;
  }
  loadingModule = {};
  loadingModules.set(module, loadingModule);

  if (module._imports) {
    const imports = module._imports() as Imports;
    for (const key in imports) {
      const item = imports[key];
      unresolved.push({
        module,
        moduleName,
        key,
        import: item,
        serviceFn: () => {
          console.log("todo");
          return {};
        },
      });
      collectUnresolvedFromModule(
        loadingModules,
        unresolved,
        modulesExports,
        item.from,
        `moduleName.${key}`,
        true,
      );
    }
  }

  if (module._internal) {
    const internalFns = module._internal() as ServiceFns;
    for (const key in internalFns) {
      const serviceFn = internalFns[key];
      const result = buildService(serviceFn);
      if ("resolved" in result) {
        loadingModule[key] = result.resolved;
      } else {
        unresolved.push({
          module,
          moduleName,
          key,
          serviceFn,
          deps: result.deps,
        });
      }
    }
  }

  if (module._exports) {
    const exportFns = module._exports() as ServiceFns;
    const exports: { [K: string]: unknown } = {};
    modulesExports.set(module, {
      moduleName: anonymous ? undefined : moduleName,
      exportFns,
      exports,
    });

    for (const key in exportFns) {
      const serviceFn = exportFns[key];
      const result = buildService(serviceFn);
      if ("resolved" in result) {
        exports[key] = loadingModule[key] = result.resolved;
      } else {
        unresolved.push({
          module,
          moduleName,
          key,
          serviceFn,
          deps: result.deps,
        });
      }
    }
  }
}

// eslint-disable-next-line @typescript/eslint-no-explicit-any
function buildService(fn: (arg: any) => unknown) {
  try {
    return { resolved: fn(undefined as never) };
  } catch (err) {
    if (err instanceof InjectError) {
      return err;
    }
    throw err;
  }
}

function runOrStop(loadingModules: LoadingModules, key: "run" | "stop") {
  for (const [module, loadingModule] of loadingModules) {
    if (!module[key]) continue;

    const item = buildService(module[key]);
    if ("deps" in item) {
      const arg: { [K: string]: unknown } = {};
      for (const depKey in item.deps) {
        arg[depKey] = loadingModule[depKey];
      }
      module[key](arg);
    }
  }
}
