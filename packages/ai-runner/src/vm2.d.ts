declare module 'vm2' {
  export class VM {
    constructor(options?: {
      timeout?: number;
      sandbox?: any;
      compiler?: string;
    });
    run(code: string): any;
  }
}