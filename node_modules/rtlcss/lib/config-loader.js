'use strict'

const fs = require('fs')
const path = require('path')
const findUp = require('find-up')
const stripJSONComments = require('strip-json-comments')

let config = {}
const configSources = ['package.json', '.rtlcssrc', '.rtlcss.json']
const environments = [
  process.env.USERPROFILE,
  process.env.HOMEPATH,
  process.env.HOME
]

const readConfig = (configFilePath) => {
  return JSON.parse(stripJSONComments(fs.readFileSync(configFilePath, 'utf-8').trim()))
}

module.exports.load = (configFilePath, cwd, overrides) => {
  if (configFilePath) {
    return override(readConfig(configFilePath), overrides)
  }

  const directory = cwd || process.cwd()
  config = loadConfig(directory)

  if (!config) {
    for (const environment of environments) {
      if (!environment) {
        continue
      }

      config = loadConfig(environment)
      if (config) {
        break
      }
    }
  }

  if (config) {
    override(config, overrides)
  }

  return config
}

function loadConfig (cwd) {
  for (const source of configSources) {
    let foundPath

    try {
      foundPath = findUp.sync(source, { cwd })
    } catch (e) {
      continue
    }

    if (foundPath) {
      const configFilePath = path.normalize(foundPath)

      try {
        config = readConfig(configFilePath)
      } catch (e) {
        throw new Error(`${e} ${configFilePath}`)
      }

      if (source === 'package.json') {
        config = config.rtlcssConfig
      }

      if (config) {
        return config
      }
    }
  }
}

function override (to, from) {
  if (to && from) {
    for (const p in from) {
      if (Object.prototype.hasOwnProperty.call(from, p)) {
        if (Object.prototype.hasOwnProperty.call(to, p) && typeof to[p] === 'object') {
          override(to[p], from[p])
        } else {
          to[p] = from[p]
        }
      }
    }
  }

  return to
}
