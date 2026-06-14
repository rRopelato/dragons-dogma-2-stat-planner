var chartView = {};
var growthChart = null;

chartView.STAT_COLORS = {
  health: '#c45c3e',
  stamina: '#4a9e6e',
  strength: '#d4a843',
  defense: '#6b8cae',
  magick: '#9b6bcc',
  magickDef: '#7b6bcc'
};

chartView.init = function() {
  var canvas = document.getElementById('growth-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  growthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: planner.CAP_STATS.map(function(key) {
        return {
          label: planner.STAT_LABELS[key],
          data: [],
          borderColor: chartView.STAT_COLORS[key],
          backgroundColor: chartView.STAT_COLORS[key],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.15
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: 'rgba(232,224,212,0.7)', boxWidth: 12, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: 'rgba(18,16,14,0.95)',
          borderColor: 'rgba(212,168,67,0.3)',
          borderWidth: 1,
          titleColor: '#d4a843',
          bodyColor: '#e8e0d4',
          callbacks: {
            label: function(ctx) {
              var key = planner.CAP_STATS[ctx.datasetIndex];
              var cap = planner.STAT_CAPS[key];
              var capped = ctx.raw >= cap;
              return ctx.dataset.label + ': ' + ctx.raw + ' / ' + cap + (capped ? ' (MAX)' : '');
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Level', color: 'rgba(255,255,255,0.4)' },
          ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 12 },
          grid: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          ticks: { color: 'rgba(255,255,255,0.5)' },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      },
      onHover: function(evt, elements) {
        if (elements.length) {
          var idx = elements[0].index;
          var level = growthChart.data.labels[idx];
          gui.setHoveredLevel(Number(level));
        }
      }
    }
  });

  canvas.addEventListener('mouseleave', function() {
    gui.setHoveredLevel(null);
  });

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function() {
      if (growthChart) growthChart.resize();
    });
  }
};

chartView.update = function(snapshots) {
  if (!growthChart) return;

  var sampled = engine.downsample(snapshots, 150);
  growthChart.data.labels = sampled.map(function(s) { return s.level; });

  planner.CAP_STATS.forEach(function(key, i) {
    growthChart.data.datasets[i].data = sampled.map(function(s) { return s.display[key]; });
  });

  growthChart.update('none');

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function() {
      if (growthChart) growthChart.resize();
    });
  }
};
