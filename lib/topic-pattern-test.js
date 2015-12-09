module.exports = topicPatternTest

function topicPatternTest (pattern, routingKey) {
  var reStr = pattern
    // replace patterns with placeholders
    .replace(/^[.][#][.]/g, '{placeholder0}')
    .replace(/[.][#][.]$/g, '{placeholder1}')
    .replace(/[.][#][.]/g, '{placeholder2}')
    .replace(/[#]/g, '{placeholder2}')
    .replace(/^[*]/g, '{placeholder3}')
    .replace(/[*]$/g, '{placeholder4}')
    .replace(/[*]/g, '{placeholder5}')
    .replace(/[.]/g, '{placeholder6}')
    // replace placeholders with regex
    .replace(/{placeholder0}/g, '[.][a-zA-Z.]*')
    .replace(/{placeholder1}/g, '[a-zA-Z.]*[.]')
    .replace(/{placeholder2}/g, '[a-zA-Z.]*')
    .replace(/{placeholder3}/g, '[.]{0,1}[a-zA-Z]*')
    .replace(/{placeholder4}/g, '[a-zA-Z]*[.]{0,1}')
    .replace(/{placeholder5}/g, '[a-zA-Z]*')
    .replace(/{placeholder6}/g, '[.]')

  var re = new RegExp('^' + reStr + '$')
  //  console.log('>', pattern, reStr)
  return re.test(routingKey)
}
