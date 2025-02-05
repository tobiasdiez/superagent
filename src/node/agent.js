/**
 * Module dependencies.
 */

// eslint-disable-next-line node/no-deprecated-api
const { parse } = require('url');
const { CookieJar } = require('cookiejar');
const { CookieAccessInfo } = require('cookiejar');
const methods = require('methods');
const request = require('../..');
const AgentBase = require('../agent-base');

/**
 * Expose `Agent`.
 */

module.exports = Agent;

/**
 * Initialize a new `Agent`.
 *
 * @api public
 */

function Agent(options) {
  if (!(this instanceof Agent)) {
    return new Agent(options);
  }

  AgentBase.call(this);
  this.jar = new CookieJar();

  if (options) {
    if (options.ca) {
      this.ca(options.ca);
    }

    if (options.key) {
      this.key(options.key);
    }

    if (options.pfx) {
      this.pfx(options.pfx);
    }

    if (options.cert) {
      this.cert(options.cert);
    }

    if (options.rejectUnauthorized === false) {
      this.disableTLSCerts();
    }
  }
}

Agent.prototype = Object.create(AgentBase.prototype);

/**
 * Save the cookies in the given `res` to
 * the agent's cookie jar for persistence.
 *
 * @param {Response} res
 * @api private
 */

Agent.prototype._saveCookies = function (res) {
  const cookies = res.headers['set-cookie'];
  if (cookies) {
    const url = parse(res.request?.url || '')
    this.jar.setCookies(cookies, url.hostname, url.pathname);
  }
};

/**
 * Attach cookies when available to the given `req`.
 *
 * @param {Request} req
 * @api private
 */

Agent.prototype._attachCookies = function (request_) {
  const url = parse(request_.url);
  const access = new CookieAccessInfo(
    url.hostname,
    url.pathname,
    url.protocol === 'https:'
  );
  const cookies = this.jar.getCookies(access).toValueString();
  request_.cookies = cookies;
};

for (const name of methods) {
  const method = name.toUpperCase();
  Agent.prototype[name] = function (url, fn) {
    const request_ = new request.Request(method, url);

    request_.on('response', this._saveCookies.bind(this));
    request_.on('redirect', this._saveCookies.bind(this));
    request_.on('redirect', this._attachCookies.bind(this, request_));
    this._setDefaults(request_);
    this._attachCookies(request_);

    if (fn) {
      request_.end(fn);
    }

    return request_;
  };
}

Agent.prototype.del = Agent.prototype.delete;
