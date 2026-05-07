const fs = require('fs')

const targets = [
  ['Bank', 'Bank'],
  ['Safe', 'Safe'],
  ['Handcuffs', 'Handcuffs'],
  ['Dynamit', 'Dynamite'],
  ['Fox', 'Fox']
]

for (const [folder, file] of targets) {
  const json = JSON.parse(
    fs.readFileSync(
      `public/bank/${folder}/${file}.json`,
      'utf8'
    )
  )

  console.log('\n===', folder, '===')

  console.log(
    Object.keys(json.animations || {})
  )
}