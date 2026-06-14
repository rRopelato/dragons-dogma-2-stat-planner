var engine = {};

engine.cloneStats = function(stats) {
  return {
    health: stats.health, stamina: stats.stamina, strength: stats.strength,
    defense: stats.defense, magick: stats.magick, magickDef: stats.magickDef,
    knockdownPower: stats.knockdownPower, knockdownRes: stats.knockdownRes, weight: stats.weight
  };
};

engine.clipPermanentStats = function(permanent) {
  var clipped = engine.cloneStats(permanent);
  planner.CAP_STATS.forEach(function(key) {
    clipped[key] = Math.min(clipped[key], planner.STAT_CAPS[key]);
  });
  return clipped;
};

engine.applyDynamicOffsets = function(permanent, activeVocation) {
  var clipped = engine.clipPermanentStats(permanent);
  var offsets = planner.VOCATION_DYNAMIC_OFFSETS[activeVocation];
  var result = {
    health: Math.floor(clipped.health + offsets.health),
    stamina: Math.floor(clipped.stamina + offsets.stamina),
    strength: Math.floor(clipped.strength + offsets.strength),
    defense: Math.floor(clipped.defense + offsets.defense),
    magick: Math.floor(clipped.magick + offsets.magick),
    magickDef: Math.floor(clipped.magickDef + offsets.magickDef),
    knockdownPower: Math.floor(clipped.knockdownPower + offsets.knockdownPower),
    knockdownRes: Math.floor(clipped.knockdownRes + offsets.knockdownRes),
    weight: Math.floor(clipped.weight + offsets.weight),
    capped: {}
  };

  planner.CAP_STATS.forEach(function(key) {
    result.capped[key] = result[key] >= planner.STAT_CAPS[key];
  });

  return result;
};

engine.getVocationForLevel = function(level, blocks) {
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (level >= block.fromLevel && level <= block.toLevel) {
      return block.vocation;
    }
  }
  return null;
};

engine.applyLevelGrowth = function(permanent, level, vocation) {
  var growth = planner.getBaseGrowthForLevel(level);

  if (level > 200) {
    permanent.health += growth.health;
    permanent.stamina += growth.stamina;
    permanent.strength += growth.strength;
    permanent.defense += growth.defense;
    permanent.magick += growth.magick;
    permanent.magickDef += growth.magickDef;
    return;
  }

  var mult = planner.VOCATION_MULTIPLIERS[vocation];
  permanent.health += growth.health * mult.health;
  permanent.stamina += growth.stamina * mult.stamina;
  permanent.strength += growth.strength * mult.strength;
  permanent.defense += growth.defense * mult.defense;
  permanent.magick += growth.magick * mult.magick;
  permanent.magickDef += growth.magickDef * mult.magickDef;

  if (level <= 81) permanent.knockdownPower += growth.knockdownPower;
  if (level <= 40) permanent.weight += growth.weight;
};

engine.simulateProgression = function(targetLevel, blocks, activeVocation) {
  var snapshots = [];
  var permanent = engine.cloneStats(planner.STARTING_STATS);

  snapshots.push({
    level: 1,
    permanent: engine.cloneStats(permanent),
    display: engine.applyDynamicOffsets(permanent, activeVocation)
  });

  for (var level = 2; level <= targetLevel; level++) {
    var vocation = engine.getVocationForLevel(level, blocks);
    if (!vocation) continue;
    engine.applyLevelGrowth(permanent, level, vocation);
    snapshots.push({
      level: level,
      permanent: engine.cloneStats(permanent),
      display: engine.applyDynamicOffsets(permanent, activeVocation)
    });
  }

  return snapshots;
};

engine.rechainBlocks = function(blocks) {
  if (!blocks.length) return engine.defaultBlocks();

  var cursor = 1;
  return blocks.map(function(block) {
    var count = block.toLevel - block.fromLevel + 1;
    var fromLevel = cursor;
    var toLevel = cursor + count - 1;
    cursor = toLevel + 1;
    return {
      id: block.id,
      vocation: block.vocation,
      fromLevel: fromLevel,
      toLevel: toLevel
    };
  });
};

engine.getCurrentBuildLevel = function(blocks) {
  if (!blocks.length) return 0;
  return blocks[blocks.length - 1].toLevel;
};

engine.getRemainingLevels = function(blocks, targetLevel) {
  return Math.max(0, targetLevel - engine.getCurrentBuildLevel(blocks));
};

engine.defaultBlocks = function(starterVocation) {
  return [{ id: engine.uid(), vocation: starterVocation || 'fighter', fromLevel: 1, toLevel: 1 }];
};

engine.normalizeBlocks = function(blocks, targetLevel) {
  if (!blocks.length) {
    return engine.defaultBlocks();
  }

  var sorted = blocks.slice().sort(function(a, b) { return a.fromLevel - b.fromLevel; });
  var normalized = [];
  var cursor = 1;

  for (var i = 0; i < sorted.length; i++) {
    var block = sorted[i];
    var fromLevel = i === 0 ? 1 : cursor;
    var toLevel = Math.min(Math.max(fromLevel, block.toLevel), targetLevel);

    normalized.push({
      id: block.id,
      vocation: block.vocation,
      fromLevel: fromLevel,
      toLevel: toLevel
    });

    cursor = toLevel + 1;
    if (cursor > targetLevel) break;
  }

  return normalized;
};

engine.getSimulatableLevel = function(blocks, targetLevel) {
  if (!engine.validateBlocks(blocks, targetLevel)) return targetLevel;

  var sorted = blocks.slice().sort(function(a, b) { return a.fromLevel - b.fromLevel; });
  if (!sorted.length || sorted[0].fromLevel !== 1) return 1;

  var covered = sorted[0].toLevel;
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i].fromLevel !== covered + 1) return covered;
    covered = sorted[i].toLevel;
  }

  return covered;
};

engine.validateBlocks = function(blocks, targetLevel) {
  if (!blocks.length) return 'Add at least one level range.';

  var sorted = blocks.slice().sort(function(a, b) { return a.fromLevel - b.fromLevel; });

  if (sorted[0].fromLevel !== 1) return 'Level ranges must start at level 1.';

  for (var i = 0; i < sorted.length; i++) {
    var block = sorted[i];
    if (block.fromLevel > block.toLevel) {
      return 'Invalid range: level ' + block.fromLevel + ' cannot exceed ' + block.toLevel + '.';
    }
    if (block.toLevel > targetLevel) {
      return 'Range ending at ' + block.toLevel + ' exceeds target level ' + targetLevel + '.';
    }
    if (i > 0 && block.fromLevel !== sorted[i - 1].toLevel + 1) {
      return 'Gap or overlap between level ' + sorted[i - 1].toLevel + ' and ' + block.fromLevel + '.';
    }
  }

  if (sorted[sorted.length - 1].toLevel !== targetLevel) {
    var remaining = targetLevel - sorted[sorted.length - 1].toLevel;
    return remaining + ' level' + (remaining === 1 ? '' : 's') + ' remaining to reach target level ' + targetLevel + '.';
  }

  return null;
};

engine.uid = function() {
  return 'b' + Math.random().toString(36).slice(2, 10);
};

engine.downsample = function(snapshots, maxPoints) {
  if (snapshots.length <= maxPoints) return snapshots;
  var step = Math.ceil(snapshots.length / maxPoints);
  var result = snapshots.filter(function(_, i) {
    return i % step === 0 || i === snapshots.length - 1;
  });
  if (result[result.length - 1] !== snapshots[snapshots.length - 1]) {
    result.push(snapshots[snapshots.length - 1]);
  }
  return result;
};
