var gui = {};

gui.state = {
  targetLevel: 200,
  activeVocation: 'fighter',
  starterVocation: 'fighter',
  blocks: [{ id: 'b1', vocation: 'fighter', fromLevel: 1, toLevel: 1 }],
  hoveredLevel: null,
  snapshots: []
};

gui.BAR_COLORS = {
  health: 'var(--stat-health)',
  stamina: 'var(--stat-stamina)',
  strength: 'var(--stat-strength)',
  defense: 'var(--stat-defense)',
  magick: 'var(--stat-magick)',
  magickDef: 'var(--stat-mdef)'
};

gui.SECONDARY_STATS = ['knockdownPower', 'knockdownRes', 'weight'];
gui.STARTER_VOCATIONS = ['archer', 'fighter', 'mage', 'thief'];

gui.normalizeStarterVocation = function(vocation) {
  return gui.STARTER_VOCATIONS.indexOf(vocation) !== -1 ? vocation : 'fighter';
};

gui.init = function() {
  gui.cacheDom();
  gui.bindEvents();

  var fromUrl = build.readUrl();
  if (fromUrl) {
    gui.state.targetLevel = fromUrl.targetLevel;
    gui.state.activeVocation = fromUrl.activeVocation;
    gui.state.blocks = fromUrl.blocks;
  }

  gui.state.starterVocation = gui.normalizeStarterVocation(gui.state.blocks[0] ? gui.state.blocks[0].vocation : 'fighter');
  if (gui.state.blocks.length) {
    gui.state.blocks[0].vocation = gui.state.starterVocation;
  }

  gui.syncInputs();
  gui.renderBlocks();
  chartView.init();
  gui.recalculate();
};

gui.cacheDom = function() {
  gui.el = {
    targetLevel: document.getElementById('target-level'),
    targetLevelNum: document.getElementById('target-level-num'),
    targetLevelDisplay: document.getElementById('target-level-display'),
    headerLevel: document.getElementById('header-level'),
    activeVocation: document.getElementById('active-vocation'),
    starterVocation: document.getElementById('starter-vocation'),
    addVocation: document.getElementById('add-vocation'),
    addLevels: document.getElementById('add-levels'),
    addLevelsNum: document.getElementById('add-levels-num'),
    addLevelsDisplay: document.getElementById('add-levels-display'),
    addPreview: document.getElementById('add-preview'),
    blockList: document.getElementById('block-list'),
    buildProgress: document.getElementById('build-progress'),
    validationError: document.getElementById('validation-error'),
    statBars: document.getElementById('stat-bars'),
    secondaryStats: document.getElementById('secondary-stats'),
    summaryStrip: document.getElementById('summary-strip'),
    addBlockBtn: document.getElementById('add-block-btn'),
    resetBtn: document.getElementById('reset-btn'),
    copyBtn: document.getElementById('copy-btn')
  };
};

gui.bindEvents = function() {
  gui.el.targetLevel.addEventListener('input', function() {
    gui.state.targetLevel = Number(gui.el.targetLevel.value);
    gui.state.blocks = engine.normalizeBlocks(gui.state.blocks, gui.state.targetLevel);
    gui.syncInputs();
    gui.renderBlocks();
    gui.recalculate();
  });

  gui.el.targetLevelNum.addEventListener('input', function() {
    var val = Math.min(999, Math.max(1, Number(gui.el.targetLevelNum.value) || 1));
    gui.state.targetLevel = val;
    gui.state.blocks = engine.normalizeBlocks(gui.state.blocks, val);
    gui.syncInputs();
    gui.renderBlocks();
    gui.recalculate();
  });

  gui.el.activeVocation.addEventListener('change', function() {
    gui.state.activeVocation = gui.el.activeVocation.value;
    gui.recalculate();
  });

  gui.el.starterVocation.addEventListener('change', function() {
    gui.state.starterVocation = gui.el.starterVocation.value;
    if (gui.state.blocks.length) {
      gui.state.blocks[0].vocation = gui.state.starterVocation;
    }
    gui.renderBlocks();
    gui.recalculate();
  });

  gui.el.addVocation.addEventListener('change', gui.syncAddControls);
  gui.el.addLevels.addEventListener('input', function() {
    gui.el.addLevelsNum.value = gui.el.addLevels.value;
    gui.syncAddControls();
  });
  gui.el.addLevelsNum.addEventListener('input', function() {
    var remaining = engine.getRemainingLevels(gui.state.blocks, gui.state.targetLevel);
    var val = Math.min(remaining || 1, Math.max(1, Number(gui.el.addLevelsNum.value) || 1));
    gui.el.addLevels.value = val;
    gui.el.addLevelsNum.value = val;
    gui.syncAddControls();
  });

  gui.el.addBlockBtn.addEventListener('click', gui.addBlock);
  gui.el.resetBtn.addEventListener('click', gui.resetBuild);
  gui.el.copyBtn.addEventListener('click', build.copyLink);
};

gui.syncInputs = function() {
  gui.el.targetLevel.value = gui.state.targetLevel;
  gui.el.targetLevelNum.value = gui.state.targetLevel;
  gui.el.targetLevelDisplay.textContent = gui.state.targetLevel;
  gui.el.headerLevel.textContent = gui.state.targetLevel;
  gui.el.activeVocation.value = gui.state.activeVocation;
  gui.el.starterVocation.value = gui.state.starterVocation;
  gui.syncAddControls();
};

gui.syncAddControls = function() {
  var remaining = engine.getRemainingLevels(gui.state.blocks, gui.state.targetLevel);
  var maxAdd = Math.max(1, remaining);

  gui.el.addLevels.max = maxAdd;
  gui.el.addLevelsNum.max = maxAdd;

  if (Number(gui.el.addLevels.value) > maxAdd) {
    gui.el.addLevels.value = maxAdd;
    gui.el.addLevelsNum.value = maxAdd;
  }

  var levelsToAdd = Number(gui.el.addLevels.value) || 1;
  gui.el.addLevelsDisplay.textContent = levelsToAdd;

  var startLevel = engine.getCurrentBuildLevel(gui.state.blocks) + 1;
  var endLevel = startLevel + levelsToAdd - 1;
  var vocation = gui.el.addVocation.value;

  if (remaining <= 0) {
    gui.el.addPreview.textContent = 'Build already reaches target level ' + gui.state.targetLevel + '.';
    gui.el.addBlockBtn.disabled = true;
  } else {
    gui.el.addPreview.textContent =
      'Adds ' + planner.VOCATION_LABELS[vocation] + ': Lv ' + startLevel + ' \u2192 ' + endLevel +
      ' (' + levelsToAdd + ' level' + (levelsToAdd === 1 ? '' : 's') + ')';
    gui.el.addBlockBtn.disabled = false;
  }
};

gui.recalculate = function() {
  gui.state.blocks = engine.normalizeBlocks(gui.state.blocks, gui.state.targetLevel);
  var error = engine.validateBlocks(gui.state.blocks, gui.state.targetLevel);

  gui.el.validationError.textContent = error || '';
  gui.el.validationError.hidden = !error;

  var current = engine.getCurrentBuildLevel(gui.state.blocks);
  gui.el.buildProgress.textContent = 'Lv ' + current + ' / ' + gui.state.targetLevel;

  gui.state.snapshots = engine.simulateProgression(
    engine.getSimulatableLevel(gui.state.blocks, gui.state.targetLevel),
    gui.state.blocks,
    gui.state.activeVocation
  );

  gui.renderStats();
  chartView.update(gui.state.snapshots);
  build.setUrl(gui.state);
  gui.syncAddControls();
};

gui.getDisplayLevel = function() {
  if (gui.state.hoveredLevel !== null) return gui.state.hoveredLevel;
  if (engine.validateBlocks(gui.state.blocks, gui.state.targetLevel)) {
    return gui.state.targetLevel;
  }
  return engine.getSimulatableLevel(gui.state.blocks, gui.state.targetLevel);
};

gui.setHoveredLevel = function(level) {
  gui.state.hoveredLevel = level;
  gui.renderStats();
};

gui.blockLevelCount = function(block) {
  return block.toLevel - block.fromLevel + 1;
};

gui.renderStats = function() {
  var level = gui.getDisplayLevel();
  var snap = gui.state.snapshots.find(function(s) { return s.level === level; });
  if (!snap) snap = gui.state.snapshots[gui.state.snapshots.length - 1];
  if (!snap) return;
  var stats = snap.display;

  var html = '';
  planner.CAP_STATS.forEach(function(key) {
    var value = stats[key];
    var cap = planner.STAT_CAPS[key];
    var pct = Math.min(100, (value / cap) * 100);
    var isCapped = value >= cap;

    html += '<div class="stat-row' + (isCapped ? ' stat-maxed' : '') + '">' +
      '<div class="stat-row-header">' +
        '<span class="stat-label">' + planner.STAT_LABELS[key] + '</span>' +
        '<span class="stat-value' + (isCapped ? ' gold' : '') + '">' +
          value + '<span class="stat-cap"> / ' + cap + '</span>' +
          (isCapped ? '<span class="max-badge">MAX</span>' : '') +
        '</span>' +
      '</div>' +
      '<div class="stat-bar-track">' +
        '<div class="stat-bar-cap-marker"></div>' +
        '<div class="stat-bar-fill' + (isCapped ? ' gold' : '') + '" style="width:' + pct + '%;' +
          (isCapped ? '' : 'background:' + gui.BAR_COLORS[key]) + '"></div>' +
      '</div>' +
    '</div>';
  });
  gui.el.statBars.innerHTML = html;

  var secHtml = '';
  gui.SECONDARY_STATS.forEach(function(key) {
    secHtml += '<div class="secondary-stat">' +
      '<span class="stat-label">' + planner.STAT_LABELS[key] + '</span>' +
      '<span class="stat-value">' + stats[key] + '</span>' +
    '</div>';
  });
  gui.el.secondaryStats.innerHTML = secHtml;

  var finalSnap = gui.state.snapshots[gui.state.snapshots.length - 1];
  gui.el.summaryStrip.innerHTML =
    '<span>Permanent pool at L' + finalSnap.level + '</span>' +
    '<span>HP ' + finalSnap.permanent.health.toFixed(1) + '</span>' +
    '<span>STR ' + finalSnap.permanent.strength.toFixed(1) + '</span>' +
    '<span>MAG ' + finalSnap.permanent.magick.toFixed(1) + '</span>' +
    '<span class="engine-note">Float accumulation · caps before dynamic offsets · post-200 flat scaling</span>';
};

gui.renderBlocks = function() {
  var html = '';
  gui.state.blocks.forEach(function(block, index) {
    var isStarter = index === 0;
    var count = gui.blockLevelCount(block);
    var canRemove = !isStarter;

    html += '<div class="level-block-row' + (isStarter ? ' block-starter' : '') + '" data-id="' + block.id + '">' +
      '<div class="block-index">' + (index + 1) + '</div>' +
      '<div class="block-fields">' +
        '<div class="block-summary"><strong>' + planner.VOCATION_LABELS[block.vocation] + '</strong></div>' +
        '<div class="block-meta">';

    if (isStarter) {
      html += 'Starter class · Level 1';
    } else {
      html += count + ' level' + (count === 1 ? '' : 's') + ' · Lv ' + block.fromLevel + ' \u2192 ' + block.toLevel;
    }

    html += '</div></div>';

    if (canRemove) {
      html += '<button type="button" class="btn-icon block-remove" data-id="' + block.id + '" title="Remove step">×</button>';
    }

    html += '</div>';
  });

  gui.el.blockList.innerHTML = html;

  gui.el.blockList.querySelectorAll('.block-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      gui.removeBlock(btn.dataset.id);
    });
  });
};

gui.addBlock = function() {
  var remaining = engine.getRemainingLevels(gui.state.blocks, gui.state.targetLevel);
  if (remaining <= 0) return;

  var levelsToAdd = Math.min(remaining, Number(gui.el.addLevels.value) || 1);
  var vocation = gui.el.addVocation.value;
  var startLevel = engine.getCurrentBuildLevel(gui.state.blocks) + 1;
  var endLevel = startLevel + levelsToAdd - 1;

  gui.state.blocks.push({
    id: engine.uid(),
    vocation: vocation,
    fromLevel: startLevel,
    toLevel: endLevel
  });

  gui.renderBlocks();
  gui.recalculate();
};

gui.removeBlock = function(id) {
  if (gui.state.blocks.length <= 1) return;
  if (gui.state.blocks[0].id === id) return;

  gui.state.blocks = engine.rechainBlocks(
    gui.state.blocks.filter(function(b) { return b.id !== id; })
  );
  gui.renderBlocks();
  gui.recalculate();
};

gui.resetBuild = function() {
  gui.state.targetLevel = 200;
  gui.state.activeVocation = 'fighter';
  gui.state.starterVocation = 'fighter';
  gui.state.blocks = engine.defaultBlocks(gui.state.starterVocation);
  gui.state.hoveredLevel = null;
  gui.el.addLevels.value = 1;
  gui.el.addLevelsNum.value = 1;
  gui.syncInputs();
  gui.renderBlocks();
  gui.recalculate();
  history.replaceState(null, '', location.pathname);
};

document.addEventListener('DOMContentLoaded', gui.init);
