const fs = require('node:fs')
const path = require('node:path')

const targets = [
  {
    file: path.join('Bank', 'Bank.json'),
    animations: ['Bank'],
  },
  {
    file: path.join('Safe', 'Safe.json'),
    animations: ['animation'],
  },
  {
    file: path.join('Handcuffs', 'Handcuffs.json'),
    animations: ['animation'],
  },
  {
    file: path.join('Dynamit', 'Dynamite.json'),
    animations: ['animation'],
  },
  {
    file: path.join('Fox', 'Fox.json'),
    animations: ['Idle', 'Win'],
  },
]

const baseDir = path.join(__dirname, 'public', 'bank')

for (const target of targets) {
  const filePath = path.join(baseDir, target.file)
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const availableAnimations = Object.keys(json.animations || {})

  for (const animation of target.animations) {
    if (!availableAnimations.includes(animation)) {
      throw new Error(`Missing animation "${animation}" in ${target.file}`)
    }
  }

  console.log(`${target.file}: ${target.animations.join(', ')}`)
}
