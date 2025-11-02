// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Iocta {
  export interface Bundle<Modules> {
    modules: Modules;
    stop(): void;
  }

  export interface Module<Imports, Internal, Exports> {
    _imports: Imports;
    _internal: Internal;
    _exports: Exports;

    import<Exports, Keys extends keyof Exports>(
      this: {
        _exports: () => Exports;
      },
      ...keys: Keys[]
    ): {
      [K in Keys & keyof Exports]-?: Exports[K] extends (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arg: any,
      ) => infer R
        ? R
        : never;
    };

    importPick<
      Exports,
      Pick extends {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [K in keyof Exports]?: Exports[K] extends (arg: any) => infer R
          ? (keyof R)[] | true
          : never;
      },
    >(
      this: {
        _exports: () => Exports;
      },
      ...pick: Pick[]
    ): {
      [K in keyof Pick & keyof Exports]-?: Exports[K] extends (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arg: any,
      ) => infer R
        ? Pick[K] extends true
          ? R
          : {
              [P in (Pick[K] & (keyof R)[])[number] & string]: R[P];
            }
        : never;
    };

    inject<
      Imports,
      Internal,
      Exports,
      const Keys extends keyof Internal | keyof Imports | keyof Exports,
    >(
      this: {
        _imports: () => Imports;
        _internal: () => Internal;
        _exports: () => Exports;
      },
      ...keys: Keys[]
    ): {
      [K in Keys]-?: K extends keyof Internal
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Internal[K] extends (arg: any) => infer R
          ? R
          : never
        : K extends keyof Imports
          ? Imports[K]
          : K extends keyof Exports
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Exports[K] extends (arg: any) => infer R
              ? R
              : never
            : never;
    };

    injectPick<
      Imports,
      Internal,
      Exports,
      const Pick extends {
        [K in
          | keyof Internal
          | keyof Imports
          | keyof Exports]?: K extends keyof Internal
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Internal[K] extends (arg: any) => infer R
            ? (keyof R)[] | true
            : never
          : K extends keyof Imports
            ? (keyof Imports[K])[] | true
            : K extends keyof Exports
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Exports[K] extends (arg: any) => infer R
                ? (keyof R)[] | true
                : never
              : never;
      },
    >(
      this: {
        _imports: () => Imports;
        _internal: () => Internal;
        _exports: () => Exports;
      },
      pick: Pick,
    ): {
      [K in keyof Pick]-?: K extends keyof Internal
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Internal[K] extends (arg: any) => infer R
          ? Pick[K] extends true
            ? R
            : {
                [P in (Pick[K] & (keyof R)[])[number] & string]: R[P];
              }
          : never
        : K extends keyof Imports
          ? Pick[K] extends true
            ? Imports[K]
            : {
                [P in (Pick[K] & (keyof Imports[K])[])[number] &
                  string]: Imports[K][P];
              }
          : K extends keyof Exports
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Exports[K] extends (arg: any) => infer R
              ? Pick[K] extends true
                ? R
                : {
                    [P in (Pick[K] & (keyof R)[])[number] & string]: R[P];
                  }
              : never
            : never;
    };
  }

  export interface None {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    (): {};
  }

  export interface RunOrStop {
    (arg: any): void;
  }
}

export interface Module {
  _imports: ImportsThunk;
  _internal: ServiceFnsThunk;
  _exports: ServiceFnsThunk;
  run?: Iocta.RunOrStop;
  stop?: Iocta.RunOrStop;
}

export interface ServiceFnsThunk {
  (): ServiceFns;
}

export interface ServiceFns {
  [K: string]: ServiceFn;
}

export interface ServiceFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (arg: any): Service;
}

export interface Service {
  [K: string]: unknown;
}

export interface Deps {
  [K: string]: string[] | true;
}

export interface ImportsThunk {
  (): Imports;
}

export interface Imports {
  [K: string]: Import;
}

export interface Import {
  from: Module;
  key: string;
}

export class InjectError extends Error {
  // TODO: remove module
  constructor(
    public module: Module,
    public deps: Deps,
  ) {
    super("Cannot inject outside modules");
  }
}

class IoctaModule {
  constructor(
    public _imports: ImportsThunk,
    public _internal: ServiceFnsThunk,
    public _exports: ServiceFnsThunk,
    public run?: Iocta.RunOrStop,
    public stop?: Iocta.RunOrStop,
  ) {}

  import(...keys: string[]) {
    const result: Imports = {};
    for (const key of keys) {
      result[key] = {
        from: this,
        key,
      };
    }
    return result;
  }

  importPick(pick: Deps) {
    const result: Imports = {};
    for (const key in pick) {
      result[key] = {
        from: this,
        key,
      };
    }
    return result;
  }

  inject(...keys: string[]) {
    throw new InjectError(
      this,
      Object.fromEntries(keys.map((key) => [key, true])),
    );
  }

  injectPick(pick: Deps) {
    throw new InjectError(this, pick);
  }
}

export function defineModule<Imports, Internal, Exports, Run, Stop>(arg: {
  imports?: Imports;
  internal?: Internal;
  exports?: Exports;
  run?: Run;
  stop?: Stop;
}): (
  (Run extends Function | undefined ? true : never) | unknown extends
    | Run
    | undefined
    ? true
    : never
) extends true
  ? (
      (Stop extends Function | undefined ? true : never) | unknown extends
        | Stop
        | undefined
        ? true
        : never
    ) extends true
    ? Iocta.Module<
        unknown extends Imports ? Iocta.None : Imports,
        unknown extends Internal ? Iocta.None : Internal,
        unknown extends Exports ? Iocta.None : Exports
      >
    : '"stop" is not a function'
  : '"run" is not a function' {
  return new IoctaModule(
    arg.imports as ImportsThunk,
    arg.internal as ServiceFnsThunk,
    arg.exports as ServiceFnsThunk,
    arg.run as Iocta.RunOrStop,
    arg.stop as Iocta.RunOrStop,
  ) as never;
}
