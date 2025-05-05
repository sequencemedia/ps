export interface ProcessDescriptor {
  readonly pid: number
  readonly ppid: number
  readonly uid: number
  readonly cpu: number
  readonly mem: number
  readonly cmd: string
  readonly name: string
}

/**
 *  Get a list of running processes.
 *
 *  @returns A list of running processes.
 *  @example
 *  ```
 *  import ps from '@sequencemedia/ps'
 *
 *  console.log(await ps())
 *  //=> [{ pid: 3213, ppid: 1, uid: 501, cpu: 0.1, mem: 1.5, cmd: 'node test.js', name: 'node' }, …]
 *  ```
 */
export default function ps (): Promise<ProcessDescriptor[]>
