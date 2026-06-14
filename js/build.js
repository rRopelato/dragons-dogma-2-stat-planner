var build = {};

build.VOC_CODE = {
  archer: 'ar', fighter: 'fi', mage: 'ma', thief: 'th',
  mysticSpearhand: 'ms', magickArcher: 'mc', sorcerer: 'so',
  trickster: 'tr', warrior: 'wa', warfarer: 'wf'
};

build.CODE_VOC = {};
Object.keys(build.VOC_CODE).forEach(function(v) { build.CODE_VOC[build.VOC_CODE[v]] = v; });

build.encode = function(state) {
  var parts = [
    state.targetLevel.toString(36),
    build.VOC_CODE[state.activeVocation] || 'wf',
    state.blocks.map(function(b) {
      return (build.VOC_CODE[b.vocation] || 'wf') + b.toLevel.toString(36);
    }).join('-')
  ];
  return parts.join('.');
};

build.decode = function(hash) {
  if (!hash || hash.charAt(0) !== '#') return null;
  var raw = hash.substring(1);
  if (!raw) return null;

  var segments = raw.split('.');
  if (segments.length < 2) return null;

  var targetLevel = parseInt(segments[0], 36);
  if (isNaN(targetLevel) || targetLevel < 1 || targetLevel > 999) return null;

  var activeVocation = build.CODE_VOC[segments[1]] || 'fighter';

  var blocks = [];
  if (segments[2]) {
    var blockParts = segments[2].split('-');
    var fromLevel = 1;
    blockParts.forEach(function(part) {
      var vocCode = part.substring(0, 2);
      var toLevel = parseInt(part.substring(2), 36);
      if (build.CODE_VOC[vocCode] && !isNaN(toLevel)) {
        blocks.push({
          id: engine.uid(),
          vocation: build.CODE_VOC[vocCode],
          fromLevel: fromLevel,
          toLevel: toLevel
        });
        fromLevel = toLevel + 1;
      }
    });
  }

  if (!blocks.length) {
    blocks = engine.defaultBlocks();
  }

  return {
    targetLevel: targetLevel,
    activeVocation: activeVocation,
    blocks: engine.normalizeBlocks(blocks, targetLevel)
  };
};

build.setUrl = function(state) {
  var encoded = build.encode(state);
  if (location.hash !== '#' + encoded) {
    history.replaceState(null, '', '#' + encoded);
  }
};

build.readUrl = function() {
  return build.decode(location.hash);
};

build.copyLink = function() {
  var url = location.href.split('#')[0] + location.hash;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url);
  } else {
    window.prompt('Copy build link:', url);
  }
};
