'use strict';

var assert = require('assert');

module.exports = login;

function when(val, fn) {
  if (val &&
      (typeof val === 'object' || typeof val === 'function') &&
      typeof val.then === 'function') {
    return val.then(fn);
  } else {
    return fn(val);
  }
}
function waitFor(fn, timeout) {
  var start = Date.now();
  var val = fn();
  while (val === undefined && (Date.now() - start) < timeout) {
    val = fn();
  }
  function onResult(result) {
    if (result === undefined && (Date.now() - start) < timeout) {
      return when(fn(), onResult);
    } else if (result === undefined) {
      return fn();
    } else {
      return result;
    }
  }
  return when(val, onResult);
}

function waitForVisible(element, timeout) {
  return waitFor(function () {
    return when(element.isVisible(), function (isVisible) {
      if (isVisible) {
        return element;
      }
    });
  }, timeout);
}


function swapWindow(browser) {
  return when(browser.getWindowHandle(), function (window) {
    return when(waitFor(function () {
      return when(browser.getWindowHandles(), function (windows) {
        if (windows.length > 1) return windows;
      });
    }, 3000), function (windows) {
      assert(windows && windows.length > 1,
             'login should open a new window');
      assert(windows.length < 3,
             'cannot find the login window if more than two windows openned.');
      var loginWindow = windows[0] === window ? windows[1] : windows[0];
      return when(browser.setWindow(loginWindow), function () {
        return when(browser.getWindowHandle(), function (cw) {
          assert(loginWindow === cw,
                 'login window should now be in focus');
          return function () {
            return when(waitFor(function () {
              return when(browser.getWindowHandles(), function (windows) {
                if (windows.length === 1) return windows;
              });
            }, 3000), function () {
              return browser.setWindow(window);
            });
          }
        });
      });
    });
  });
}

function buttonText(browser, text, timeout) {
  text = text.trim().toLowerCase();
  return waitFor(function () {
    return when(browser.getElements('button'), function (buttons) {
      return buttons.map(function (button) {
        return when(button.text(), function (buttonText) {
          if (text === buttonText.trim().toLowerCase()) {
            return waitForVisible(button, timeout);
          }
        });
      }).reduce(function (acc, val) {
        return when(acc, function (acc) {
          if (acc !== undefined) return acc;
          else return val;
        });
      }, undefined);
    });
  }, timeout);
}
function buttonClick(browser, text) {
  return when(buttonText(browser, text, 5000), function (button) {
    return button.click();
  });
}
function type(browser, selector, text) {
  return when(browser.getElement(selector), function (element) {
    return when(waitForVisible(element, 5000), function () {
      return element.type(text);
    });
  });
}
function login(browser, username, password) {
  return when(swapWindow(browser), function (returnWindow) {
    return when(type(browser, '#authentication_email', username), function () {
      return when(buttonClick(browser, 'next'), function () {
        return when(doPassword(browser, password), function () {
          return returnWindow();
        });
      });
    });
  });
}
function doPassword(browser, password) {
  if (password && typeof password === 'string') {
    return when(type(browser, '#authentication_password', password), function () {
      return buttonClick(browser, 'sign in');
    });
  } else if (password && typeof password === 'function') {
    return password(browser);
  }
}
