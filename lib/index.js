'use strict';

var domify = require('domify');
var delegate = require('delegate');
var getDuration = require('transition-duration');
var scrollbar = require('scrollbar.pure');
var template = require('./template.html');

module.exports = MultiSelect;

function MultiSelect(options) {
  options || (options = {});

  this.multiple = options.multiple === undefined ? true : options.multiple;
  this.label = options.label;
  this.options = [];
  this.selected = [];
  this.el = domify(template);
  this.dirty = false;
  this.actions = [];
  this.map = {};

  bind(this);
  initUI(this);

  scrollbar(this.ui.optionList);

  if (options.options) {
    this.setOptions(options.options);
  }

  if (options.select) {
    if (options.select instanceof Array) {
      options.select.forEach(function (key) {
        this.select(key);
      }.bind(this));
    } else {
      this.select(options.select);
    }
  }

  this.update();

  this.render();
}

MultiSelect.prototype.addOption = function (option) {
  this.addOptions([option]);
  this.changed();

  return this;
};

MultiSelect.prototype.addOptions = function (options) {
  options.forEach(function (option) {
    this.options.push(option);
    this.map[option.key] = option;
    this.actions.push({
      type: 'add',
      data: option.key
    });
  }.bind(this));

  this.changed();

  return this;
};

MultiSelect.prototype.setOptions = function (options) {
  this.options = [];
  this.addOptions(options);

  this.changed();

  return this;
};

MultiSelect.prototype.removeOption = function (option) {
  var index = this.options.indexOf(option);

  if (!~index) {
    return this;
  }

  this.options.splice(index, 1);
  delete this.map[option.key];

  this.actions.push({
    type: 'remove',
    data: option.key
  });

  this.changed();

  return this;
};

MultiSelect.prototype.select = function (key) {
  var option = this.map[key];
  var index = this.options.indexOf(option);

  if (!option || !~option) {
    return;
  }

  this.options.splice(index, 1);

  this.actions.push({
    type: 'remove',
    data: option.key
  });

  this.selected.push(option);

  this.actions.push({
    type: 'select',
    data: option.key
  });

  if (!this.multiple && this.selected.length > 1) {
    this.unselect(this.selected[0].key);
  }

  this.changed();

  return option;
};

MultiSelect.prototype.unselect = function (key) {
  var option = this.map[key];
  var index = this.selected.indexOf(option);

  if (!option || !~index) {
    return;
  }

  this.options.push(option);
  this.selected.splice(index, 1);

  this.actions.push({
    type: 'unselect',
    data: option.key
  });

  this.actions.push({
    type: 'add',
    data: option.key
  });

  this.changed();
};

MultiSelect.prototype.changed = function () {
  this.dirty = true;
  return this;
};

MultiSelect.prototype.value = function () {
  return this.selected.map(function (option) {
    return option.key;
  });
};

MultiSelect.prototype.update = function () {
  this.renderLabel();

  if (!this.dirty) {
    return this;
  }

  var el = this.el;
  var actions = this.actions;

  actions.forEach(function (action) {
    switch (action.type) {
    case 'add':
      var option = this.map[action.data];

      if (!option) {
        return;
      }

      var html = generateOptionHTML(option);
      var el = document.createElement('div');

      el.innerHTML = html;
      el = el.querySelector('.multi-select-option');

      this.ui.optionList.appendChild(el);

      break;
    case 'remove':
      var query = '[data-key="' + action.data + '"]';
      var el = this.ui.optionList.querySelector(query);

      if (el && el.parentElement) {
        el.parentElement.removeChild(el);
      }

      break;
    case 'select':
    case 'unselect':
      this.renderSelected();
      break;
    }
  }.bind(this));

  this.dirty = false;
  this.actions = [];

  this.onChanged && this.onChanged();
};

MultiSelect.prototype.render = function () {
  this.renderLabel();
  this.renderSelected();
  this.renderOptionList();

  return this;
};

MultiSelect.prototype.renderLabel = function () {
  var label = this.ui.label;

  if (!this.label) {
    label.classList.add('hide');
  } else {
    label.classList.remove('hide');
    label.innerHTML = this.label;
  }

  return this;
};

MultiSelect.prototype.renderOptionList = function () {
  var html = this.options.reduce(function (html, option) {
    return html + generateOptionHTML(option);
  }, '');

  this.ui.optionList.innerHTML = html;

  return this;
};

MultiSelect.prototype.renderSelected = function () {
  var labels = this.selected.map(function (option) {
    return option.label;
  });

  var html = labels.join(', ');

  this.ui.selected.innerHTML = html;

  return this;
};

MultiSelect.prototype.onSelect = function (e) {
  e.preventDefault();
  e.stopPropagation();

  var key = e.target.getAttribute('data-key');
  key && this.select(key);

  this.update();
};

MultiSelect.prototype.toggleOptionList = function (cb) {
  var el = this.ui.options;

  if (el.classList.contains('display')) {
    this.closeOptionList(cb);
  } else {
    this.openOptionList(cb);
  }

  return this;
};

MultiSelect.prototype.openOptionList = function (cb) {
  var el = this.ui.options;
  var duration = getDuration(el);

  this.el.classList.add('expand');
  el.classList.add('display');

  clearTimeout(this.openTimer);

  this.openTimer = setTimeout(function () {
    el.classList.add('show');
    this.ui.optionList.scrollbar.display();
    this.ui.optionList.scrollbar.el.style.top = '0px';
    this.openTimer = setTimeout(function () {
      typeof cb === 'function' && cb();
    }, duration);
  }.bind(this), 0);

  return this;
};

MultiSelect.prototype.closeOptionList = function (cb) {
  var el = this.ui.options;
  var duration = getDuration(el);

  this.el.classList.remove('expand');
  el.classList.remove('show');

  clearTimeout(this.closeTimer);

  this.closeTimer = setTimeout(function () {
    el.classList.remove('display');
    typeof cb === 'function' && cb();
  }, duration);

  return this;
};

function bind(select) {
  var bind = delegate.bind.bind(delegate, select.el);

  bind('.multi-select-option', 'click', select.onSelect.bind(select));

  select.el.addEventListener('click', select.toggleOptionList.bind(select));
  select.el.addEventListener('mouseleave', select.closeOptionList.bind(select));
}

function initUI(select) {
  var ui = {};
  var els = select.el.querySelectorAll('[data-ui]');

  Array.prototype.forEach.call(els, function (el) {
    ui[el.getAttribute('data-ui')] = el;
  });

  select.ui = ui;
}

function generateOptionHTML(option) {
  return ''
    + '<li data-key="' + option.key + '" class="multi-select-option">'
    + option.label
    + '</li>';
}
