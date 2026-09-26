'use strict';

// Unit tests for the global error handler and 404 handler.
// No database, no network, no Express server started.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { notFoundHandler, errorHandler } = require('../utils/errorMiddleware');

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

describe('notFoundHandler', () => {
  it('returns 404 with a JSON message for an unknown /api route', () => {
    const req = { url: '/api/does-not-exist' };
    const res = makeRes();
    notFoundHandler(req, res);
    assert.equal(res._status, 404);
    assert.ok(res._body !== null, 'body must be set');
    assert.equal(typeof res._body.message, 'string');
    assert.ok(res._body.message.length > 0, 'message must not be empty');
  });

  it('does not include a stack property in the response', () => {
    const req = {};
    const res = makeRes();
    notFoundHandler(req, res);
    assert.ok(!('stack' in res._body), 'stack must not be in response body');
  });
});

describe('errorHandler', () => {
  it('returns 500 with a generic message for an unexpected Error', () => {
    const err = new Error('mongo network timeout: ECONNRESET');
    const req = {};
    const res = makeRes();
    errorHandler(err, req, res, () => {});
    assert.equal(res._status, 500);
    assert.equal(typeof res._body.message, 'string');
    // Must NOT echo the internal error message back to the client
    assert.notEqual(res._body.message, err.message);
  });

  it('does not include stack or internals in the 500 response', () => {
    const err = new Error('internal detail that must stay server-side');
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    assert.ok(!('stack' in res._body));
    assert.ok(!res._body.message.includes('internal detail'));
  });

  it('returns 500 for an error with no status property', () => {
    const err = new Error('oops');
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res._status, 500);
  });

  it('uses err.status when it is a 4xx value', () => {
    const err = new Error('Bad request from upstream');
    err.status = 400;
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res._status, 400);
    // 4xx messages are intentional and may be surfaced
    assert.equal(typeof res._body.message, 'string');
  });

  it('uses err.statusCode when err.status is absent', () => {
    const err = new Error('Conflict');
    err.statusCode = 409;
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res._status, 409);
  });

  it('returns 500 for an error whose status is a non-numeric value', () => {
    const err = new Error('weird');
    err.status = 'server-error';
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res._status, 500);
  });
});
