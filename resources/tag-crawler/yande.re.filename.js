const path = require('node:path')

// crawler function accept image filepath and return an array of tag.
const crawler = (filepath) =>{
  let tagString = path.basename(filepath, path.extname(filepath))
  return tagString.match(/\S+/g)
}

module.exports = {
  crawler
}