'use strict';

var cp = require('child_process');
var assert = require('assert');
var test = require('testit');
var Promise = require('promise');
var persona = require('../');
var getBrowser = require('./get-browser');

var LOCAL = !process.env.CI && process.argv[2] !== 'sauce';
var location;
if (LOCAL) {
  LOCAL = cp.fork(require.resolve('./server.js'));
  location = 'http://localhost:1336/index.html';
} else {
  location = 'http://rawgithub.com/ForbesLindesay/cabbie-persona/master/test/index.html';
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, require('ms')(time + ''));
  });
}

function testBrowser(getBrowser, promise) {
  function testCase(persona) {
    return function () {
      var getStatus;
      var browser = getBrowser();
      return promise(browser.sauceJobUpdate({
        name: 'cabbie-persona',
        build: process.env.TRAVIS_JOB_ID
      })).then(function () {
        return promise(browser.navigateTo(location))
      }).then(function () {
        return promise(browser.getElement('#status'));
      }).then(function (status) {
        getStatus = function () { return promise(status.text()); };
        return getStatus();
      }).then(function (status) {
        assert(status === 'Logged Out');
      }).then(function () {
        return promise(browser.getElement('#login'));
      }).then(function (login) {
        return promise(login.click());
      }).then(function () {
        return promise(persona(browser));
      }).then(function () {
        return delay('5000ms');
      }).then(function () {
        return getStatus();
      }).then(function (status) {
        assert(status === 'Logged In');
      }).then(function () {
        return promise(browser.getElement('#logout'));
      }).then(function (logout) {
        return promise(logout.click());
      }).then(function () {
        return delay('500ms');
      }).then(function () {
        return getStatus();
      }).then(function (status) {
        assert(status === 'Logged Out');
      }).then(function () {
        return promise(browser.dispose({passed: true}));
      }, function (err) {
        return promise(browser.dispose({passed: false})).then(function () {
          throw err;
        }, function () {
          throw err;
        });
      });
    };
  }
  test('it lets you login with username and password', testCase(function (browser) {
    return persona(browser, 'jepso-test@mailinator.com', 'abc1234567');
  }), '2 minutes');
  test('it lets you login with mockmyid.com', testCase(function (browser) {
    return persona(browser, 'jepso-test@mockmyid.com');
  }), '2 minutes');
}

testBrowser(function () { return getBrowser({mode: 'sync', debug: true}) }, function (value) {
  assert(!value ||
         (typeof value !== 'object' && typeof value !== 'function') ||
         typeof value.then !== 'function');
  return Promise.from(value);
});
testBrowser(function () { return getBrowser({mode: 'async', debug: true}) }, function (value) {
  assert(value &&
         (typeof value === 'object' || typeof value === 'function') &&
         typeof value.then === 'function');
  return value;
});

if (LOCAL) {
  test('Close server', function () {
    LOCAL.kill();
  });
}