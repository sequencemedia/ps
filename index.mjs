/**
 *  @typedef {{ pid: number, out: string, err: string }} ArgsType
 *  @typedef {{ pid: number, out: string, err: string }} DataType
 */
import {
  execFile
} from 'node:child_process'

import {
  basename
} from 'node:path'

const OPTIONS = {
  maxBuffer: Infinity
}

const PATTERN = /^[ \t]*(?<pid>\d+)[ \t]+(?<ppid>\d+)[ \t]+(?<uid>[-\d]+)[ \t]+(?<cpu>\d+\.\d+)[ \t]+(?<mem>\d+\.\d+)[ \t]+(?<comm>.*)?/
const LF = '\n'
const WS = String.fromCodePoint(32)

/**
 *  @returns {Promise<ArgsType>}
 */
function getArgs () {
  return (
    new Promise((resolve, reject) => {
      /**
       *  @param {Error} [e]
       *  @param {string} [out]
       *  @returns {void}
       */
      function complete (e, out = '', err = '') {
        return (!e) ? resolve({ pid, out, err }) : reject(e)
      }

      const {
        pid
      } = execFile('ps', ['awwxo', 'pid,args'], OPTIONS, complete)
    })
  )
}

/**
 *  @returns {Promise<DataType>}
 */
function getData () {
  return (
    new Promise((resolve, reject) => {
      /**
       *  @param {Error} [e]
       *  @param {string} [out]
       *  @returns {void}
       */
      function complete (e, out = '', err = '') {
        return (!e) ? resolve({ pid, out, err }) : reject(e)
      }

      const {
        pid
      } = execFile('ps', ['awwxo', 'pid,ppid,uid,%cpu,%mem,comm'], OPTIONS, complete)
    })
  )
}

/**
 *  @param {ArgsType | DataType}
 *  @returns {number}
 */
function getPid ({ pid }) {
  return pid
}

/**
 *  @param {ArgsType | DataType}
 *  @returns {string}
 */
function getOut ({ out }) {
  return out
}

/**
 *  @param {string} line
 *  @returns {[number, string]}
 */
function mapArgs (line) {
  const [
    pid,
    ...cmd
  ] = line.trim().split(WS)

  return [
    Number(pid),
    cmd.join(WS)
  ]
}

/**
 *  @param {Set<number>} PIDs
 *  @param {Map<number, string>} CMDs
 *  @returns {Record<string, string | number>}
 */
function getReduceData (PIDs, CMDs) {
  return function reduceData (accumulator, line) {
    const match = PATTERN.exec(line)

    if (!match) throw new Error('Parsing failed')

    const {
      groups: {
        pid: PID
      }
    } = match

    const pid = Number(PID)

    /**
     *  Exclude `ps` processes
     */
    if (!PIDs.has(pid)) {
      const {
        groups: {
          ppid,
          uid,
          cpu,
          mem,
          comm
        }
      } = match

      const row = {
        pid,
        ppid: Number.parseInt(ppid, 10),
        uid: Number.parseInt(uid, 10),
        cpu: Number.parseFloat(cpu),
        mem: Number.parseFloat(mem),
        cmd: CMDs.get(pid),
        name: basename(comm)
      }

      accumulator.push(Object.freeze(row))
    }

    return accumulator
  }
}

/**
 *  @param {string} s
 *  @returns {string[]}
 */
function toRows (s) {
  return (
    s.trim().split(LF)
  )
}

/**
 *  @param {string[]} a
 *  @returns {string}
 */
export function getHead ([s]) {
  return s
}

/**
 *  @param {string[]} a
 *  @returns {string[]}
 */
export function getBody (a) {
  return (
    a.slice(1)
  )
}

/**
 *  @returns {Promise<Record<string, string | number>>}
 */
export default async function ps () {
  const [
    ARGS,
    DATA
  ] = await Promise.all([
    getArgs(),
    getData()
  ])

  const PIDs = new Set([
    getPid(ARGS),
    getPid(DATA)
  ])

  const args = getBody(toRows(getOut(ARGS))) // discard head row
  const data = getBody(toRows(getOut(DATA))) // discard head row

  const CMDs = new Map(args.map(mapArgs))

  return (
    data.reduce(getReduceData(PIDs, CMDs), [])
  )
}
